import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveUser } from '@/lib/current-user';
import { formatTransactionTitle } from '@/lib/formatters';

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getActiveUser();
    const txId = parseInt(params.id, 10);

    if (isNaN(txId)) {
      return NextResponse.json({ error: 'ID transaksi tidak valid' }, { status: 400 });
    }

    // Find transaction to revert balance
    const tx = await prisma.transaction.findFirst({
      where: { id: txId, userId: user.id },
      include: { wallet: true, destinationWallet: true },
    });

    if (!tx) {
      return NextResponse.json({ error: 'Transaksi tidak ditemukan' }, { status: 404 });
    }

    // Revert balance based on transaction type inside transaction
    await prisma.$transaction(async (db) => {
      if (tx.type === 'EXPENSE') {
        await db.wallet.update({
          where: { id: tx.walletId },
          data: { balance: { increment: tx.amount } },
        });
      } else if (tx.type === 'INCOME') {
        await db.wallet.update({
          where: { id: tx.walletId },
          data: { balance: { decrement: tx.amount } },
        });
      } else if (tx.type === 'TRANSFER' && tx.destinationWalletId) {
        await db.wallet.update({
          where: { id: tx.walletId },
          data: { balance: { increment: tx.amount } },
        });
        await db.wallet.update({
          where: { id: tx.destinationWalletId },
          data: { balance: { decrement: tx.amount } },
        });
      }

      await db.transaction.delete({
        where: { id: txId },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getActiveUser();
    const txId = parseInt(params.id, 10);

    if (isNaN(txId)) {
      return NextResponse.json({ error: 'ID transaksi tidak valid' }, { status: 400 });
    }

    const body = await req.json();
    const { title, amount, type, category, walletId, destinationWalletId, notes, date } = body;

    if (!title || !amount || !type || !walletId) {
      return NextResponse.json(
        { error: 'Field title, amount, type, dan walletId wajib diisi.' },
        { status: 400 }
      );
    }

    const numAmount = Math.abs(parseFloat(amount));
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Nominal transaksi tidak valid.' }, { status: 400 });
    }

    // Find old transaction
    const oldTx = await prisma.transaction.findFirst({
      where: { id: txId, userId: user.id },
      include: { wallet: true, destinationWallet: true },
    });

    if (!oldTx) {
      return NextResponse.json({ error: 'Transaksi tidak ditemukan' }, { status: 404 });
    }

    // Validate new target wallet
    const newWallet = await prisma.wallet.findFirst({
      where: { id: walletId, userId: user.id },
    });
    if (!newWallet) {
      return NextResponse.json({ error: 'Dompet sumber tidak ditemukan.' }, { status: 404 });
    }

    if (type === 'TRANSFER') {
      if (!destinationWalletId) {
        return NextResponse.json({ error: 'Dompet tujuan transfer wajib dipilih.' }, { status: 400 });
      }
      if (destinationWalletId === walletId) {
        return NextResponse.json({ error: 'Dompet asal dan tujuan tidak boleh sama.' }, { status: 400 });
      }
      const newDestWallet = await prisma.wallet.findFirst({
        where: { id: destinationWalletId, userId: user.id },
      });
      if (!newDestWallet) {
        return NextResponse.json({ error: 'Dompet tujuan tidak ditemukan.' }, { status: 404 });
      }
    }

    // Execute atomic balance rollback + re-apply + transaction update
    const updated = await prisma.$transaction(async (db) => {
      // 1. Rollback old transaction impact
      if (oldTx.type === 'EXPENSE') {
        await db.wallet.update({
          where: { id: oldTx.walletId },
          data: { balance: { increment: oldTx.amount } },
        });
      } else if (oldTx.type === 'INCOME') {
        await db.wallet.update({
          where: { id: oldTx.walletId },
          data: { balance: { decrement: oldTx.amount } },
        });
      } else if (oldTx.type === 'TRANSFER' && oldTx.destinationWalletId) {
        await db.wallet.update({
          where: { id: oldTx.walletId },
          data: { balance: { increment: oldTx.amount } },
        });
        await db.wallet.update({
          where: { id: oldTx.destinationWalletId },
          data: { balance: { decrement: oldTx.amount } },
        });
      }

      // 2. Apply new transaction impact
      if (type === 'EXPENSE') {
        await db.wallet.update({
          where: { id: walletId },
          data: { balance: { decrement: numAmount } },
        });
      } else if (type === 'INCOME') {
        await db.wallet.update({
          where: { id: walletId },
          data: { balance: { increment: numAmount } },
        });
      } else if (type === 'TRANSFER' && destinationWalletId) {
        await db.wallet.update({
          where: { id: walletId },
          data: { balance: { decrement: numAmount } },
        });
        await db.wallet.update({
          where: { id: destinationWalletId },
          data: { balance: { increment: numAmount } },
        });
      }

      // 3. Update transaction record
      const updatedTx = await db.transaction.update({
        where: { id: txId },
        data: {
          title: formatTransactionTitle(title),
          amount: numAmount,
          type,
          category: category || (type === 'TRANSFER' ? 'Transfer Antar Dompet' : 'Lainnya'),
          walletId,
          destinationWalletId: type === 'TRANSFER' ? destinationWalletId : null,
          notes: notes !== undefined ? notes : oldTx.notes,
          date: date ? new Date(date) : oldTx.date,
          updatedAt: new Date(),
        },
        include: {
          wallet: true,
          destinationWallet: true,
        },
      });

      return updatedTx;
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
