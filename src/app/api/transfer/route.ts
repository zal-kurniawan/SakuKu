import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveUser } from '@/lib/current-user';

export async function POST(req: Request) {
  try {
    const user = await getActiveUser();
    const body = await req.json();
    const { fromWalletId, toWalletId, amount, notes, date } = body;

    if (!fromWalletId || !toWalletId || !amount) {
      return NextResponse.json(
        { error: 'Dompet asal, dompet tujuan, dan nominal transfer wajib diisi.' },
        { status: 400 }
      );
    }

    if (fromWalletId === toWalletId) {
      return NextResponse.json(
        { error: 'Dompet asal dan tujuan tidak boleh sama.' },
        { status: 400 }
      );
    }

    const numAmount = Math.abs(parseFloat(amount));

    let transactionDate = new Date();
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const now = new Date();
      const timePart = now.toTimeString().slice(0, 8);
      const parsed = new Date(`${date}T${timePart}+07:00`);
      if (!Number.isNaN(parsed.getTime())) {
        transactionDate = parsed;
      }
    }

    const fromWallet = await prisma.wallet.findFirst({
      where: { id: fromWalletId, userId: user.id },
    });
    const toWallet = await prisma.wallet.findFirst({
      where: { id: toWalletId, userId: user.id },
    });

    if (!fromWallet || !toWallet) {
      return NextResponse.json({ error: 'Salah satu dompet tidak ditemukan.' }, { status: 404 });
    }

    // Atomic execution
    const [tx, updatedFrom, updatedTo] = await prisma.$transaction([
      prisma.transaction.create({
        data: {
          userId: user.id,
          walletId: fromWallet.id,
          destinationWalletId: toWallet.id,
          title: notes || `Transfer ${fromWallet.name} -> ${toWallet.name}`,
          amount: numAmount,
          type: 'TRANSFER',
          category: 'Transfer Antar Dompet',
          notes,
          source: 'WEB',
          date: transactionDate,
        },
      }),
      prisma.wallet.update({
        where: { id: fromWallet.id },
        data: { balance: fromWallet.balance - numAmount },
      }),
      prisma.wallet.update({
        where: { id: toWallet.id },
        data: { balance: toWallet.balance + numAmount },
      }),
    ]);

    return NextResponse.json({
      success: true,
      transaction: tx,
      fromWallet: updatedFrom,
      toWallet: updatedTo,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
