import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveUser } from '@/lib/current-user';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const user = await getActiveUser();
    const { searchParams } = new URL(req.url);
    const now = new Date();
    const currentYear = now.getFullYear();

    // 1. Available years
    const txDates = await prisma.transaction.findMany({
      where: { userId: user.id },
      select: { date: true },
      orderBy: { date: 'asc' },
    });

    const yearsSet = new Set<number>();
    yearsSet.add(currentYear);
    txDates.forEach((tx) => {
      yearsSet.add(new Date(tx.date).getFullYear());
    });
    const availableYears = Array.from(yearsSet).sort((a, b) => b - a);

    // 2. Fetch current wallets
    const wallets = await prisma.wallet.findMany({
      where: { userId: user.id },
      orderBy: { balance: 'desc' },
    });

    const monthParam = searchParams.get('month'); // 'current' or '1'..'12'
    const yearParam = searchParams.get('year'); // e.g. '2026'

    // If "current" mode or parameters not set, return live balances
    if (!monthParam || monthParam === 'current' || !yearParam) {
      const distribution = wallets.map((w) => ({
        id: w.id,
        name: w.name,
        value: Math.max(0, w.balance),
        color: w.colorCode || '#3B82F6',
        type: w.type,
      }));

      return NextResponse.json({
        availableYears,
        isHistorical: false,
        wallets: distribution,
      });
    }

    // Historical calculation
    const targetMonth = parseInt(monthParam, 10); // 1-12
    const targetYear = parseInt(yearParam, 10);

    // End date of the selected month
    const endOfMonth = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    // Fetch transactions occurring strictly AFTER the selected month-end
    const subsequentTxs = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        date: { gt: endOfMonth },
      },
    });

    // Create a mutable balance map initialized with current wallet balance
    const balanceMap: { [walletId: string]: number } = {};
    wallets.forEach((w) => {
      balanceMap[w.id] = w.balance;
    });

    // Rollback every subsequent transaction to calculate balance as of endOfMonth
    subsequentTxs.forEach((tx) => {
      if (tx.type === 'EXPENSE') {
        // Was subtracted, so add back
        if (balanceMap[tx.walletId] !== undefined) {
          balanceMap[tx.walletId] += tx.amount;
        }
      } else if (tx.type === 'INCOME') {
        // Was added, so subtract
        if (balanceMap[tx.walletId] !== undefined) {
          balanceMap[tx.walletId] -= tx.amount;
        }
      } else if (tx.type === 'TRANSFER') {
        // Source wallet was subtracted, so add back
        if (balanceMap[tx.walletId] !== undefined) {
          balanceMap[tx.walletId] += tx.amount;
        }
        // Destination wallet was added, so subtract
        if (tx.destinationWalletId && balanceMap[tx.destinationWalletId] !== undefined) {
          balanceMap[tx.destinationWalletId] -= tx.amount;
        }
      }
    });

    const historicalDistribution = wallets.map((w) => ({
      id: w.id,
      name: w.name,
      value: Math.max(0, balanceMap[w.id] ?? 0),
      color: w.colorCode || '#3B82F6',
      type: w.type,
    }));

    return NextResponse.json({
      availableYears,
      isHistorical: true,
      selectedMonth: targetMonth,
      selectedYear: targetYear,
      wallets: historicalDistribution,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
