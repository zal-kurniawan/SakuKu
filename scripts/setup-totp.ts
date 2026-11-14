import crypto from 'crypto';
import QRCode from 'qrcode';
import { base32Encode } from '../src/lib/totp';

async function main() {
  console.log('\n==========================================================');
  console.log('🔐 SAKUKU OFFLINE TOTP SETUP (GOOGLE AUTHENTICATOR / AUTHY)');
  console.log('==========================================================\n');

  // 1. Generate 20 cryptographically secure random bytes
  const randomBytes = crypto.randomBytes(20);
  const totpSecret = base32Encode(randomBytes);

  // 2. Build standard Key URI format (RFC 6238)
  const appName = 'SakuKu';
  const account = 'Owner';
  const uri = `otpauth://totp/${encodeURIComponent(appName)}:${encodeURIComponent(account)}?secret=${totpSecret}&issuer=${encodeURIComponent(appName)}&algorithm=SHA1&digits=6&period=30`;

  // 3. Render ASCII QR Code in terminal
  try {
    const qrTerminal = await QRCode.toString(uri, {
      type: 'terminal',
      small: true,
    });
    console.log('📲 Pindai (Scan) QR Code berikut dengan aplikasi Authenticator di HP Anda:');
    console.log('   (Google Authenticator, Authy, Microsoft Authenticator, 1Password, dll.)\n');
    console.log(qrTerminal);
  } catch (err: any) {
    console.error('Gagal merender QR Code terminal:', err.message);
  }

  // 4. Output configuration for Environment Variables
  console.log('----------------------------------------------------------');
  console.log('📋 Salin (Copy) konfigurasi berikut ke file .env / Vercel Environment Variables:');
  console.log('----------------------------------------------------------\n');
  console.log(`TOTP_SECRET="${totpSecret}"\n`);
  console.log('💡 Keterangan:');
  console.log('   - Kunci ini digunakan sebagai fallback darurat saat WhatsApp Bot offline.');
  console.log('   - Selama WhatsApp Bot ONLINE, login TOTP otomatis dinonaktifkan demi keamanan.');
  console.log('==========================================================\n');
}

main().catch((err) => {
  console.error('Fatal error during TOTP setup:', err);
  process.exit(1);
});
