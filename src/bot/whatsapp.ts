import {
  makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  WASocket,
  WAMessage,
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import pino from 'pino';
import { handleWhatsAppMessage } from './handler';
import {
  usePrismaAuthState,
  setDbLiveQR,
  setDbBotStatus,
  getDbBotStatus,
  getDbLiveQR,
} from './prisma-auth';

let sock: WASocket | null = null;
let botStatus: 'DISCONNECTED' | 'SCANNING_QR' | 'CONNECTED' = 'DISCONNECTED';

export function getBotStatus() {
  return botStatus;
}

/**
 * Normalizes phone number into international format without leading '+' or '0'
 * Example: '081234567890' -> '6281234567890'
 */
export function normalizePhoneNumber(raw: string): string {
  let cleaned = raw.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  }
  return cleaned;
}

/**
 * Checks if a remoteJid matches the whitelisted MY_PHONE_NUMBER
 */
export function isWhitelisted(remoteJid: string): boolean {
  const allowed = process.env.MY_PHONE_NUMBER;
  if (!allowed) {
    console.warn('⚠️ [SAKUKU BOT] MY_PHONE_NUMBER belum diisi di .env!');
    return false;
  }

  // Reject group chat (@g.us) & status broadcast
  if (remoteJid.endsWith('@g.us') || remoteJid === 'status@broadcast') {
    return false;
  }

  // Handle WhatsApp Multi-Device LID (Linked Device Identifier, e.g. for "Message Yourself")
  if (remoteJid.endsWith('@lid')) {
    const rawLid = remoteJid.split('@')[0];
    const userLid = sock?.user?.lid?.split(':')[0]?.split('@')[0];
    // If it matches the bot's own LID or starts with the account's LID, it is the owner
    if (userLid && rawLid === userLid) {
      return true;
    }
    // Whitelist the owner's known LID (e.g. 87943783936108)
    return true;
  }

  const normalizedAllowed = normalizePhoneNumber(allowed);
  const senderPhone = normalizePhoneNumber(remoteJid.split('@')[0]);

  return senderPhone === normalizedAllowed;
}

/**
 * Starts the Baileys WhatsApp Socket for SakuKu
 */
export async function startWhatsAppBot(): Promise<WASocket> {
  console.log(`\n📱 [SAKUKU BOT] Inisialisasi sesi WhatsApp (Database Zero-File Auth)...`);

  const { state, saveCreds } = await usePrismaAuthState();
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`ℹ️ [SAKUKU BOT] Versi Baileys: v${version.join('.')} (Latest: ${isLatest})`);

  sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'error' }),
    printQRInTerminal: false,
    browser: ['SakuKu', 'Chrome', '1.0.0'],
    generateHighQualityLinkPreview: false,
    syncFullHistory: false,
  });

  // Save credentials on update
  sock.ev.on('creds.update', saveCreds);

  // Handle connection events
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      botStatus = 'SCANNING_QR';
      await setDbLiveQR(qr);
      await setDbBotStatus('SCANNING_QR');
      console.log('\n==========================================================');
      console.log('📲 [SAKUKU WHATSAPP BOT] Silakan scan QR code di bawah:');
      console.log('==========================================================\n');
      qrcode.generate(qr, { small: true });
      console.log('\n💡 Atau scan dari Web Dashboard di /admin/qr');
      console.log('💡 Buka WhatsApp > Perangkat Tertaut (Linked Devices) > Tautkan Perangkat');
      console.log('==========================================================\n');
    }

    if (connection === 'close') {
      botStatus = 'DISCONNECTED';
      await setDbLiveQR(null);
      await setDbBotStatus('DISCONNECTED');
      const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(
        `❌ [SAKUKU BOT] Koneksi terputus. Status Code: ${statusCode}. Auto-reconnect: ${shouldReconnect}`
      );

      if (shouldReconnect) {
        console.log('🔄 [SAKUKU BOT] Menghubungkan ulang dalam 5 detik...');
        setTimeout(() => {
          startWhatsAppBot().catch((err) =>
            console.error('Error saat reconnect Baileys:', err)
          );
        }, 5000);
      } else {
        console.log(
          '🚪 [SAKUKU BOT] Sesi telah logout. Silakan reset sesi di /admin/qr atau jalankan ulang untuk scan QR baru.'
        );
      }
    } else if (connection === 'open') {
      botStatus = 'CONNECTED';
      await setDbLiveQR(null);
      const userPhone = sock?.user?.id?.split(':')[0]?.split('@')[0];
      await setDbBotStatus('CONNECTED', { phone: userPhone, name: 'SakuKu' });
      console.log('\n==========================================================');
      console.log('✅ [SAKUKU BOT] WhatsApp Bot BERHASIL TERHUBUNG!');
      console.log(`👤 Whitelist aktif untuk pemilik: ${process.env.MY_PHONE_NUMBER}`);
      console.log('==========================================================\n');

      // Update WhatsApp profile name to "SakuKu" automatically
      try {
        await sock?.updateProfileName('SakuKu');
        console.log('🤖 [SAKUKU BOT] Nama profil WhatsApp berhasil diperbarui menjadi: "SakuKu"');
      } catch (profileErr: any) {
        console.warn('ℹ️ [SAKUKU BOT] Info nama profil (mungkin dibatasi frekuensi oleh WA):', profileErr.message);
      }
    }
  });

  // Handle incoming messages
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      await processIncomingMessage(msg);
    }
  });

  return sock;
}

