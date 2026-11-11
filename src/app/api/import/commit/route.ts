import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveUser } from '@/lib/current-user';
import { CleanedTransactionItem, DetectedWallet, InitialBalanceItem } from '@/lib/excel-parser';

export async function POST(req: Request) {
  try {
    const user = await getActiveUser();
    const body = await req.json();

    const {
      transactions = [],
      detectedWallets = [],
      initialBalances = [],
      clearExisting = false,
    } = body as {
      transactions: CleanedTransactionItem[];
      detectedWallets: DetectedWallet[];
      initialBalances: InitialBalanceItem[];
      clearExisting?: boolean;
    };

    if (!transactions.length) {
      return NextResponse.json(
        { error: 'Tidak ada data transaksi yang dapat disimpan.' },
        { status: 400 }
      );
    }

    // 1. Optional: Clear existing transactions if requested
    if (clearExisting) {
      await prisma.transaction.deleteMany({
        where: { userId: user.id },
      });
    }

    // 2. Fetch or create all required wallets
    const existingWallets = await prisma.wallet.findMany({
      where: { userId: user.id },
    });

    const walletMap = new Map<string, { id: string; balance: number; name: string }>();
    existingWallets.forEach((w) => {
      walletMap.set(w.name.trim().toLowerCase(), {
        id: w.id,
        balance: clearExisting ? 0 : w.balance,
        name: w.name,
      });
    });

    // Ensure all detected wallets exist in DB
    for (const dw of detectedWallets) {
      const key = dw.name.trim().toLowerCase();
      if (!walletMap.has(key)) {
        const created = await prisma.wallet.create({
          data: {
            userId: user.id,
            name: dw.name,
            type: dw.type,
            balance: 0,
            colorCode: dw.colorCode,
          },
        });
        walletMap.set(key, { id: created.id, balance: 0, name: created.name });
      }
    }

    // Fallback wallet if somehow a transaction's wallet wasn't detected
    let fallbackWallet: { id: string; balance: number; name: string } | undefined =
      Array.from(walletMap.values())[0];

    if (!fallbackWallet) {
      const createdFallback = await prisma.wallet.create({
        data: {
          userId: user.id,
          name: 'CASH',
          type: 'CASH',
          balance: 0,
          colorCode: '#10B981',
        },
      });
      fallbackWallet = { id: createdFallback.id, balance: 0, name: createdFallback.name };
      walletMap.set('cash', fallbackWallet);
    }

    // 3. Prepare wallet balance tracker and transactions
    const runningBalances = new Map<string, number>();
    walletMap.forEach((val, key) => {
      runningBalances.set(key, val.balance);
    });

    // Format all transaction payloads
    const preparedPayloads: any[] = [];

    for (const item of transactions) {
      const sourceKey = item.walletName.trim().toLowerCase();
      let sourceWallet = walletMap.get(sourceKey);

      if (!sourceWallet) {
        // Auto-create on the fly if needed
        const newW = await prisma.wallet.create({
          data: {
            userId: user.id,
            name: item.walletName.toUpperCase(),
            type: 'BANK',
            balance: 0,
            colorCode: '#3B82F6',
          },
        });
        sourceWallet = { id: newW.id, balance: 0, name: newW.name };
        walletMap.set(sourceKey, sourceWallet);
        runningBalances.set(sourceKey, 0);
      }

      let destWalletId: string | null = null;
      if (item.type === 'TRANSFER' && item.destinationWalletName) {
        const destKey = item.destinationWalletName.trim().toLowerCase();
        let destWallet = walletMap.get(destKey);
        if (!destWallet) {
          const newW = await prisma.wallet.create({
            data: {
              userId: user.id,
              name: item.destinationWalletName.toUpperCase(),
              type: 'BANK',
              balance: 0,
              colorCode: '#3B82F6',
            },
          });
          destWallet = { id: newW.id, balance: 0, name: newW.name };
          walletMap.set(destKey, destWallet);
          runningBalances.set(destKey, 0);
        }
        destWalletId = destWallet.id;
      }

      // Update running balance
      const currentSrcBalance = runningBalances.get(sourceKey) || 0;
      if (item.type === 'INCOME') {
        runningBalances.set(sourceKey, currentSrcBalance + item.amount);
      } else if (item.type === 'EXPENSE') {
        runningBalances.set(sourceKey, currentSrcBalance - item.amount);
      } else if (item.type === 'TRANSFER' && destWalletId) {
        runningBalances.set(sourceKey, currentSrcBalance - item.amount);
        const destKey = item.destinationWalletName!.trim().toLowerCase();
        const currentDestBalance = runningBalances.get(destKey) || 0;
        runningBalances.set(destKey, currentDestBalance + item.amount);
      }

      preparedPayloads.push({
        userId: user.id,
        title: item.title,
        amount: item.amount,
        type: item.type,
        category: item.category,
        walletId: sourceWallet.id,
        destinationWalletId: destWalletId,
        notes: item.notes || null,
        source: 'WEB',
        date: new Date(item.date),
      });
    }

    // 4. Batch Insertion in chunks of 250
    const CHUNK_SIZE = 250;
    const totalChunks = Math.ceil(preparedPayloads.length / CHUNK_SIZE);
    let insertedCount = 0;

    for (let c = 0; c < totalChunks; c++) {
      const chunk = preparedPayloads.slice(c * CHUNK_SIZE, (c + 1) * CHUNK_SIZE);

      await prisma.$transaction(async (tx) => {
        await tx.transaction.createMany({
          data: chunk,
        });
      });

      insertedCount += chunk.length;
    }

    // 5. Update final balances on all touched wallets
    await prisma.$transaction(async (tx) => {
      for (const [key, wallet] of walletMap.entries()) {
        const finalBalance = runningBalances.get(key);
        if (finalBalance !== undefined) {
          await tx.wallet.update({
            where: { id: wallet.id },
            data: { balance: finalBalance },
          });
        }
      }
    });

    return NextResponse.json({
      success: true,
      importedCount: insertedCount,
      walletsCount: walletMap.size,
      message: `Berhasil mengimpor ${insertedCount} transaksi ke dalam sistem SakuKu.`,
    });
  } catch (error: any) {
    console.error('Error committing bulk import:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal menyimpan transaksi bulk ke database.' },
      { status: 500 }
    );
  }
}
