import { prisma } from '../lib/prisma';
import {
  parseBatchIncomingMessage,
  ParsedTransaction,
  ParsedTransfer,
  ParsedCommand,
  ParseResult,
} from './parser';
import { formatCurrency } from '../lib/utils';

const BOT_HEADER = `🤖 *[SakuKu Assistant]*\n`;
const BOT_FOOTER = `\n✨ _SakuKu Financial Assistant_`;

/**
 * Ensures user exists in DB based on phone number
 */
export async function getOrCreateUser(phoneNumber: string, name?: string) {
  const normalizedPhone = phoneNumber.replace(/[^0-9]/g, '');

  let user = await prisma.user.findUnique({
    where: { phoneNumber: normalizedPhone },
    include: { wallets: true },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        phoneNumber: normalizedPhone,
        name: name || process.env.DEFAULT_USER_NAME || 'Pengguna SakuKu',
        language: 'id',
        wallets: {
          create: [
            { name: 'BCA', type: 'BANK', balance: 5000000, colorCode: '#00529C' },
            { name: 'Mandiri', type: 'BANK', balance: 3500000, colorCode: '#0A3B72' },
            { name: 'GoPay', type: 'EWALLET', balance: 250000, colorCode: '#00AED6' },
            { name: 'Tunai', type: 'CASH', balance: 100000, colorCode: '#10B981' },
          ],
        },
      },
      include: { wallets: true },
    });
  }

  return user;
}

/**
 * Handles incoming WhatsApp message (Single-Line or Multi-Line Batch)
 */
export async function handleWhatsAppMessage(
  senderPhone: string,
  messageText: string
): Promise<string> {
  const user = await getOrCreateUser(senderPhone);
  const parsedItems = parseBatchIncomingMessage(messageText);

  if (parsedItems.length === 0) {
    return (
      BOT_HEADER +
      `❌ Pesan kosong atau tidak valid.\nKetik */help* untuk melihat panduan format pesan.` +
      BOT_FOOTER
    );
  }

  // If message is a single command (e.g. /saldo, /rekap, /help)
  if (parsedItems.length === 1 && parsedItems[0].kind === 'COMMAND') {
    return handleCommand(user.id, parsedItems[0]);
  }

  // If there are unknown commands among the batch
  const errors: string[] = [];
  parsedItems.forEach((item, idx) => {
    if (item.kind === 'UNKNOWN') {
      errors.push(`Baris ${item.lineNumber || idx + 1}: ${item.reason}`);
    }
  });

  if (errors.length > 0 && errors.length === parsedItems.length) {
    // All lines failed
    return (
      BOT_HEADER +
      `❌ *Format pesan tidak dikenali:*\n` +
      errors.map((e) => `• ${e}`).join('\n') +
      `\n\nKetik */help* untuk melihat format panduan transaksi multi-baris.` +
      BOT_FOOTER
    );
  }

  // Filter out executable transactions/transfers
  const executableItems = parsedItems.filter(
    (item): item is ParsedTransaction | ParsedTransfer | ParsedCommand =>
      item.kind === 'TRANSACTION' || item.kind === 'TRANSFER' || item.kind === 'COMMAND'
  );

  // If all executable are commands
  if (executableItems.every((item) => item.kind === 'COMMAND')) {
    return handleCommand(user.id, executableItems[0] as ParsedCommand);
  }

  // Execute Batch Transactions Atomically
  return executeBatchTransactions(user.id, executableItems);
}

/**
 * Atomic batch transaction executor
 */
