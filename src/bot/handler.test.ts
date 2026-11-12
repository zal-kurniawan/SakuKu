import { handleWhatsAppMessage, getOrCreateUser } from './handler';
import { prisma } from '../lib/prisma';

async function run() {
  console.log('====================================================');
  console.log('🧪 TESTING SAKUKU WHATSAPP BATCH HANDLER & REPORTING');
  console.log('====================================================');

  const testPhone = '628999999999';
  const user = await getOrCreateUser(testPhone, 'Test User Batch');

  // Ensure wallets JAGO and SUPERBANK exist for this user
  const existingWallets = await prisma.wallet.findMany({ where: { userId: user.id } });
  const hasJago = existingWallets.some((w) => w.name.toUpperCase() === 'JAGO');
  const hasSuperbank = existingWallets.some((w) => w.name.toUpperCase() === 'SUPERBANK');

  if (!hasJago) {
    await prisma.wallet.create({
      data: { userId: user.id, name: 'JAGO', type: 'BANK', balance: 8162894, colorCode: '#ff7043' },
    });
  }
  if (!hasSuperbank) {
    await prisma.wallet.create({
      data: { userId: user.id, name: 'SUPERBANK', type: 'BANK', balance: 10250461, colorCode: '#7c3aed' },
    });
  }

  // 1. TEST KONDISI A: Mixed Batch (3 valid + 1 unknown action)
  console.log('\n--- TEST 1: Kondisi A (3 Valid + 1 Unknown Action) ---');
  const mixedMsg = `add|gojek kantor|jago|ex|7500
add|makan siang|superbank|ex|27000
add|makan sore|superbank|ex|15000
0|gojek pulang|jago|ex|7500`;

  const replyA = await handleWhatsAppMessage(testPhone, mixedMsg);
  console.log(replyA);

  if (
    !replyA.includes('⚠️ *Berhasil memproses 3 transaksi, 1 gagal!*') ||
    !replyA.includes('Gojek Kantor') ||
    !replyA.includes('Makan Siang') ||
    !replyA.includes('Makan Sore') ||
    !replyA.includes('❌ *Gagal Diproses (1 Baris):*') ||
    !replyA.includes('• *Baris 4:* `0|gojek pulang|jago|ex|7500`') ||
    !replyA.includes("↳ _Alasan: Perintah '0' tidak dikenali (gunakan add/catat/tf/update/hapus)_") ||
    !replyA.includes('👛 *Status Saldo Dompet Terkait:*')
  ) {
    console.error('❌ TEST 1 FAILED: Response does not match Kondisi A specification');
    process.exit(1);
  }
  console.log('✓ TEST 1 PASSED: Kondisi A matched perfectly');

  // 2. TEST KONDISI C: All Failed
  console.log('\n--- TEST 2: Kondisi C (All Failed: Unknown action + Unknown wallet) ---');
  const failMsg = `0|gojek pulang|jago|ex|7500
add|kopi|bankasing123|ex|15000`;
  const replyC = await handleWhatsAppMessage(testPhone, failMsg);
  console.log(replyC);

  if (
    !replyC.includes('❌ *Semua transaksi gagal diproses (2 Baris):*') ||
    !replyC.includes('• *Baris 1:* `0|gojek pulang|jago|ex|7500`') ||
    !replyC.includes("↳ _Alasan: Perintah '0' tidak dikenali (gunakan add/catat/tf/update/hapus)_") ||
    !replyC.includes('• *Baris 2:* `add|kopi|bankasing123|ex|15000`') ||
    !replyC.includes("↳ _Alasan: Dompet 'bankasing123' tidak ditemukan_")
  ) {
    console.error('❌ TEST 2 FAILED: Response does not match Kondisi C specification');
    process.exit(1);
  }
  console.log('✓ TEST 2 PASSED: Kondisi C matched perfectly');

  // 3. TEST KONDISI B: Single Item Full Success
  console.log('\n--- TEST 3: Kondisi B (Single Item Success) ---');
  const singleMsg = `add|kopi espresso|jago|ex|25000`;
  const replyB = await handleWhatsAppMessage(testPhone, singleMsg);
  console.log(replyB);

  if (
    !replyB.includes('🤖 *[SakuKu - Berhasil Dicatat]*') ||
    !replyB.includes('Kopi Espresso') ||
    !replyB.includes('JAGO')
  ) {
    console.error('❌ TEST 3 FAILED: Response does not match Kondisi B specification');
    process.exit(1);
  }
  console.log('✓ TEST 3 PASSED: Kondisi B matched perfectly');

  console.log('\n🎉 ALL SAKUKU HANDLER INTEGRATION TESTS PASSED 100%!\n');
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
