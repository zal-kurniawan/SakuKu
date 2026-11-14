import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveUser } from '@/lib/current-user';
import { formatTransactionTitle } from '@/lib/formatters';
import { getTransactionsQuery } from '@/lib/dashboard-queries';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const user = await getActiveUser();
    const { searchParams } = new URL(req.url);

    const walletId = searchParams.get('walletId');
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;

    const result = await getTransactionsQuery(user.id, {
      walletId,
      type,
      category,
      search,
      dateFrom,
      dateTo,
      page,
      limit,
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
    const { title, amount, type, category, walletId, notes, date } = body;

    if (!title || !amount || !type || !walletId) {
      return NextResponse.json(
        { error: 'Field title, amount, type, dan walletId wajib diisi.' },
        { status: 400 }
      );
    }

    const numAmount = Math.abs(parseFloat(amount));
    const wallet = await prisma.wallet.findFirst({
      where: { id: walletId, userId: user.id },
    });

    if (!wallet) {
      return NextResponse.json({ error: 'Dompet tidak ditemukan.' }, { status: 404 });
    }

    const newBalance =
      type === 'EXPENSE'
        ? wallet.balance - numAmount
        : wallet.balance + numAmount;

    const [tx, updatedWallet] = await prisma.$transaction([
      prisma.transaction.create({
        data: {
          userId: user.id,
          title: formatTransactionTitle(title),
          amount: numAmount,
          type,
          category: category || 'Lainnya',
          walletId,
          notes,
          source: 'WEB',
          date: date ? new Date(date) : new Date(),
        },
      }),
      prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: newBalance },
      }),
    ]);

    return NextResponse.json(tx, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
