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
import { formatTransactionTitle } from '../lib/formatters';
import { getTodayRange, getMonthRange, APP_TIMEZONE } from '../lib/timezone';

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

  // 1. Handle single slash command or when all lines are slash commands
  if (parsedItems.length === 1 && parsedItems[0].kind === 'COMMAND') {
    return handleCommand(user.id, parsedItems[0]);
  }
  if (parsedItems.every((i) => i.kind === 'COMMAND')) {
    return handleCommand(user.id, parsedItems[0] as ParsedCommand);
  }

  // 2. Fetch active user wallets from database
  const userWallets = await prisma.wallet.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'asc' },
  });

  const findWallet = (name: string) =>
    userWallets.find((w) => w.name.trim().toLowerCase() === name.trim().toLowerCase());

  interface SuccessItem {
    id: number;
    kind: 'TRANSACTION' | 'TRANSFER' | 'UPDATE' | 'DELETE';
    title: string;
    type?: 'INCOME' | 'EXPENSE' | 'TRANSFER';
    walletName: string;
    destWalletName?: string;
    amount: number;
    category?: string;
    notes?: string;
    rawLine: string;
    lineNumber: number;
  }

  interface FailedItem {
    lineNumber: number;
    rawLine: string;
    reason: string;
  }

  const succeeded: SuccessItem[] = [];
  const failed: FailedItem[] = [];
  const touchedWalletIds = new Set<string>();
  const expenseCategoriesThisBatch: { category: string; amount: number }[] = [];

  // 3. Process every non-empty line
  for (const item of parsedItems) {
    const lineNum = item.lineNumber || 1;

    if (item.kind === 'UNKNOWN') {
      failed.push({
        lineNumber: lineNum,
        rawLine: item.raw,
        reason: item.reason || 'Format pesan tidak dikenali',
      });
      continue;
    }

    if (item.kind === 'COMMAND') {
      failed.push({
        lineNumber: lineNum,
        rawLine: item.raw,
        reason: 'Perintah slash command tidak dapat digabung dengan transaksi baris',
      });
      continue;
    }

    if (item.kind === 'TRANSACTION') {
      const wallet = findWallet(item.walletName);
      if (!wallet) {
        failed.push({
          lineNumber: lineNum,
          rawLine: item.raw,
          reason: `Dompet '${item.walletName}' tidak ditemukan`,
        });
        continue;
      }

      try {
        const isExpense = item.type === 'EXPENSE';
        const delta = isExpense ? -item.amount : item.amount;

        const [createdTx, updatedWallet] = await prisma.$transaction([
          prisma.transaction.create({
            data: {
              userId: user.id,
              walletId: wallet.id,
              title: formatTransactionTitle(item.title),
              amount: item.amount,
              type: item.type,
              category: item.category,
              source: 'WHATSAPP',
              date: new Date(),
            },
          }),
          prisma.wallet.update({
            where: { id: wallet.id },
            data: { balance: { increment: delta } },
          }),
        ]);

        wallet.balance = updatedWallet.balance;
        touchedWalletIds.add(wallet.id);
        if (isExpense) {
          expenseCategoriesThisBatch.push({ category: item.category, amount: item.amount });
        }

        succeeded.push({
          id: createdTx.id,
          kind: 'TRANSACTION',
          title: createdTx.title,
          type: createdTx.type,
          walletName: wallet.name,
          amount: createdTx.amount,
          category: createdTx.category,
          rawLine: item.raw,
          lineNumber: lineNum,
        });
      } catch (err: any) {
        failed.push({
          lineNumber: lineNum,
          rawLine: item.raw,
          reason: err.message || 'Gagal menyimpan transaksi ke basis data',
        });
      }
    } else if (item.kind === 'TRANSFER') {
      const fromWallet = findWallet(item.fromWalletName);
      if (!fromWallet) {
        failed.push({
          lineNumber: lineNum,
          rawLine: item.raw,
          reason: `Dompet '${item.fromWalletName}' tidak ditemukan`,
        });
        continue;
      }

      const toWallet = findWallet(item.toWalletName);
      if (!toWallet) {
        failed.push({
          lineNumber: lineNum,
          rawLine: item.raw,
          reason: `Dompet '${item.toWalletName}' tidak ditemukan`,
        });
        continue;
      }

      if (fromWallet.id === toWallet.id) {
        failed.push({
          lineNumber: lineNum,
          rawLine: item.raw,
          reason: 'Dompet asal dan tujuan tidak boleh sama',
        });
        continue;
      }

      try {
        const title = item.notes
          ? formatTransactionTitle(item.notes)
          : `Transfer ${fromWallet.name} -> ${toWallet.name}`;

        const [createdTx, updatedFrom, updatedTo] = await prisma.$transaction([
          prisma.transaction.create({
            data: {
              userId: user.id,
              walletId: fromWallet.id,
              destinationWalletId: toWallet.id,
              title,
              amount: item.amount,
              type: 'TRANSFER',
              category: 'Transfer Antar Dompet',
              notes: item.notes,
              source: 'WHATSAPP',
              date: new Date(),
            },
          }),
          prisma.wallet.update({
            where: { id: fromWallet.id },
            data: { balance: { decrement: item.amount } },
          }),
          prisma.wallet.update({
            where: { id: toWallet.id },
            data: { balance: { increment: item.amount } },
          }),
        ]);

        fromWallet.balance = updatedFrom.balance;
        toWallet.balance = updatedTo.balance;
        touchedWalletIds.add(fromWallet.id);
        touchedWalletIds.add(toWallet.id);

        succeeded.push({
          id: createdTx.id,
          kind: 'TRANSFER',
          title,
          type: 'TRANSFER',
          walletName: fromWallet.name,
          destWalletName: toWallet.name,
          amount: createdTx.amount,
          notes: item.notes,
          rawLine: item.raw,
          lineNumber: lineNum,
        });
      } catch (err: any) {
        failed.push({
          lineNumber: lineNum,
          rawLine: item.raw,
          reason: err.message || 'Gagal memproses transfer ke basis data',
        });
      }
    } else if (item.kind === 'DELETE') {
      const tx = await prisma.transaction.findFirst({
        where: { id: item.transactionId, userId: user.id },
        include: { wallet: true, destinationWallet: true },
      });

      if (!tx) {
        failed.push({
          lineNumber: lineNum,
          rawLine: item.raw,
          reason: `Transaksi ID #${item.transactionId} tidak ditemukan`,
        });
        continue;
      }

      try {
        await prisma.$transaction(async (db) => {
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

          await db.transaction.delete({ where: { id: tx.id } });
        });

        touchedWalletIds.add(tx.walletId);
        if (tx.destinationWalletId) touchedWalletIds.add(tx.destinationWalletId);

        const w1 = await prisma.wallet.findUnique({ where: { id: tx.walletId } });
        if (w1) {
          const memW1 = userWallets.find((uw) => uw.id === w1.id);
          if (memW1) memW1.balance = w1.balance;
        }
        if (tx.destinationWalletId) {
          const w2 = await prisma.wallet.findUnique({ where: { id: tx.destinationWalletId } });
          if (w2) {
            const memW2 = userWallets.find((uw) => uw.id === w2.id);
            if (memW2) memW2.balance = w2.balance;
          }
        }

        succeeded.push({
          id: tx.id,
          kind: 'DELETE',
          title: tx.title,
          walletName: tx.wallet?.name || '',
          amount: tx.amount,
          category: tx.category,
          rawLine: item.raw,
          lineNumber: lineNum,
        });
      } catch (err: any) {
        failed.push({
          lineNumber: lineNum,
          rawLine: item.raw,
          reason: err.message || 'Gagal menghapus transaksi',
        });
      }
    } else if (item.kind === 'UPDATE') {
      const oldTx = await prisma.transaction.findFirst({
        where: { id: item.transactionId, userId: user.id },
        include: { wallet: true, destinationWallet: true },
      });

      if (!oldTx) {
        failed.push({
          lineNumber: lineNum,
          rawLine: item.raw,
          reason: `Transaksi ID #${item.transactionId} tidak ditemukan`,
        });
        continue;
      }

      const targetWallet = findWallet(item.walletName);
      if (!targetWallet) {
        failed.push({
          lineNumber: lineNum,
          rawLine: item.raw,
          reason: `Dompet '${item.walletName}' tidak ditemukan`,
        });
        continue;
      }

      try {
        await prisma.$transaction(async (db) => {
          // Rollback old impact
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

          // Apply new impact
          const delta = item.type === 'EXPENSE' ? -item.amount : item.amount;
          await db.wallet.update({
            where: { id: targetWallet.id },
            data: { balance: { increment: delta } },
          });

          // Update transaction record
          await db.transaction.update({
            where: { id: oldTx.id },
            data: {
              title: formatTransactionTitle(item.title),
              amount: item.amount,
              type: item.type,
              category: item.category,
              walletId: targetWallet.id,
              destinationWalletId: null,
              updatedAt: new Date(),
            },
          });
        });

        touchedWalletIds.add(oldTx.walletId);
        touchedWalletIds.add(targetWallet.id);

        const tw = await prisma.wallet.findUnique({ where: { id: targetWallet.id } });
        if (tw) targetWallet.balance = tw.balance;

        if (item.type === 'EXPENSE') {
          expenseCategoriesThisBatch.push({ category: item.category, amount: item.amount });
        }

        succeeded.push({
          id: item.transactionId,
          kind: 'UPDATE',
          title: formatTransactionTitle(item.title),
          type: item.type,
          walletName: targetWallet.name,
          amount: item.amount,
          category: item.category,
          rawLine: item.raw,
          lineNumber: lineNum,
        });
      } catch (err: any) {
        failed.push({
          lineNumber: lineNum,
          rawLine: item.raw,
          reason: err.message || 'Gagal memperbarui transaksi',
        });
      }
    }
  }

  // 4. Check budget limits for touched expense categories
  let budgetAlerts = '';
  if (expenseCategoriesThisBatch.length > 0) {
    const now = new Date();
    const budgets = await prisma.budgetLimit.findMany({
      where: {
        userId: user.id,
        startDate: { lte: now },
        endDate: { gte: now },
      },
    });

    for (const b of budgets) {
      if (
        expenseCategoriesThisBatch.some(
          (e) => e.category.toLowerCase() === b.category.toLowerCase()
        )
      ) {
        const agg = await prisma.transaction.aggregate({
          where: {
            userId: user.id,
            category: b.category,
            type: 'EXPENSE',
            date: { gte: b.startDate, lte: b.endDate },
          },
          _sum: { amount: true },
        });

        const totalSpent = agg._sum.amount || 0;
        const pct = b.monthlyLimit > 0 ? Math.round((totalSpent / b.monthlyLimit) * 100) : 0;

        if (pct >= 100) {
          budgetAlerts += `\n🚨 *Overbudget (${b.category}):* ${pct}% (${formatCurrency(totalSpent)} / ${formatCurrency(b.monthlyLimit)})`;
        } else if (pct >= 80) {
          budgetAlerts += `\n⚠️ *Peringatan Budget (${b.category}):* Sudah ${pct}% batas anggaran.`;
        }
      }
    }
  }

  // 5. Fetch updated wallets from DB for fresh balances
  const freshWallets = await prisma.wallet.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'asc' },
  });

  const walletStatusLines = freshWallets
    .filter((w) => touchedWalletIds.has(w.id))
    .map((w) => `• *${w.name}:* ${formatCurrency(w.balance)}`)
    .join('\n');

  // Multi-item summaries
  const multiSummaries = succeeded.map((item, idx) => {
    const isExpense = item.type === 'EXPENSE';
    const isIncome = item.type === 'INCOME';
    const isTransfer = item.type === 'TRANSFER';
    const sign = isExpense ? '-' : isIncome ? '+' : '';

    if (isTransfer) {
      return (
        `${idx + 1}. 🆔 *#${item.id}* 🔄 *[TRANSFER]* ${item.walletName} ➡️ ${item.destWalletName}\n` +
        `   Nominal: *${formatCurrency(item.amount)}*` +
        (item.notes ? ` (${item.notes})` : '')
      );
    }

    if (item.kind === 'DELETE') {
      return (
        `${idx + 1}. 🆔 *#${item.id}* 🗑️ *[HAPUS]* ${item.title}\n` +
        `   Dompet: *${item.walletName}* (${formatCurrency(item.amount)})`
      );
    }

    if (item.kind === 'UPDATE') {
      return (
        `${idx + 1}. 🆔 *#${item.id}* ✏️ *[UPDATE]* ${item.title}\n` +
        `   Dompet: *${item.walletName}* (${sign}${formatCurrency(item.amount)}) | Kategori: ${item.category}`
      );
    }

    return (
      `${idx + 1}. 🆔 *#${item.id}* ${isExpense ? '🔴' : '🟢'} *${item.title}*\n` +
      `   Dompet: ${item.walletName} (${sign}${formatCurrency(item.amount)}) | Kategori: ${item.category}`
    );
  });

  const failedLines = failed
    .map(
      (f) =>
        `• *Baris ${f.lineNumber}:* \`${f.rawLine}\`\n  ↳ _Alasan: ${f.reason}_`
    )
    .join('\n\n');

  // Kondisi A — Sebagian Berhasil & Sebagian Gagal
  if (succeeded.length > 0 && failed.length > 0) {
    let response =
      BOT_HEADER +
      `⚠️ *Berhasil memproses ${succeeded.length} transaksi, ${failed.length} gagal!*\n\n` +
      `${multiSummaries.join('\n\n')}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `❌ *Gagal Diproses (${failed.length} Baris):*\n` +
      `${failedLines}`;

    if (budgetAlerts) {
      response += `\n\n━━━━━━━━━━━━━━━━━━━━━${budgetAlerts}`;
    }

    if (walletStatusLines) {
      response +=
        `\n\n━━━━━━━━━━━━━━━━━━━━━\n` +
        `👛 *Status Saldo Dompet Terkait:*\n` +
        `${walletStatusLines}`;
    }

    response += BOT_FOOTER;
    return response;
  }

  // Kondisi B — Sukses Penuh
  if (succeeded.length > 0 && failed.length === 0) {
    // If single line input and exactly 1 succeeded
    if (parsedItems.length === 1 && succeeded.length === 1) {
      const item = succeeded[0];
      const isExpense = item.type === 'EXPENSE';
      const isIncome = item.type === 'INCOME';
      const isTransfer = item.type === 'TRANSFER';
      const wallet = freshWallets.find(
        (w) => w.name.toLowerCase() === item.walletName.toLowerCase()
      );

      if (isTransfer) {
        const destWallet = freshWallets.find(
          (w) => w.name.toLowerCase() === (item.destWalletName || '').toLowerCase()
        );
        return (
          `🤖 *[SakuKu - Berhasil Dicatat]*\n` +
          `🆔 *ID: #${item.id}*\n` +
          `📝 Transfer Antar Dompet\n` +
          `🔄 *${wallet?.name || item.walletName}* ➡️ *${destWallet?.name || item.destWalletName}*\n` +
          `💵 Nominal: ${formatCurrency(item.amount)}\n` +
          (item.notes ? `🗒️ Catatan: ${item.notes}\n` : '') +
          `━━━━━━━━━━━━━━━━━━━━━\n` +
          `*Sisa Saldo ${wallet?.name || item.walletName}:* ${formatCurrency(wallet?.balance || 0)}\n` +
          (destWallet ? `*Sisa Saldo ${destWallet.name}:* ${formatCurrency(destWallet.balance)}\n` : '') +
          (budgetAlerts ? `━━━━━━━━━━━━━━━━━━━━━${budgetAlerts}\n` : '') +
          BOT_FOOTER
        );
      }

      if (item.kind === 'DELETE') {
        return (
          `🤖 *[SakuKu - Transaksi Dihapus]*\n` +
          `🆔 *ID: #${item.id}*\n` +
          `📝 Transaksi: ${item.title}\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n` +
          `*Saldo Dompet Terkini:*\n` +
          `${walletStatusLines}` +
          BOT_FOOTER
        );
      }

      if (item.kind === 'UPDATE') {
        const sign = isExpense ? '-' : '+';
        return (
          `🤖 *[SakuKu - Transaksi Diperbarui]*\n` +
          `🆔 *ID: #${item.id}*\n` +
          `📝 Transaksi: ${item.title}\n` +
          `👛 Dompet: ${wallet?.name || item.walletName} (${sign}${formatCurrency(item.amount)})\n` +
          `🏷️ Kategori: ${item.category}\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n` +
          `*Sisa Saldo ${wallet?.name || item.walletName}:* ${formatCurrency(wallet?.balance || 0)}` +
          BOT_FOOTER
        );
      }

      const sign = isExpense ? '-' : '+';
      return (
        `🤖 *[SakuKu - Berhasil Dicatat]*\n` +
        `🆔 *ID: #${item.id}*\n` +
        `📝 Transaksi: ${item.title}\n` +
        `👛 Dompet: ${wallet?.name || item.walletName} (${sign}${formatCurrency(item.amount)})\n` +
        `🏷️ Kategori: ${item.category}\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `*Sisa Saldo ${wallet?.name || item.walletName}:* ${formatCurrency(wallet?.balance || 0)}\n` +
        (budgetAlerts ? `━━━━━━━━━━━━━━━━━━━━━${budgetAlerts}\n` : '') +
        BOT_FOOTER
      );
    }

    // Multi-line full success
    let response =
      BOT_HEADER +
      `✅ *Berhasil memproses ${succeeded.length} transaksi sekaligus!*\n\n` +
      `${multiSummaries.join('\n\n')}`;

    if (budgetAlerts) {
      response += `\n\n━━━━━━━━━━━━━━━━━━━━━${budgetAlerts}`;
    }

    if (walletStatusLines) {
      response +=
        `\n\n━━━━━━━━━━━━━━━━━━━━━\n` +
        `👛 *Status Saldo Dompet Terkait:*\n` +
        `${walletStatusLines}`;
    }

    response += BOT_FOOTER;
    return response;
  }

  // Kondisi C — Gagal Total
  if (failed.length === 1) {
    return (
      BOT_HEADER +
      `❌ *Gagal memproses transaksi:*\n` +
      `• *Baris ${failed[0].lineNumber}:* \`${failed[0].rawLine}\`\n` +
      `  ↳ _Alasan: ${failed[0].reason}_\n\n` +
      `Ketik */help* untuk melihat panduan format transaksi.` +
      BOT_FOOTER
    );
  }

  return (
    BOT_HEADER +
    `❌ *Semua transaksi gagal diproses (${failed.length} Baris):*\n\n` +
    `${failedLines}\n\n` +
    `Ketik */help* untuk melihat format panduan transaksi multi-baris.` +
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
        `• _catat | makan siang | bca | ex | 35k | Makanan_\n` +
        `• _catat | bonus proyek | jago | in | 500k | Gaji_\n` +
        `• _insert | gaji freelance | mandiri | income | 5jt | Gaji_\n` +
        `💡 _Alias TYPE: "in"/"masuk"/"income" (Pemasukan) & "ex"/"keluar"/"expense" (Pengeluaran)_\n\n` +
        `🔄 *Transfer Antar Dompet:*\n` +
        `\`tf | ASAL | TUJUAN | NOMINAL | [CATATAN]\`\n` +
        `• _tf | bca | gopay | 50k | top up mingguan_\n\n` +
        `🗑️ *Hapus Transaksi:*\n` +
        `\`hapus | ID\` atau \`delete | ID\`\n` +
        `• _hapus | 105_\n\n` +
        `✏️ *Update Transaksi:*\n` +
        `\`update | ID | JUDUL | DOMPET | TYPE | NOMINAL | [KATEGORI]\`\n` +
        `• _update | 105 | makan siang padang | bca | ex | 45k | Makanan_\n\n` +
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
      const { startOfDay, endOfDay } = getTodayRange();

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
      const { startOfMonth, endOfMonth } = getMonthRange();

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

      const monthName = startOfMonth.toLocaleString('id-ID', {
        month: 'long',
        year: 'numeric',
        timeZone: APP_TIMEZONE,
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
