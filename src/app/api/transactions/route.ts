import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveUser } from '@/lib/current-user';
import { formatTransactionTitle } from '@/lib/formatters';

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
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const whereClause: any = {
      userId: user.id,
    };

    if (walletId && walletId !== 'all') {
      whereClause.OR = [{ walletId }, { destinationWalletId: walletId }];
    }

    if (type && type !== 'all') {
      whereClause.type = type;
    }

    if (category && category !== 'all') {
      whereClause.category = category;
    }

    if (search) {
      whereClause.title = {
        contains: search,
        mode: 'insensitive',
      };
    }

    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      include: {
        wallet: true,
        destinationWallet: true,
      },
      orderBy: { date: 'desc' },
      take: limit,
    });

    return NextResponse.json(transactions);
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
