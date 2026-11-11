import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { sendDirectMessage } from './whatsapp';
import { formatCurrency } from '../lib/utils';

const CRON_HEADER = `🤖 *[SakuKu Assistant]*\n`;
const CRON_FOOTER = `\n✨ _SakuKu Financial Assistant_`;

/**
 * Checks whether today is the last day of the current month
 */
function isLastDayOfMonth(date: Date): boolean {
  const tomorrow = new Date(date);
  tomorrow.setDate(date.getDate() + 1);
  return tomorrow.getMonth() !== date.getMonth();
}

/**
 * Format Date to YYYY-MM-DD
 */
function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Initialize all Cron schedulers for SakuKu
 */
export function initCronSchedulers() {
  const timezone = process.env.TIMEZONE || 'Asia/Jakarta';
  console.log(`⏱️ [SAKUKU CRON] Inisialisasi scheduler notifikasi (Timezone: ${timezone})`);

  // 1. Daily Reminder - Every day at 20:00 WIB
  const dailyCronExpr = process.env.CRON_DAILY_REMINDER || '0 20 * * *';
  cron.schedule(
    dailyCronExpr,
    async () => {
      console.log('⏰ [CRON TRIGGER] Menjalankan pengecekan Daily Reminder...');
      await executeDailyReminder();
    },
    { timezone }
  );
  console.log(`  ✓ Daily Reminder aktif pada: ${dailyCronExpr} WIB`);

  // 2. Monthly Report - Check daily at 21:00 WIB on days 28-31
  const monthlyCronExpr = process.env.CRON_MONTHLY_REPORT || '0 21 28-31 * *';
  cron.schedule(
    monthlyCronExpr,
    async () => {
      const now = new Date();
      if (isLastDayOfMonth(now)) {
        console.log('⏰ [CRON TRIGGER] Menjalankan pembuatan Monthly Report akhir bulan...');
        await executeMonthlyReport();
      }
    },
    { timezone }
  );
  console.log(`  ✓ Monthly Report aktif pada: ${monthlyCronExpr} WIB (Evaluasi Hari Terakhir)`);

  // 3. Yearly Report - 31 December at 21:00 WIB
  const yearlyCronExpr = process.env.CRON_YEARLY_REPORT || '0 21 31 12 *';
  cron.schedule(
    yearlyCronExpr,
    async () => {
      console.log('⏰ [CRON TRIGGER] Menjalankan pembuatan Yearly Report Akhir Tahun...');
      await executeYearlyReport();
    },
    { timezone }
  );
  console.log(`  ✓ Yearly Report aktif pada: ${yearlyCronExpr} WIB (31 Desember)`);
}

/**
 * 1. Daily Reminder Execution
 */
export async function executeDailyReminder() {
  const now = new Date();
  const todayKey = formatDateKey(now);

  const users = await prisma.user.findMany({
    where: { phoneNumber: { not: '' } },
  });

  for (const user of users) {
    const existingLog = await prisma.notificationLog.findFirst({
      where: {
        userId: user.id,
        type: 'DAILY_REMINDER',
        targetDate: todayKey,
        status: 'SENT',
      },
    });

    if (existingLog) {
      console.log(`[DAILY REMINDER] Sudah dikirim ke user ${user.phoneNumber} hari ini.`);
      continue;
    }

    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const countToday = await prisma.transaction.count({
      where: {
        userId: user.id,
        date: { gte: startOfDay, lte: endOfDay },
      },
    });

    if (countToday === 0) {
      const reminderText =
        CRON_HEADER +
        `👋 *Halo, ${user.name || 'Sobat SakuKu'}!*\n\n` +
        `⏰ Waktu sudah menunjukkan pukul 20:00 WIB. Kamu belum mencatat pengeluaran atau pemasukan hari ini nih.\n\n` +
        `Yuk catat sekarang agar keuanganmu tetap rapi dan terukur! 🚀\n\n` +
        `_Contoh catat cepat:_\n` +
        `\`catat | makan malam | bca | expense | 45k | Makanan\`` +
        CRON_FOOTER;

      const success = await sendDirectMessage(user.phoneNumber, reminderText);

      await prisma.notificationLog.create({
        data: {
          userId: user.id,
          type: 'DAILY_REMINDER',
          targetDate: todayKey,
          status: success ? 'SENT' : 'FAILED',
          payload: `Transaction count: 0`,
        },
      });
    } else {
      console.log(
        `[DAILY REMINDER] User ${user.phoneNumber} sudah mencatat ${countToday} transaksi hari ini. Reminder dilewati.`
      );
      await prisma.notificationLog.create({
        data: {
          userId: user.id,
          type: 'DAILY_REMINDER',
          targetDate: todayKey,
          status: 'SKIPPED',
          payload: `User already recorded ${countToday} transactions`,
        },
      });
    }
  }
}

/**
 * 2. Monthly Report Execution
 */
