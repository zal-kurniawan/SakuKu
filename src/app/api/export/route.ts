import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveUser } from '@/lib/current-user';

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

    if (dateFrom || dateTo) {
      whereClause.date = {};
      if (dateFrom) {
        whereClause.date.gte = new Date(`${dateFrom}T00:00:00.000Z`);
      }
      if (dateTo) {
        whereClause.date.lte = new Date(`${dateTo}T23:59:59.999Z`);
      }
    }

    if (search) {
      whereClause.title = {
        contains: search,
        mode: 'insensitive',
      };
    }

    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      include: { wallet: true, destinationWallet: true },
      orderBy: { date: 'desc' },
    });

    const headers = [
      'ID',
      'Tanggal',
      'Judul',
      'Tipe',
      'Nominal',
      'Kategori',
      'Dompet Asal',
      'Dompet Tujuan',
      'Sumber',
      'Catatan',
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = transactions.map((t) => [
      escapeCsv(t.id),
      escapeCsv(new Date(t.date).toISOString().split('T')[0]),
      escapeCsv(t.title),
      escapeCsv(t.type),
      escapeCsv(t.amount),
      escapeCsv(t.category),
      escapeCsv(t.wallet?.name || ''),
      escapeCsv(t.destinationWallet?.name || ''),
      escapeCsv(t.source),
      escapeCsv(t.notes || ''),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join(
      '\r\n'
    );

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="transactions_${new Date()
          .toISOString()
          .slice(0, 10)}.csv"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
