import {
  AuthenticationCreds,
  AuthenticationState,
  SignalKeyStore,
  initAuthCreds,
  BufferJSON,
  proto,
} from '@whiskeysockets/baileys';
import prisma from '../lib/prisma';
import fs from 'fs';
import path from 'path';

export interface BotQRState {
  qr: string | null;
  updatedAt: string;
}

export interface BotStatusState {
  status: 'DISCONNECTED' | 'SCANNING_QR' | 'CONNECTED';
  updatedAt: string;
  phone?: string;
  name?: string;
}

/**
 * Updates the live QR code in the database for Web UI consumption
 */
export async function setDbLiveQR(qr: string | null): Promise<void> {
  try {
    const payload = JSON.stringify({
      qr,
      updatedAt: new Date().toISOString(),
    });
    await prisma.whatsAppSession.upsert({
      where: { id: 'meta_qr_code' },
      create: { id: 'meta_qr_code', data: payload },
      update: { data: payload },
    });
  } catch (err) {
    console.error('⚠️ [PRISMA AUTH] Gagal menyimpan live QR ke database:', err);
  }
}

/**
 * Gets the latest live QR code from the database
 */
export async function getDbLiveQR(): Promise<BotQRState | null> {
  try {
    const record = await prisma.whatsAppSession.findUnique({
      where: { id: 'meta_qr_code' },
    });
    if (!record?.data) return null;
    return JSON.parse(record.data);
  } catch (err) {
    return null;
  }
}

/**
 * Updates the bot connection status in the database
 */
export async function setDbBotStatus(
  status: 'DISCONNECTED' | 'SCANNING_QR' | 'CONNECTED',
  details?: { phone?: string; name?: string }
): Promise<void> {
  try {
    const payload = JSON.stringify({
      status,
      updatedAt: new Date().toISOString(),
      ...details,
    });
    await prisma.whatsAppSession.upsert({
      where: { id: 'meta_bot_status' },
      create: { id: 'meta_bot_status', data: payload },
      update: { data: payload },
    });
  } catch (err) {
    console.error('⚠️ [PRISMA AUTH] Gagal menyimpan status bot ke database:', err);
  }
}

/**
 * Gets the current bot connection status from the database
 */
export async function getDbBotStatus(): Promise<BotStatusState | null> {
  try {
    const record = await prisma.whatsAppSession.findUnique({
      where: { id: 'meta_bot_status' },
    });
    if (!record?.data) return null;
    return JSON.parse(record.data);
  } catch (err) {
    return null;
  }
}

/**
 * Custom Baileys auth state that stores credentials and cryptographic keys
 * directly in the database (WhatsAppSession model).
 * Enables 100% zero-file auth suitable for ephemeral cloud containers (Koyeb, Render).
 */
export async function usePrismaAuthState(): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
  clearSession: () => Promise<void>;
}> {
  const readData = async (id: string) => {
    try {
      const record = await prisma.whatsAppSession.findUnique({
        where: { id },
      });
      if (!record?.data) return null;
      return JSON.parse(record.data, BufferJSON.reviver);
    } catch (err) {
      console.error(`⚠️ [PRISMA AUTH] Error reading key ${id}:`, err);
      return null;
    }
  };

  const writeData = async (id: string, data: any) => {
    try {
      const serialized = JSON.stringify(data, BufferJSON.replacer);
      await prisma.whatsAppSession.upsert({
        where: { id },
        create: { id, data: serialized },
        update: { data: serialized },
      });
    } catch (err) {
      console.error(`⚠️ [PRISMA AUTH] Error writing key ${id}:`, err);
    }
  };

  const removeData = async (id: string) => {
    try {
      await prisma.whatsAppSession.deleteMany({
        where: { id },
      });
    } catch {
      // Ignore not found errors
    }
  };

  // Check if session creds exist in DB
  const credsRecord = await prisma.whatsAppSession.findUnique({
    where: { id: 'creds' },
  });

  let creds: AuthenticationCreds;

  if (credsRecord?.data) {
    creds = JSON.parse(credsRecord.data, BufferJSON.reviver);
  } else {
    // Check if ./auth_session exists locally to auto-migrate initial credentials
    const localSessionDir = path.resolve(process.cwd(), 'auth_session');
    const localCredsFile = path.join(localSessionDir, 'creds.json');
    if (fs.existsSync(localCredsFile)) {
      console.log('🔄 [PRISMA AUTH] Mengimpor sesi auth lokal dari ./auth_session ke Database...');
      try {
        const files = fs.readdirSync(localSessionDir);
        let count = 0;
        for (const file of files) {
          if (file.endsWith('.json')) {
            const raw = fs.readFileSync(path.join(localSessionDir, file), 'utf8');
            const keyId = file.replace(/\.json$/, '');
            await prisma.whatsAppSession.upsert({
              where: { id: keyId },
              create: { id: keyId, data: raw },
              update: { data: raw },
            });
            count++;
          }
        }
        console.log(`✅ [PRISMA AUTH] Berhasil memindahkan ${count} file sesi ke Database!`);
        const migrated = await readData('creds');
        creds = migrated || initAuthCreds();
      } catch (e) {
        console.warn('⚠️ [PRISMA AUTH] Gagal migrasi file lokal, membuat sesi baru:', e);
        creds = initAuthCreds();
      }
    } else {
      creds = initAuthCreds();
    }
  }

  const keys: SignalKeyStore = {
    get: async (type, ids) => {
      const data: { [key: string]: any } = {};
      await Promise.all(
        ids.map(async (id) => {
          let value = await readData(`${type}-${id}`);
          if (type === 'app-state-sync-key' && value) {
            value = proto.Message.AppStateSyncKeyData.fromObject(value);
          }
          data[id] = value;
        })
      );
      return data;
    },
    set: async (data: any) => {
      const tasks: Promise<any>[] = [];
      for (const category in data) {
        for (const id in data[category]) {
          const value = data[category][id];
          const keyId = `${category}-${id}`;
          tasks.push(value ? writeData(keyId, value) : removeData(keyId));
        }
      }
      await Promise.all(tasks);
    },
  };

  return {
    state: {
      creds,
      keys,
    },
    saveCreds: async () => {
      await writeData('creds', creds);
    },
    clearSession: async () => {
      await prisma.whatsAppSession.deleteMany({}).catch(() => {});
    },
  };
}
