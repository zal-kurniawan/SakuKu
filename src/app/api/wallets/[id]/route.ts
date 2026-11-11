import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveUser } from '@/lib/current-user';

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
    await prisma.wallet.deleteMany({
      where: { id: params.id, userId: user.id },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
