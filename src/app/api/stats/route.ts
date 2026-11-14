import { NextResponse } from 'next/server';
import { getActiveUser } from '@/lib/current-user';
import { getStatsQuery } from '@/lib/dashboard-queries';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const user = await getActiveUser();
    const stats = await getStatsQuery(user.id);
    return NextResponse.json(stats);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
