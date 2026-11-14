import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveUser } from '@/lib/current-user';
import { getWalletsQuery } from '@/lib/dashboard-queries';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const user = await getActiveUser();
    const wallets = await getWalletsQuery(user.id);
    return NextResponse.json(wallets);
  } catch (error: any) {
    console.error('API WALLETS ERROR STACK:', error.stack || error);
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getActiveUser();
    const body = await req.json();
    const { name, type, balance, colorCode } = body;

    if (!name) {
      return NextResponse.json({ error: 'Nama dompet wajib diisi' }, { status: 400 });
    }

    const wallet = await prisma.wallet.create({
      data: {
        userId: user.id,
        name: name.trim().toUpperCase(),
        type: type || 'BANK',
        balance: parseFloat(balance) || 0,
        colorCode: colorCode || '#3B82F6',
      },
    });

    return NextResponse.json(wallet, { status: 201 });
  } catch (error: any) {
    console.error('API WALLETS ERROR STACK:', error.stack || error);
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}
