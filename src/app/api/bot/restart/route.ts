import { NextRequest, NextResponse } from 'next/server';
import { setDbWorkerCommand, setDbBotStatus, getDbBotStatus } from '@/bot/prisma-auth';

export const dynamic = 'force-dynamic';

function checkAuth(req: NextRequest): boolean {
  const adminSecret = process.env.ADMIN_SECRET_KEY;
  if (!adminSecret) return true; // If no secret configured, allow access

  const headerSecret = req.headers.get('x-admin-secret');
  const querySecret = req.nextUrl.searchParams.get('secret');
  const cookieSecret = req.cookies.get('sakuku_session')?.value;

  return headerSecret === adminSecret || querySecret === adminSecret || cookieSecret === adminSecret;
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json(
      { error: 'Unauthorized: Kunci rahasia admin (ADMIN_SECRET_KEY) tidak valid.' },
      { status: 401 }
    );
  }

  try {
    const currentStatus = await getDbBotStatus();

    // 1. Dispatch RESTART command to PostgreSQL for worker listener
    await setDbWorkerCommand('RESTART');

    // 2. Mark current bot status as RESTARTING so UI and Navbar immediately reflect the state
    await setDbBotStatus('RESTARTING', {
      phone: currentStatus?.phone,
      name: currentStatus?.name,
      disconnectReason: currentStatus?.disconnectReason || null,
    });

    return NextResponse.json({
      success: true,
      message: 'Restart command dispatched to worker',
    });
  } catch (error: any) {
    console.error('Error dispatching restart command:', error);
    return NextResponse.json(
      { error: 'Gagal mengirim perintah restart: ' + error.message },
      { status: 500 }
    );
  }
}
