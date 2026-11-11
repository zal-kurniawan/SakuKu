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
    const month = parseInt(searchParams.get('month') || String(now.getMonth() + 1), 10);
    const year = parseInt(searchParams.get('year') || String(now.getFullYear()), 10);

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    // Fetch budget limits
    const budgets = await prisma.budgetLimit.findMany({
      where: { userId: user.id, month, year },
    });

    // Fetch actual expenses per category this month
    const expenseGroups = await prisma.transaction.groupBy({
      by: ['category'],
      where: {
        userId: user.id,
        type: 'EXPENSE',
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: { amount: true },
    });

    const expenseMap = new Map<string, number>();
    expenseGroups.forEach((eg) => {
      expenseMap.set(eg.category, eg._sum.amount || 0);
    });

    // Merge budgets with spent amount
    const result = budgets.map((b) => {
      const spent = expenseMap.get(b.category) || 0;
      const percentage = b.monthlyLimit > 0 ? (spent / b.monthlyLimit) * 100 : 0;
      let status: 'SAFE' | 'WARNING' | 'DANGER' = 'SAFE';
      if (percentage >= 100) status = 'DANGER';
      else if (percentage >= 75) status = 'WARNING';

      return {
        id: b.id,
        category: b.category,
        monthlyLimit: b.monthlyLimit,
        spent,
        remaining: Math.max(0, b.monthlyLimit - spent),
        percentage: Math.round(percentage),
        status,
        month: b.month,
        year: b.year,
      };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getActiveUser();
    const body = await req.json();
    const { category, monthlyLimit, month, year } = body;

    const now = new Date();
    const targetMonth = month || now.getMonth() + 1;
    const targetYear = year || now.getFullYear();

    const budget = await prisma.budgetLimit.upsert({
      where: {
        userId_category_month_year: {
          userId: user.id,
          category,
          month: targetMonth,
          year: targetYear,
        },
      },
      update: {
        monthlyLimit: parseFloat(monthlyLimit),
      },
      create: {
        userId: user.id,
        category,
        monthlyLimit: parseFloat(monthlyLimit),
        month: targetMonth,
        year: targetYear,
      },
    });

    return NextResponse.json(budget);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