async function executeBatchTransactions(
  userId: string,
  items: (ParsedTransaction | ParsedTransfer | ParsedCommand)[]
): Promise<string> {
  // 1. Fetch all existing wallets of the user
  const existingWallets = await prisma.wallet.findMany({ where: { userId } });
  const walletMap = new Map<string, any>();
  existingWallets.forEach((w) => {
    walletMap.set(w.name.trim().toLowerCase(), { ...w });
  });

  // Helper to resolve or auto-create wallet in memory
  const getOrInitWallet = (rawName: string) => {
    const key = rawName.trim().toLowerCase();
    if (walletMap.has(key)) {
      return walletMap.get(key);
    }
    const isEwallet = /gopay|ovo|dana|shopeepay|linkaja/i.test(rawName);
    const isCash = /tunai|cash|dompet/i.test(rawName);
    const type = isEwallet ? 'EWALLET' : isCash ? 'CASH' : 'BANK';
    const colorCode = isEwallet ? '#00AED6' : isCash ? '#10B981' : '#2563EB';

    const tempWallet = {
      id: `temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      name: rawName.toUpperCase(),
      type,
      balance: 0,
      colorCode,
      isNew: true,
    };
    walletMap.set(key, tempWallet);
    return tempWallet;
  };

  // 2. Prepare atomic operations and running balance changes
  const transactionCreatePayloads: any[] = [];
  const processedSummaries: string[] = [];
  const touchedWalletKeys = new Set<string>();
  const expenseCategoriesThisBatch: { category: string; amount: number }[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemNum = i + 1;

    if (item.kind === 'TRANSACTION') {
      const wallet = getOrInitWallet(item.walletName);
      touchedWalletKeys.add(wallet.name.toLowerCase());

      const isExpense = item.type === 'EXPENSE';
      if (isExpense) {
        wallet.balance -= item.amount;
        expenseCategoriesThisBatch.push({ category: item.category, amount: item.amount });

        transactionCreatePayloads.push({
          userId,
          walletId: wallet.id,
          title: item.title,
          amount: item.amount,
          type: 'EXPENSE',
          category: item.category,
          source: 'WHATSAPP',
          date: new Date(),
        });

        processedSummaries.push(
          `${itemNum}. 🔴 *[PENGELUARAN]* ${item.title}\n` +
          `   Dompet: *${wallet.name}* (-${formatCurrency(item.amount)})\n` +
          `   Kategori: ${item.category}`
        );
      } else {
        wallet.balance += item.amount;

        transactionCreatePayloads.push({
          userId,
          walletId: wallet.id,
          title: item.title,
          amount: item.amount,
          type: 'INCOME',
          category: item.category,
          source: 'WHATSAPP',
          date: new Date(),
        });

        processedSummaries.push(
          `${itemNum}. 🟢 *[PEMASUKAN]* ${item.title}\n` +
          `   Dompet: *${wallet.name}* (+${formatCurrency(item.amount)})\n` +
          `   Kategori: ${item.category}`
        );
      }
    } else if (item.kind === 'TRANSFER') {
      const fromWallet = getOrInitWallet(item.fromWalletName);
      const toWallet = getOrInitWallet(item.toWalletName);
      touchedWalletKeys.add(fromWallet.name.toLowerCase());
      touchedWalletKeys.add(toWallet.name.toLowerCase());

      fromWallet.balance -= item.amount;
      toWallet.balance += item.amount;

      transactionCreatePayloads.push({
        userId,
        walletId: fromWallet.id,
        destinationWalletId: toWallet.id,
        title: item.notes || `Transfer ${fromWallet.name} -> ${toWallet.name}`,
        amount: item.amount,
        type: 'TRANSFER',
        category: 'Transfer Antar Dompet',
        notes: item.notes,
        source: 'WHATSAPP',
        date: new Date(),
      });

      processedSummaries.push(
        `${itemNum}. 🔄 *[TRANSFER]* ${fromWallet.name} ➡️ ${toWallet.name}\n` +
        `   Nominal: *${formatCurrency(item.amount)}*` +
        (item.notes ? ` (${item.notes})` : '')
      );
    }
  }

  // 3. Execute everything inside an atomic Prisma Transaction
  try {
    await prisma.$transaction(async (tx) => {
      // Create new wallets if any were auto-detected
      for (const [key, wallet] of Array.from(walletMap.entries())) {
        if (wallet.isNew) {
          const created = await tx.wallet.create({
            data: {
              userId,
              name: wallet.name,
              type: wallet.type,
              balance: 0,
              colorCode: wallet.colorCode,
            },
          });
          // Replace temporary id in transactions payload
          const oldId = wallet.id;
          wallet.id = created.id;
          transactionCreatePayloads.forEach((payload) => {
            if (payload.walletId === oldId) payload.walletId = created.id;
            if (payload.destinationWalletId === oldId) payload.destinationWalletId = created.id;
          });
        }
      }

      // Create transaction records
      for (const payload of transactionCreatePayloads) {
        await tx.transaction.create({ data: payload });
      }

      // Update balances for all touched wallets
      for (const key of touchedWalletKeys) {
        const wallet = walletMap.get(key);
        if (wallet) {
          await tx.wallet.update({
            where: { id: wallet.id },
            data: { balance: wallet.balance },
          });
        }
      }
    });
  } catch (dbErr: any) {
    console.error('Batch database transaction failed:', dbErr);
    return (
      BOT_HEADER +
      `❌ Gagal menyimpan transaksi batch ke basis data: ${dbErr.message}` +
      BOT_FOOTER
    );
  }

  // 4. Check budget limits for touched expense categories
  let budgetAlerts = '';
  if (expenseCategoriesThisBatch.length > 0) {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const budgets = await prisma.budgetLimit.findMany({
      where: { userId, month: currentMonth, year: currentYear },
    });

    const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

    for (const b of budgets) {
      if (
        expenseCategoriesThisBatch.some(
          (e) => e.category.toLowerCase() === b.category.toLowerCase()
        )
      ) {
        const agg = await prisma.transaction.aggregate({
          where: {
            userId,
            category: b.category,
            type: 'EXPENSE',
            date: { gte: startOfMonth, lte: endOfMonth },
          },
          _sum: { amount: true },
        });

        const totalSpent = agg._sum.amount || 0;
        const pct = b.monthlyLimit > 0 ? Math.round((totalSpent / b.monthlyLimit) * 100) : 0;

        if (pct >= 100) {
          budgetAlerts += `\n🚨 *Overbudget (${b.category}):* ${pct}% (${formatCurrency(totalSpent)} / ${formatCurrency(b.monthlyLimit)})`;
        } else if (pct >= 75) {
          budgetAlerts += `\n⚠️ *Peringatan Budget (${b.category}):* Sudah ${pct}% batas bulanan.`;
        }
      }
    }
  }

  // 5. Build Updated Wallet Balance Summary Lines
  const updatedWallets = await prisma.wallet.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });

  const walletStatusLines = updatedWallets
    .filter((w) => touchedWalletKeys.has(w.name.toLowerCase()))
    .map((w) => `• *${w.name}*: ${formatCurrency(w.balance)}`)
    .join('\n');

  const count = items.length;
  const isMultiple = count > 1;

  return (
    BOT_HEADER +
    (isMultiple
      ? `✅ *Berhasil memproses ${count} transaksi sekaligus!*\n\n`
      : `✅ *Transaksi Berhasil Dicatat!*\n\n`) +
    `${processedSummaries.join('\n\n')}\n\n` +
    `───────────────────────\n` +
    `💼 *Status Saldo Dompet Terkait:*\n` +
    `${walletStatusLines}\n` +
    (budgetAlerts ? `───────────────────────${budgetAlerts}\n` : '') +
    BOT_FOOTER
  );
}

/**
 * Handle slash commands: /saldo, /rekap hari ini, /rekap bulan ini, /help
 */
async function handleCommand(userId: string, parsed: ParsedCommand): Promise<string> {
  switch (parsed.command) {
    case 'HELP': {
      return (
        BOT_HEADER +
        `📖 *PANDUAN FORMAT SAKUKU BOT*\n\n` +
        `⚡ *Catat Banyak Transaksi (Batch Multi-Baris):*\n` +
        `Kirim beberapa transaksi sekaligus dipisah baris baru:\n` +
        `\`\`\`\ninsert | makan siang | bca | expense | 35k\ninsert | beli kopi | gopay | expense | 18k\ntf | bca | gopay | 50k | top up\n\`\`\`\n\n` +
        `1️⃣ *Format Catat Biasa:*\n` +
        `\`ACTION | JUDUL | DOMPET | TYPE | NOMINAL | [KATEGORI]\`\n` +
        `• _catat | bensin motor | bca | expense | 50k | Transportasi_\n` +
        `• _insert | gaji freelance | mandiri | income | 5jt | Gaji_\n\n` +
        `2️⃣ *Format Transfer Antar Dompet:*\n` +
        `\`tf | ASAL | TUJUAN | NOMINAL | [CATATAN]\`\n` +
        `• _tf | bca | gopay | 50k | top up mingguan_\n\n` +
        `3️⃣ *Perintah Cepat:*\n` +
        `• */saldo* : Rincian saldo & Total Kekayaan Bersih\n` +
        `• */rekap hari ini* : Evaluasi pemasukan & pengeluaran hari ini\n` +
        `• */rekap bulan ini* : Ringkasan cashflow bulan berjalan\n` +
        `• */help* : Tampilkan menu bantuan ini\n\n` +
        `💡 _Tips: Nominal mendukung k, rb, jt (misal: 35k, 50rb, 2.5jt)_` +
        BOT_FOOTER
      );
    }

    case 'SALDO': {
      const wallets = await prisma.wallet.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      });

      if (wallets.length === 0) {
        return (
          BOT_HEADER +
          `⚠️ Belum ada dompet terdaftar. Tambahkan dompet via web dashboard atau catat transaksi pertama Anda.` +
          BOT_FOOTER
        );
      }

      let totalNetWorth = 0;
      const walletLines = wallets.map((w) => {
        totalNetWorth += w.balance;
        const icon = w.type === 'BANK' ? '🏦' : w.type === 'EWALLET' ? '📱' : '💵';
        return `${icon} *${w.name}*: ${formatCurrency(w.balance)}`;
      });

      return (
        BOT_HEADER +
        `💼 *STATUS SALDO & TOTAL KEKAYAAN*\n` +
        `───────────────────────\n` +
        `${walletLines.join('\n')}\n` +
        `───────────────────────\n` +
        `💰 *Total Net Worth*: *${formatCurrency(totalNetWorth)}*\n` +
        `📅 _Update: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB_` +
        BOT_FOOTER
      );
    }

    case 'REKAP_TODAY': {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const txs = await prisma.transaction.findMany({
        where: {
          userId,
          date: { gte: startOfDay, lte: endOfDay },
        },
        include: { wallet: true, destinationWallet: true },
        orderBy: { date: 'asc' },
      });

      let totalIncome = 0;
      let totalExpense = 0;

      const lines: string[] = [];
      txs.forEach((tx) => {
        if (tx.type === 'INCOME') {
          totalIncome += tx.amount;
          lines.push(`🟢 +${formatCurrency(tx.amount)} | ${tx.title} (${tx.wallet.name})`);
        } else if (tx.type === 'EXPENSE') {
          totalExpense += tx.amount;
          lines.push(`🔴 -${formatCurrency(tx.amount)} | ${tx.title} (${tx.wallet.name})`);
        } else if (tx.type === 'TRANSFER') {
          lines.push(
            `🔄 TF ${formatCurrency(tx.amount)} : ${tx.wallet.name} ➡️ ${
              tx.destinationWallet?.name || '?'
            }`
          );
        }
      });

      const netCashflow = totalIncome - totalExpense;

      return (
        BOT_HEADER +
        `📊 *REKAP KEUANGAN HARI INI*\n` +
        `📅 _${new Date().toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          timeZone: 'Asia/Jakarta',
        })}_\n` +
        `───────────────────────\n` +
        `🟢 Total Pemasukan : *${formatCurrency(totalIncome)}*\n` +
        `🔴 Total Pengeluaran: *${formatCurrency(totalExpense)}*\n` +
        `⚖️ Net Cashflow     : *${formatCurrency(netCashflow)}*\n` +
        `───────────────────────\n` +
        (lines.length > 0
          ? `📝 *Rincian Transaksi:*\n${lines.join('\n')}`
          : `_Belum ada transaksi yang tercatat hari ini._`) +
        BOT_FOOTER
      );
    }

    case 'REKAP_MONTH': {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      const txs = await prisma.transaction.findMany({
        where: {
          userId,
          date: { gte: startOfMonth, lte: endOfMonth },
        },
        include: { wallet: true },
      });

      let totalIncome = 0;
      let totalExpense = 0;
      const categoryMap: Record<string, number> = {};

      txs.forEach((tx) => {
        if (tx.type === 'INCOME') {
          totalIncome += tx.amount;
        } else if (tx.type === 'EXPENSE') {
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
        .map(([cat, amt], idx) => `  ${idx + 1}. ${cat}: ${formatCurrency(amt)}`);

      const monthName = now.toLocaleString('id-ID', {
        month: 'long',
        year: 'numeric',
        timeZone: 'Asia/Jakarta',
      });

      return (
        BOT_HEADER +
        `📈 *EVALUASI CASHFLOW BULAN ${monthName.toUpperCase()}*\n` +
        `───────────────────────\n` +
        `🟢 Pemasukan   : *${formatCurrency(totalIncome)}*\n` +
        `🔴 Pengeluaran : *${formatCurrency(totalExpense)}*\n` +
        `💰 Net Savings : *${formatCurrency(netSavings)}* (${savingsRate}%)\n` +
        `───────────────────────\n` +
        (topCategories.length > 0
          ? `🏆 *Top 3 Pengeluaran:*\n${topCategories.join('\n')}\n`
          : '') +
        `💡 _Buka dashboard SakuKu web untuk analisis grafik visual lengkap!_` +
        BOT_FOOTER
      );
    }
  }
}
