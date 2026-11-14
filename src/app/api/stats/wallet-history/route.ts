import { NextResponse } from 'next/server';
import { getActiveUser } from '@/lib/current-user';
import { getWalletHistoryQuery } from '@/lib/dashboard-queries';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const user = await getActiveUser();
    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get('month'); // 'current' or '1'..'12'
    const yearParam = searchParams.get('year'); // e.g. '2026'

    const result = await getWalletHistoryQuery(user.id, monthParam, yearParam);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
