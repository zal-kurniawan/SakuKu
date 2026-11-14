import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveUser } from '@/lib/current-user';
import { getCustomDateRange, formatDateKey } from '@/lib/timezone';

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getActiveUser();
    const body = await req.json();
    const { category, monthlyLimit, amount, startDate: rawStartDate, endDate: rawEndDate } = body;

    const existingBudget = await prisma.budgetLimit.findUnique({
      where: { id: params.id },
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

    // Anti-overlap check
    const overlapping = await prisma.budgetLimit.findFirst({
      where: {
        userId: user.id,
        category: targetCategory,
        NOT: { id: params.id },
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
      where: { id: params.id, userId: user.id },
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

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getActiveUser();

    await prisma.budgetLimit.delete({
      where: { id: params.id, userId: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
