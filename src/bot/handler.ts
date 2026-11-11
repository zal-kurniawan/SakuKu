import { prisma } from '../lib/prisma';
import {
  parseBatchIncomingMessage,
  ParsedTransaction,
  ParsedTransfer,
  ParsedCommand,
  ParsedDelete,
  ParsedUpdate,
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

  // If message is a single action
  if (parsedItems.length === 1) {
    const item = parsedItems[0];
    if (item.kind === 'COMMAND') {
      return handleCommand(user.id, item);
    }
    if (item.kind === 'DELETE') {
      return handleDeleteTransaction(user.id, item.transactionId);
    }
    if (item.kind === 'UPDATE') {
      return handleUpdateTransaction(user.id, item);
    }
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

  // Check if all lines are delete/update/command
  const deleteItems = parsedItems.filter((i): i is ParsedDelete => i.kind === 'DELETE');
  const updateItems = parsedItems.filter((i): i is ParsedUpdate => i.kind === 'UPDATE');
  const commandItems = parsedItems.filter((i): i is ParsedCommand => i.kind === 'COMMAND');

  if (deleteItems.length === 1 && parsedItems.length === 1) {
    return handleDeleteTransaction(user.id, deleteItems[0].transactionId);
  }

  if (updateItems.length === 1 && parsedItems.length === 1) {
    return handleUpdateTransaction(user.id, updateItems[0]);
  }

  if (commandItems.length === parsedItems.length && commandItems.length > 0) {
    return handleCommand(user.id, commandItems[0]);
  }

  // Filter out executable transactions/transfers
  const executableItems = parsedItems.filter(
    (item): item is ParsedTransaction | ParsedTransfer =>
      item.kind === 'TRANSACTION' || item.kind === 'TRANSFER'
  );

  if (executableItems.length === 0) {
    if (deleteItems.length > 0) {
      return handleDeleteTransaction(user.id, deleteItems[0].transactionId);
    }
    if (updateItems.length > 0) {
      return handleUpdateTransaction(user.id, updateItems[0]);
    }
    return (
      BOT_HEADER +
      `❌ Format pesan tidak dikenali.\nKetik */help* untuk panduan format.` +
      BOT_FOOTER
    );
  }

  // Execute Batch Transactions Atomically
  return executeBatchTransactions(user.id, executableItems);
}

/**
 * Handle Delete transaction via WhatsApp: hapus | ID or delete | ID
 */
async function handleDeleteTransaction(userId: string, txId: number): Promise<string> {
  const tx = await prisma.transaction.findFirst({
    where: { id: txId, userId },
    include: { wallet: true, destinationWallet: true },
  });

  if (!tx) {
    return (
      BOT_HEADER +
      `❌ Transaksi *#${txId}* tidak ditemukan atau bukan milik Anda.\nPastikan ID transaksi sudah benar.` +
      BOT_FOOTER
    );
  }

  try {
    const updatedWallet = await prisma.$transaction(async (db) => {
      // Revert wallet balance
      if (tx.type === 'EXPENSE') {
        await db.wallet.update({
          where: { id: tx.walletId },
          data: { balance: { increment: tx.amount } },
        });
      } else if (tx.type === 'INCOME') {
        await db.wallet.update({
          where: { id: tx.walletId },
          data: { balance: { decrement: tx.amount } },
        });
      } else if (tx.type === 'TRANSFER' && tx.destinationWalletId) {
        await db.wallet.update({
          where: { id: tx.walletId },
          data: { balance: { increment: tx.amount } },
        });
        await db.wallet.update({
          where: { id: tx.destinationWalletId },
          data: { balance: { decrement: tx.amount } },
        });
      }

      await db.transaction.delete({
        where: { id: tx.id },
      });

      return await db.wallet.findUnique({
        where: { id: tx.walletId },
      });
    });

    const isExpense = tx.type === 'EXPENSE';
    const isIncome = tx.type === 'INCOME';
    const typeLabel = isExpense ? 'Pengeluaran' : isIncome ? 'Pemasukan' : 'Transfer';
    const sign = isExpense ? '-' : isIncome ? '+' : '';

    let transferExtra = '';
    if (tx.type === 'TRANSFER' && tx.destinationWalletId) {
      const destW = await prisma.wallet.findUnique({ where: { id: tx.destinationWalletId } });
      if (destW) {
        transferExtra = `\n• *${destW.name}*: ${formatCurrency(destW.balance)}`;
      }
    }

    return (
      `🤖 *[SakuKu - Transaksi Dihapus]*\n` +
      `🆔 *ID: #${tx.id}*\n` +
      `📝 Transaksi: ${tx.title} (${typeLabel})\n` +
      `👛 Dompet: ${tx.wallet.name} (${sign}${formatCurrency(tx.amount)})\n` +
      `🏷️ Kategori: ${tx.category}\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `*Saldo Dompet Terkini:*\n` +
      `• *${tx.wallet.name}*: ${formatCurrency(updatedWallet?.balance || 0)}` +
      transferExtra +
      BOT_FOOTER
    );
  } catch (err: any) {
    return (
      BOT_HEADER +
      `❌ Gagal menghapus transaksi *#${txId}*: ${err.message}` +
      BOT_FOOTER
    );
  }
}

/**
 * Handle Update transaction via WhatsApp: update | ID | TITLE | WALLET | TYPE | AMOUNT | [CATEGORY]
 */
async function handleUpdateTransaction(userId: string, parsed: ParsedUpdate): Promise<string> {
  const oldTx = await prisma.transaction.findFirst({
    where: { id: parsed.transactionId, userId },
    include: { wallet: true, destinationWallet: true },
  });

  if (!oldTx) {
    return (
      BOT_HEADER +
      `❌ Transaksi *#${parsed.transactionId}* tidak ditemukan atau bukan milik Anda.\nPastikan ID transaksi sudah benar.` +
      BOT_FOOTER
    );
  }

  try {
    const result = await prisma.$transaction(async (db) => {
      // Find or create target wallet
      const existingWallets = await db.wallet.findMany({ where: { userId } });
      let targetWallet = existingWallets.find(
        (w) => w.name.trim().toLowerCase() === parsed.walletName.trim().toLowerCase()
      );

      if (!targetWallet) {
        targetWallet = await db.wallet.create({
          data: {
            userId,
            name: parsed.walletName.toUpperCase(),
            type: /gopay|ovo|dana|shopeepay|linkaja/i.test(parsed.walletName)
              ? 'EWALLET'
              : /cash|tunai/i.test(parsed.walletName)
              ? 'CASH'
              : 'BANK',
            balance: 0,
            colorCode: '#005caa',
          },
        });
      }

      // 1. Rollback old transaction impact
      if (oldTx.type === 'EXPENSE') {
        await db.wallet.update({
          where: { id: oldTx.walletId },
          data: { balance: { increment: oldTx.amount } },
        });
      } else if (oldTx.type === 'INCOME') {
        await db.wallet.update({
          where: { id: oldTx.walletId },
          data: { balance: { decrement: oldTx.amount } },
        });
      } else if (oldTx.type === 'TRANSFER' && oldTx.destinationWalletId) {
        await db.wallet.update({
          where: { id: oldTx.walletId },
          data: { balance: { increment: oldTx.amount } },
        });
        await db.wallet.update({
          where: { id: oldTx.destinationWalletId },
          data: { balance: { decrement: oldTx.amount } },
        });
      }

      // 2. Apply new transaction impact
      if (parsed.type === 'EXPENSE') {
        await db.wallet.update({
          where: { id: targetWallet.id },
          data: { balance: { decrement: parsed.amount } },
        });
      } else if (parsed.type === 'INCOME') {
        await db.wallet.update({
          where: { id: targetWallet.id },
          data: { balance: { increment: parsed.amount } },
        });
      }

      // 3. Update transaction record
      const updatedTx = await db.transaction.update({
        where: { id: oldTx.id },
        data: {
          title: parsed.title,
          amount: parsed.amount,
          type: parsed.type,
          category: parsed.category,
          walletId: targetWallet.id,
          destinationWalletId: null,
          updatedAt: new Date(),
        },
      });

      const updatedWallet = await db.wallet.findUnique({
        where: { id: targetWallet.id },
      });

      return { updatedTx, updatedWallet };
    });

    const isExpense = parsed.type === 'EXPENSE';
    const sign = isExpense ? '-' : '+';

    return (
      `🤖 *[SakuKu - Transaksi Diperbarui]*\n` +
      `🆔 *ID: #${result.updatedTx.id}*\n` +
      `📝 Transaksi: ${result.updatedTx.title}\n` +
      `👛 Dompet: ${result.updatedWallet?.name} (${sign}${formatCurrency(result.updatedTx.amount)})\n` +
      `🏷️ Kategori: ${result.updatedTx.category}\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `*Sisa Saldo ${result.updatedWallet?.name}:* ${formatCurrency(result.updatedWallet?.balance || 0)}` +
      BOT_FOOTER
    );
  } catch (err: any) {
    return (
      BOT_HEADER +
      `❌ Gagal memperbarui transaksi *#${parsed.transactionId}*: ${err.message}` +
      BOT_FOOTER
    );
  }
}

/**
 * Atomic batch transaction executor
 */
async function executeBatchTransactions(
  userId: string,
  items: (ParsedTransaction | ParsedTransfer)[]
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
    const colorCode = isEwallet ? '#00AED6' : isCash ? '#10B981' : '#005caa';

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
  const touchedWalletKeys = new Set<string>();
  const expenseCategoriesThisBatch: { category: string; amount: number }[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

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
    }
  }

  // 3. Execute everything inside an atomic Prisma Transaction
  const createdTransactions: any[] = [];
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
        const created = await tx.transaction.create({ data: payload });
        createdTransactions.push(created);
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

  // 5. Fetch updated wallets from DB for fresh balances
  const updatedWallets = await prisma.wallet.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });

  const count = items.length;

  // Single Input Response (Exact format requested by user)
  if (count === 1 && createdTransactions.length === 1) {
    const tx = createdTransactions[0];
    const isExpense = tx.type === 'EXPENSE';
    const isIncome = tx.type === 'INCOME';
    const isTransfer = tx.type === 'TRANSFER';
    const wallet = updatedWallets.find((w) => w.id === tx.walletId);

    if (isTransfer) {
      const destWallet = updatedWallets.find((w) => w.id === tx.destinationWalletId);
      return (
        `🤖 *[SakuKu - Berhasil Dicatat]*\n` +
        `🆔 *ID: #${tx.id}*\n` +
        `📝 Transfer Antar Dompet\n` +
        `🔄 *${wallet?.name || 'Asal'}* ➡️ *${destWallet?.name || 'Tujuan'}*\n` +
        `💵 Nominal: ${formatCurrency(tx.amount)}\n` +
        (tx.notes ? `🗒️ Catatan: ${tx.notes}\n` : '') +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `*Sisa Saldo ${wallet?.name}:* ${formatCurrency(wallet?.balance || 0)}\n` +
        (destWallet ? `*Sisa Saldo ${destWallet.name}:* ${formatCurrency(destWallet.balance)}\n` : '') +
        (budgetAlerts ? `━━━━━━━━━━━━━━━━━━━━━${budgetAlerts}\n` : '') +
        BOT_FOOTER
      );
    }

    const sign = isExpense ? '-' : '+';
    return (
      `🤖 *[SakuKu - Berhasil Dicatat]*\n` +
      `🆔 *ID: #${tx.id}*\n` +
      `📝 Transaksi: ${tx.title}\n` +
      `👛 Dompet: ${wallet?.name || ''} (${sign}${formatCurrency(tx.amount)})\n` +
      `🏷️ Kategori: ${tx.category}\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `*Sisa Saldo ${wallet?.name}:* ${formatCurrency(wallet?.balance || 0)}\n` +
      (budgetAlerts ? `━━━━━━━━━━━━━━━━━━━━━${budgetAlerts}\n` : '') +
      BOT_FOOTER
    );
  }

  // Multi-line Batch Input Response with #ID for each item
  const multiSummaries = createdTransactions.map((tx, idx) => {
    const isExpense = tx.type === 'EXPENSE';
    const isIncome = tx.type === 'INCOME';
    const isTransfer = tx.type === 'TRANSFER';
    const wallet = updatedWallets.find((w) => w.id === tx.walletId);
    const sign = isExpense ? '-' : isIncome ? '+' : '';

    if (isTransfer) {
      const destWallet = updatedWallets.find((w) => w.id === tx.destinationWalletId);
      return (
        `${idx + 1}. 🆔 *#${tx.id}* 🔄 *[TRANSFER]* ${wallet?.name || 'Asal'} ➡️ ${destWallet?.name || 'Tujuan'}\n` +
        `   Nominal: *${formatCurrency(tx.amount)}*` +
        (tx.notes ? ` (${tx.notes})` : '')
      );
    }

    return (
      `${idx + 1}. 🆔 *#${tx.id}* ${isExpense ? '🔴' : '🟢'} *${tx.title}*\n` +
      `   Dompet: *${wallet?.name || ''}* (${sign}${formatCurrency(tx.amount)}) | Kategori: ${tx.category}`
    );
  });

  const walletStatusLines = updatedWallets
    .filter((w) => touchedWalletKeys.has(w.name.toLowerCase()))
    .map((w) => `• *${w.name}*: ${formatCurrency(w.balance)}`)
    .join('\n');

  return (
    BOT_HEADER +
    `✅ *Berhasil memproses ${count} transaksi sekaligus!*\n\n` +
    `${multiSummaries.join('\n\n')}\n\n` +
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
        `⚡ *Catat Transaksi (Single / Multi-Baris):*\n` +
        `\`ACTION | JUDUL | DOMPET | TYPE | NOMINAL | [KATEGORI]\`\n` +
        `• _catat | makan siang | bca | expense | 35k | Makanan_\n` +
        `• _insert | gaji freelance | mandiri | income | 5jt | Gaji_\n\n` +
        `🔄 *Transfer Antar Dompet:*\n` +
        `\`tf | ASAL | TUJUAN | NOMINAL | [CATATAN]\`\n` +
        `• _tf | bca | gopay | 50k | top up mingguan_\n\n` +
        `🗑️ *Hapus Transaksi:*\n` +
        `\`hapus | ID\` atau \`delete | ID\`\n` +
        `• _hapus | 105_\n\n` +
        `✏️ *Update Transaksi:*\n` +
        `\`update | ID | JUDUL | DOMPET | TYPE | NOMINAL | [KATEGORI]\`\n` +
        `• _update | 105 | makan siang padang | bca | expense | 45k | Makanan_\n\n` +
        `📊 *Perintah Cepat:*\n` +
        `• */saldo* : Rincian saldo & Total Kekayaan Bersih\n` +
        `• */rekap hari ini* : Rincian transaksi & cashflow hari ini\n` +
        `• */rekap bulan ini* : Evaluasi cashflow & top pengeluaran\n` +
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
          lines.push(`🟢 *#${tx.id}* +${formatCurrency(tx.amount)} | ${tx.title} (${tx.wallet.name})`);
        } else if (tx.type === 'EXPENSE') {
          totalExpense += tx.amount;
          lines.push(`🔴 *#${tx.id}* -${formatCurrency(tx.amount)} | ${tx.title} (${tx.wallet.name})`);
        } else if (tx.type === 'TRANSFER') {
          lines.push(
            `🔄 *#${tx.id}* TF ${formatCurrency(tx.amount)} : ${tx.wallet.name} ➡️ ${
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
        orderBy: { date: 'asc' },
      });

      let totalIncome = 0;
      let totalExpense = 0;
      const categoryMap: Record<string, number> = {};

      const lines: string[] = [];
      txs.forEach((tx) => {
        if (tx.type === 'INCOME') {
          totalIncome += tx.amount;
          lines.push(`🟢 *#${tx.id}* +${formatCurrency(tx.amount)} | ${tx.title} (${tx.wallet.name})`);
        } else if (tx.type === 'EXPENSE') {
          totalExpense += tx.amount;
          lines.push(`🔴 *#${tx.id}* -${formatCurrency(tx.amount)} | ${tx.title} (${tx.wallet.name})`);
          categoryMap[tx.category] = (categoryMap[tx.category] || 0) + tx.amount;
        } else if (tx.type === 'TRANSFER') {
          lines.push(`🔄 *#${tx.id}* TF ${formatCurrency(tx.amount)} | ${tx.title} (${tx.wallet.name})`);
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
          ? `🏆 *Top 3 Pengeluaran:*\n${topCategories.join('\n')}\n───────────────────────\n`
          : '') +
        (lines.length > 0
          ? `📝 *Rincian Transaksi Bulan Ini (${lines.length}):*\n${lines.slice(-10).join('\n')}\n` +
            (lines.length > 10 ? `_...dan ${lines.length - 10} transaksi lainnya di web dashboard._\n` : '')
          : `_Belum ada transaksi bulan ini._\n`) +
        `💡 _Buka dashboard SakuKu web untuk analisis grafik visual lengkap!_` +
        BOT_FOOTER
      );
    }
  }
}
