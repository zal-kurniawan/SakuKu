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
    const { monthlyLimit } = body;

    if (!monthlyLimit || parseFloat(monthlyLimit) <= 0) {
      return NextResponse.json({ error: 'Batas bulanan harus lebih dari 0' }, { status: 400 });
    }

    const updated = await prisma.budgetLimit.update({
      where: { id: params.id, userId: user.id },
      data: { monthlyLimit: parseFloat(monthlyLimit) },
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