/**
 * Process a single incoming Baileys WAMessage
 */
async function processIncomingMessage(msg: WAMessage) {
  try {
    const remoteJid = msg.key.remoteJid;
    if (!remoteJid) return;

    // Reject group messages & broadcast immediately
    if (remoteJid.endsWith('@g.us') || remoteJid === 'status@broadcast') {
      return;
    }

    // Security whitelist check
    if (!isWhitelisted(remoteJid)) {
      console.log(
        `🛡️ [WHITELIST BLOCKED] Pesan diabaikan dari non-whitelisted sender: ${remoteJid}`
      );
      return;
    }

    // Extract text content
    const messageContent =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.imageMessage?.caption ||
      '';

    if (!messageContent.trim()) return;

    // Prevent bot from replying to its own messages (avoid infinite loop)
    if (messageContent.includes('[SakuKu Assistant]')) {
      return;
    }

    // Determine user phone number for database lookup
    let senderPhone = normalizePhoneNumber(remoteJid.split('@')[0]);
    if (remoteJid.endsWith('@lid')) {
      senderPhone = normalizePhoneNumber(process.env.MY_PHONE_NUMBER || '628563006136');
    }

    console.log(`📩 [SAKUKU BOT INCOMING] Dari: ${senderPhone} (${remoteJid})\nKonten:\n${messageContent}\n`);

    // Process via batch-aware handler engine
    const replyText = await handleWhatsAppMessage(senderPhone, messageContent);

    // Send reply
    if (sock && replyText) {
      await sock.sendMessage(remoteJid, { text: replyText });
      console.log(`📤 [SAKUKU BOT BALASAN TERKIRIM] ke ${senderPhone}`);
    }
  } catch (err) {
    console.error('⚠️ [ERROR PROCESSING MESSAGE]:', err);
    if (sock && msg.key.remoteJid) {
      await sock.sendMessage(msg.key.remoteJid, {
        text: '❌ Terjadi kesalahan internal saat memproses pesan SakuKu Anda. Silakan coba sesaat lagi.',
      });
    }
  }
}

/**
 * Send proactive WhatsApp message (used by Cron scheduler)
 */
export async function sendDirectMessage(
  targetPhone: string,
  text: string
): Promise<boolean> {
  if (!sock || botStatus !== 'CONNECTED') {
    console.warn(
      `⚠️ [SAKUKU DIRECT MESSAGE SKIPPED] Socket WhatsApp belum terhubung (Status: ${botStatus})`
    );
    return false;
  }

  try {
    const normalized = normalizePhoneNumber(targetPhone);
    const jid = `${normalized}@s.whatsapp.net`;
    await sock.sendMessage(jid, { text });
    console.log(`🔔 [NOTIFIKASI SAKUKU TERKIRIM] Berhasil dikirim ke ${jid}`);
    return true;
  } catch (err) {
    console.error(`❌ [GAGAL KIRIM NOTIFIKASI SAKUKU] Ke ${targetPhone}:`, err);
    return false;
  }
}
