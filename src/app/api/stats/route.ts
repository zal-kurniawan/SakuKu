import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveUser } from '@/lib/current-user';

export async function GET() {
  try {
    const user = await getActiveUser();

    // 1. Wallets & Total Net Worth
    const wallets = await prisma.wallet.findMany({
      where: { userId: user.id },
      orderBy: { balance: 'desc' },
    });

    const totalNetWorth = wallets.reduce((acc, w) => acc + w.balance, 0);

    // 2. Current Month Income & Expense
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const monthlyTxs = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        date: { gte: startOfMonth, lte: endOfMonth },
      },
    });

    let monthlyIncome = 0;
    let monthlyExpense = 0;

    monthlyTxs.forEach((tx) => {
      if (tx.type === 'INCOME') monthlyIncome += tx.amount;
      if (tx.type === 'EXPENSE') monthlyExpense += tx.amount;
    });

    const netSavings = monthlyIncome - monthlyExpense;
    const savingsRate =
      monthlyIncome > 0 ? Math.round((netSavings / monthlyIncome) * 100) : 0;

    // 3. Last 6 Months Cashflow Chart Data
    const cashflowHistory = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

      const txs = await prisma.transaction.findMany({
        where: {
          userId: user.id,
          date: { gte: mStart, lte: mEnd },
        },
      });

      let inc = 0;
      let exp = 0;
      txs.forEach((t) => {
        if (t.type === 'INCOME') inc += t.amount;
        if (t.type === 'EXPENSE') exp += t.amount;
      });

      const label = d.toLocaleString('id-ID', { month: 'short', year: '2-digit' });
      cashflowHistory.push({
        name: label,
        income: inc,
        expense: exp,
        net: inc - exp,
      });
    }

    // 4. Wallet Distribution for Pie Chart
    const walletDistribution = wallets.map((w) => ({
      name: w.name,
      value: Math.max(0, w.balance),
      color: w.colorCode,
      type: w.type,
    }));

    return NextResponse.json({
      totalNetWorth,
      monthlyIncome,
      monthlyExpense,
      netSavings,
      savingsRate,
      cashflowHistory,
      walletDistribution,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
