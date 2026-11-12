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

    // 1. Get all available years from transactions for this user
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

    // Selected year (defaults to current year)
    const selectedYear = parseInt(searchParams.get('year') || String(currentYear), 10);

    // 2. Fetch full 12 months (Jan–Dec) data for the selected year
    const startOfYear = new Date(selectedYear, 0, 1, 0, 0, 0, 0);
    const endOfYear = new Date(selectedYear, 11, 31, 23, 59, 59, 999);

    const yearTxs = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        date: { gte: startOfYear, lte: endOfYear },
      },
    });

    const monthData = Array.from({ length: 12 }, (_, monthIdx) => {
      let income = 0;
      let expense = 0;

      yearTxs.forEach((tx) => {
        const txDate = new Date(tx.date);
        if (txDate.getMonth() === monthIdx) {
          if (tx.type === 'INCOME') income += tx.amount;
          if (tx.type === 'EXPENSE') expense += tx.amount;
        }
      });

      return {
        month: monthIdx + 1,
        income,
        expense,
        net: income - expense,
      };
    });

    return NextResponse.json({
      availableYears,
      selectedYear,
      months: monthData,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