export async function executeMonthlyReport() {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const users = await prisma.user.findMany({
    include: { wallets: true },
  });

  for (const user of users) {
    const existingLog = await prisma.notificationLog.findFirst({
      where: {
        userId: user.id,
        type: 'MONTHLY_REPORT',
        targetDate: monthKey,
        status: 'SENT',
      },
    });

    if (existingLog) continue;

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const txs = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        date: { gte: startOfMonth, lte: endOfMonth },
      },
    });

    let totalIncome = 0;
    let totalExpense = 0;
    const categoryMap: Record<string, number> = {};

    txs.forEach((tx) => {
      if (tx.type === 'INCOME') totalIncome += tx.amount;
      if (tx.type === 'EXPENSE') {
        totalExpense += tx.amount;
        categoryMap[tx.category] = (categoryMap[tx.category] || 0) + tx.amount;
      }
    });

    const netSavings = totalIncome - totalExpense;
    const savingsRate =
      totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

    const topCategories = Object.entries(categoryMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat, amt], i) => `   ${i + 1}. ${cat}: ${formatCurrency(amt)}`);

    const walletLines = user.wallets.map(
      (w) => `   • ${w.name}: ${formatCurrency(w.balance)}`
    );

    const monthName = now.toLocaleString('id-ID', {
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Jakarta',
    });

    const reportText =
      CRON_HEADER +
      `🎉 *LAPORAN KEUANGAN BULAN ${monthName.toUpperCase()}*\n` +
      `───────────────────────\n` +
      `🟢 Total Pemasukan   : *${formatCurrency(totalIncome)}*\n` +
      `🔴 Total Pengeluaran : *${formatCurrency(totalExpense)}*\n` +
      `💰 Net Savings       : *${formatCurrency(netSavings)}* (${savingsRate}%)\n` +
      `───────────────────────\n` +
      `🏆 *Top 3 Kategori Pengeluaran:*\n` +
      (topCategories.length > 0 ? topCategories.join('\n') : '   _Tidak ada data pengeluaran_') +
      `\n\n` +
      `💼 *Saldo Akhir Dompet:*\n` +
      (walletLines.length > 0 ? walletLines.join('\n') : '   _Belum ada dompet_') +
      `\n───────────────────────\n` +
      `✨ Selamat menyelesaikan bulan ini! Evaluasi dan targetkan tabungan lebih baik di bulan depan.` +
      CRON_FOOTER;

    const success = await sendDirectMessage(user.phoneNumber, reportText);

    await prisma.notificationLog.create({
      data: {
        userId: user.id,
        type: 'MONTHLY_REPORT',
        targetDate: monthKey,
        status: success ? 'SENT' : 'FAILED',
        payload: JSON.stringify({ totalIncome, totalExpense, netSavings, savingsRate }),
      },
    });
  }
}

/**
 * 3. Yearly Report Execution
 */
export async function executeYearlyReport() {
  const now = new Date();
  const yearKey = `${now.getFullYear()}`;

  const users = await prisma.user.findMany({
    include: { wallets: true },
  });

  for (const user of users) {
    const existingLog = await prisma.notificationLog.findFirst({
      where: {
        userId: user.id,
        type: 'YEARLY_REPORT',
        targetDate: yearKey,
        status: 'SENT',
      },
    });

    if (existingLog) continue;

    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

    const txs = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        date: { gte: startOfYear, lte: endOfYear },
      },
    });

    let totalIncome = 0;
    let totalExpense = 0;
    const categoryMap: Record<string, number> = {};

    txs.forEach((tx) => {
      if (tx.type === 'INCOME') totalIncome += tx.amount;
      if (tx.type === 'EXPENSE') {
        totalExpense += tx.amount;
        categoryMap[tx.category] = (categoryMap[tx.category] || 0) + tx.amount;
      }
    });

    const netSavings = totalIncome - totalExpense;
    const savingsRate =
      totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

    const topCategories = Object.entries(categoryMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat, amt], i) => `   ${i + 1}. ${cat}: ${formatCurrency(amt)}`);

    let totalAssets = 0;
    const walletLines = user.wallets.map((w) => {
      totalAssets += w.balance;
      return `   • ${w.name}: ${formatCurrency(w.balance)}`;
    });

    const reportText =
      CRON_HEADER +
      `🎆 *EVALUASI TAHUNAN KEUANGAN TAHUN ${yearKey}*\n` +
      `───────────────────────\n` +
      `🟢 Total Arus Masuk (1 Tahun) : *${formatCurrency(totalIncome)}*\n` +
      `🔴 Total Pengeluaran (1 Tahun): *${formatCurrency(totalExpense)}*\n` +
      `💰 Akumulasi Tabungan Bersih  : *${formatCurrency(netSavings)}*\n` +
      `📈 Rasio Tabungan (Savings)   : *${savingsRate}%*\n` +
      `───────────────────────\n` +
      `🏆 *Top 5 Kategori Pengeluaran Tahun Ini:*\n` +
      (topCategories.length > 0 ? topCategories.join('\n') : '   _Tidak ada data pengeluaran_') +
      `\n\n` +
      `🏦 *Ringkasan Aset per Dompet:*\n` +
      walletLines.join('\n') +
      `\n` +
      `💎 *Total Aset Keseluruhan: ${formatCurrency(totalAssets)}*\n` +
      `───────────────────────\n` +
      `🌟 Terima kasih telah konsisten mencatat keuangan sepanjang tahun ${yearKey}! Siapkan resolusi finansial terbaik untuk tahun baru! 🚀` +
      CRON_FOOTER;

    const success = await sendDirectMessage(user.phoneNumber, reportText);

    await prisma.notificationLog.create({
      data: {
        userId: user.id,
        type: 'YEARLY_REPORT',
        targetDate: yearKey,
        status: success ? 'SENT' : 'FAILED',
        payload: JSON.stringify({ totalIncome, totalExpense, netSavings, savingsRate }),
      },
    });
  }
}
