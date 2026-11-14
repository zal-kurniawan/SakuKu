import { NextRequest, NextResponse } from 'next/server';
import { getActiveUser } from '@/lib/current-user';
import {
  getWalletsQuery,
  getStatsQuery,
  getCashflowQuery,
  getWalletHistoryQuery,
  getBudgetsQuery,
  getTransactionsQuery,
} from '@/lib/dashboard-queries';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function checkAuth(req: NextRequest): boolean {
  const adminSecret = process.env.ADMIN_SECRET_KEY;
  if (!adminSecret) return true; // If no secret configured, allow access

  const headerSecret = req.headers.get('x-admin-secret');
  const querySecret = req.nextUrl.searchParams.get('secret');
  const cookieSecret = req.cookies.get('sakuku_session')?.value;

  return (
    headerSecret === adminSecret ||
    querySecret === adminSecret ||
    cookieSecret === adminSecret
  );
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json(
      { error: 'Unauthorized: Sesi tidak valid atau kunci admin salah' },
      { status: 401 }
    );
  }

  try {
    const user = await getActiveUser();
    const { searchParams } = req.nextUrl;

    const yearParam = searchParams.get('year')
      ? parseInt(searchParams.get('year')!, 10)
      : undefined;
    const txLimit = searchParams.get('txLimit')
      ? parseInt(searchParams.get('txLimit')!, 10)
      : 50;
    const txPage = searchParams.get('txPage')
      ? parseInt(searchParams.get('txPage')!, 10)
      : 1;

    // Parallel execution in 1 single connection/request
    const [wallets, stats, cashflow, walletHistory, budgets, transactions] =
      await Promise.all([
        getWalletsQuery(user.id),
        getStatsQuery(user.id),
        getCashflowQuery(user.id, yearParam),
        getWalletHistoryQuery(user.id, 'current', null),
        getBudgetsQuery(user.id),
        getTransactionsQuery(user.id, { page: txPage, limit: txLimit }),
      ]);

    return NextResponse.json({
      wallets,
      stats,
      cashflow,
      walletHistory,
      budgets,
      transactions,
    });
  } catch (error: any) {
    console.error('API DASHBOARD ERROR:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
