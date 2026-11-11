import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveUser } from '@/lib/current-user';

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getActiveUser();

    // Find transaction to revert balance
    const tx = await prisma.transaction.findFirst({
      where: { id: params.id, userId: user.id },
      include: { wallet: true, destinationWallet: true },
    });

    if (!tx) {
      return NextResponse.json({ error: 'Transaksi tidak ditemukan' }, { status: 404 });
    }

    // Revert balance based on transaction type
    if (tx.type === 'EXPENSE') {
      await prisma.wallet.update({
        where: { id: tx.walletId },
        data: { balance: { increment: tx.amount } },
      });
    } else if (tx.type === 'INCOME') {
      await prisma.wallet.update({
        where: { id: tx.walletId },
        data: { balance: { decrement: tx.amount } },
      });
    } else if (tx.type === 'TRANSFER' && tx.destinationWalletId) {
      await prisma.wallet.update({
        where: { id: tx.walletId },
        data: { balance: { increment: tx.amount } },
      });
      await prisma.wallet.update({
        where: { id: tx.destinationWalletId },
        data: { balance: { decrement: tx.amount } },
      });
    }

    await prisma.transaction.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
