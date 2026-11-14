import { NextResponse } from 'next/server';
import { getActiveUser } from '@/lib/current-user';
import { getCashflowQuery } from '@/lib/dashboard-queries';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const user = await getActiveUser();
    const { searchParams } = new URL(req.url);
    const yearParam = searchParams.get('year')
      ? parseInt(searchParams.get('year')!, 10)
      : undefined;

    const result = await getCashflowQuery(user.id, yearParam);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
