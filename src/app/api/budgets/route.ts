import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveUser } from '@/lib/current-user';
import { getMonthRange } from '@/lib/timezone';
import { getBudgetsQuery } from '@/lib/dashboard-queries';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const user = await getActiveUser();
    const { searchParams } = new URL(req.url);

    const current = getMonthRange();
    const month = searchParams.get('month')
      ? parseInt(searchParams.get('month')!, 10)
      : current.month;
    const year = searchParams.get('year')
      ? parseInt(searchParams.get('year')!, 10)
      : current.year;

    const result = await getBudgetsQuery(user.id, month, year);
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

    const current = getMonthRange();
    const targetMonth = month || current.month;
    const targetYear = year || current.year;

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

export async function PUT(req: Request) {
  try {
    const user = await getActiveUser();
    const body = await req.json();
    const { id, monthlyLimit, category } = body;

    if (!monthlyLimit || parseFloat(monthlyLimit) <= 0) {
      return NextResponse.json({ error: 'Batas bulanan harus lebih dari 0' }, { status: 400 });
    }

    if (id) {
      const updated = await prisma.budgetLimit.update({
        where: { id, userId: user.id },
        data: { monthlyLimit: parseFloat(monthlyLimit) },
      });
      return NextResponse.json(updated);
    } else if (category) {
      const { month, year } = getMonthRange();
      const updated = await prisma.budgetLimit.update({
        where: {
          userId_category_month_year: {
            userId: user.id,
            category,
            month,
            year,
          },
        },
        data: { monthlyLimit: parseFloat(monthlyLimit) },
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: 'ID atau kategori budget diperlukan' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getActiveUser();
    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await req.json();
        id = body.id;
      } catch {}
    }

    if (!id) {
      return NextResponse.json({ error: 'ID budget diperlukan' }, { status: 400 });
    }

    await prisma.budgetLimit.delete({
      where: { id, userId: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
