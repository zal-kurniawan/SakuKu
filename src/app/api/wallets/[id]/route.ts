import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveUser } from '@/lib/current-user';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getActiveUser();
    const body = await req.json();
    const { name, type, balance, colorCode } = body;

    const updated = await prisma.wallet.updateMany({
      where: { id: params.id, userId: user.id },
      data: {
        ...(name && { name: name.trim().toUpperCase() }),
        ...(type && { type }),
        ...(balance !== undefined && { balance: parseFloat(balance) }),
        ...(colorCode && { colorCode }),
      },
    });

    return NextResponse.json({ success: true, count: updated.count });
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

    // 1. Delete associated transactions where this wallet is source
    await prisma.transaction.deleteMany({
      where: { walletId: params.id, userId: user.id },
    });

    // 2. Clear destination references
    await prisma.transaction.updateMany({
      where: { destinationWalletId: params.id, userId: user.id },
      data: { destinationWalletId: null },
    });

    // 3. Delete the wallet
    await prisma.wallet.deleteMany({
      where: { id: params.id, userId: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
