import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveUser } from '@/lib/current-user';
import { getMonthRange, getCustomDateRange, formatDateKey } from '@/lib/timezone';
import { getBudgetsQuery } from '@/lib/dashboard-queries';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const user = await getActiveUser();
    const result = await getBudgetsQuery(user.id);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getActiveUser();
    const body = await req.json();
    const { category, monthlyLimit, amount, startDate: rawStartDate, endDate: rawEndDate } = body;

    const limitVal = parseFloat(monthlyLimit !== undefined ? monthlyLimit : amount);
    if (!category || typeof category !== 'string' || !category.trim()) {
      return NextResponse.json(
        { error: user.language === 'en' ? 'Category is required.' : 'Kategori wajib dipilih.' },
        { status: 400 }
      );
    }

    if (isNaN(limitVal) || limitVal <= 0) {
      return NextResponse.json(
        { error: user.language === 'en' ? 'Budget limit must be greater than 0.' : 'Batas budget harus lebih dari 0.' },
        { status: 400 }
      );
    }

    // Default dates if not supplied (1st of current month to last of current month)
    const current = getMonthRange();
    const startDateStr = rawStartDate || formatDateKey(current.startOfMonth);
    const endDateStr = rawEndDate || formatDateKey(current.endOfMonth);

    if (startDateStr > endDateStr) {
      return NextResponse.json(
        { error: user.language === 'en' ? 'Start date cannot be after end date.' : 'Tanggal mulai tidak boleh lebih besar dari tanggal akhir.' },
        { status: 400 }
      );
    }

    const { start: newStartDate, end: newEndDate } = getCustomDateRange(startDateStr, endDateStr);

    // Anti-overlap check: existing.startDate <= newEndDate && existing.endDate >= newStartDate
    const overlapping = await prisma.budgetLimit.findFirst({
      where: {
        userId: user.id,
        category: category.trim(),
        startDate: { lte: newEndDate },
        endDate: { gte: newStartDate },
      },
    });

    if (overlapping) {
      return NextResponse.json(
        {
          error:
            user.language === 'en'
              ? 'Date range overlaps with an existing budget target for this category.'
              : 'Rentang tanggal bertabrakan dengan target budget yang sudah ada untuk kategori ini.',
        },
        { status: 400 }
      );
    }

    const budget = await prisma.budgetLimit.create({
      data: {
        userId: user.id,
        category: category.trim(),
        monthlyLimit: limitVal,
        startDate: newStartDate,
        endDate: newEndDate,
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
    const { id, category, monthlyLimit, amount, startDate: rawStartDate, endDate: rawEndDate } = body;

    if (!id) {
      return NextResponse.json(
        { error: user.language === 'en' ? 'Budget ID is required.' : 'ID budget diperlukan.' },
        { status: 400 }
      );
    }

    const existingBudget = await prisma.budgetLimit.findUnique({
      where: { id },
    });

    if (!existingBudget || existingBudget.userId !== user.id) {
      return NextResponse.json(
        { error: user.language === 'en' ? 'Budget target not found.' : 'Target budget tidak ditemukan.' },
        { status: 404 }
      );
    }

    const targetCategory = (category || existingBudget.category).trim();
    const limitVal = parseFloat(monthlyLimit !== undefined ? monthlyLimit : (amount !== undefined ? amount : existingBudget.monthlyLimit));

    if (isNaN(limitVal) || limitVal <= 0) {
      return NextResponse.json(
        { error: user.language === 'en' ? 'Budget limit must be greater than 0.' : 'Batas budget harus lebih dari 0.' },
        { status: 400 }
      );
    }

    const startDateStr = rawStartDate || formatDateKey(existingBudget.startDate);
    const endDateStr = rawEndDate || formatDateKey(existingBudget.endDate);

    if (startDateStr > endDateStr) {
      return NextResponse.json(
        { error: user.language === 'en' ? 'Start date cannot be after end date.' : 'Tanggal mulai tidak boleh lebih besar dari tanggal akhir.' },
        { status: 400 }
      );
    }

    const { start: newStartDate, end: newEndDate } = getCustomDateRange(startDateStr, endDateStr);

    // Anti-overlap check excluding current id
    const overlapping = await prisma.budgetLimit.findFirst({
      where: {
        userId: user.id,
        category: targetCategory,
        NOT: { id },
        startDate: { lte: newEndDate },
        endDate: { gte: newStartDate },
      },
    });

    if (overlapping) {
      return NextResponse.json(
        {
          error:
            user.language === 'en'
              ? 'Date range overlaps with an existing budget target for this category.'
              : 'Rentang tanggal bertabrakan dengan target budget yang sudah ada untuk kategori ini.',
        },
        { status: 400 }
      );
    }

    const updated = await prisma.budgetLimit.update({
      where: { id, userId: user.id },
      data: {
        category: targetCategory,
        monthlyLimit: limitVal,
        startDate: newStartDate,
        endDate: newEndDate,
      },
    });

    return NextResponse.json(updated);
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
      return NextResponse.json(
        { error: user.language === 'en' ? 'Budget ID is required.' : 'ID budget diperlukan.' },
        { status: 400 }
      );
    }

    await prisma.budgetLimit.delete({
      where: { id, userId: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
