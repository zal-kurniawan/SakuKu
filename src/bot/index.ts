import dotenv from 'dotenv';
dotenv.config();

import { startWhatsAppBot } from './whatsapp';
import { initCronSchedulers } from './cron';
import { prisma } from '../lib/prisma';

console.log('==========================================================');
console.log('🚀 SAKUKU - PERSONAL MULTI-WALLET FINANCE BOT ENGINE');
console.log('==========================================================');

// Check environment variables
const myPhone = process.env.MY_PHONE_NUMBER;
if (!myPhone) {
  console.warn('⚠️ [CONFIG WARNING] MY_PHONE_NUMBER belum diisi di .env!');
  console.warn('   Silakan set nomor WhatsApp Anda pada .env (contoh: 6281234567890)');
} else {
  console.log(`🔒 [SECURITY] Whitelist aktif untuk nomor: ${myPhone}`);
}

async function main() {
  try {
    // 1. Initialize Cron Schedulers
    initCronSchedulers();

    // 2. Start WhatsApp Baileys Bot Socket
    await startWhatsAppBot();

    console.log('\n🟢 SakuKu Bot & Scheduler berhasil berjalan.');
    console.log('Tekan Ctrl+C untuk menghentikan layanan.\n');
  } catch (error) {
    console.error('❌ Terjadi kesalahan fatal saat memulai SakuKu bot:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Menghentikan SakuKu bot dan scheduler...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Menghentikan SakuKu bot dan scheduler...');
  await prisma.$disconnect();
  process.exit(0);
});

main();
