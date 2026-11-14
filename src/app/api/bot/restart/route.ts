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

    // 1. Mark current bot status as RESTARTING so UI and Navbar immediately reflect the state
    await setDbBotStatus('RESTARTING', {
      phone: currentStatus?.phone,
      name: currentStatus?.name,
      disconnectReason: currentStatus?.disconnectReason || null,
    });

    const renderApiKey = process.env.RENDER_API_KEY;
    const renderServiceId = process.env.RENDER_WORKER_SERVICE_ID || process.env.RENDER_SERVICE_ID;

    // Method A: Direct Render REST API Call (100% identical to clicking "Restart Service" on Render dashboard)
    if (renderApiKey && renderServiceId) {
      try {
        const renderRes = await fetch(`https://api.render.com/v1/services/${renderServiceId}/restart`, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${renderApiKey}`,
          },
        });

        if (renderRes.ok) {
          console.log('✅ [RESTART] Layanan Render worker berhasil direstart melalui Render REST API.');
          return NextResponse.json({
            success: true,
            method: 'RENDER_API',
            message: 'Service restart triggered directly via Render official API',
          });
        } else {
          console.warn('⚠️ Render API restart returned status:', renderRes.status, await renderRes.text());
        }
      } catch (renderErr) {
        console.error('⚠️ Render API restart request error, falling back to database command:', renderErr);
      }
    }

    // Method B: Database Command Dispatcher (triggers clean shutdown + process.exit(1) on worker, prompting Render to spin up a fresh container)
    await setDbWorkerCommand('RESTART');

    return NextResponse.json({
      success: true,
      method: 'DB_COMMAND',
      message: 'Restart command dispatched to worker (container process restart)',
    });
  } catch (error: any) {
    console.error('Error dispatching restart command:', error);
    return NextResponse.json(
      { error: 'Gagal mengirim perintah restart: ' + error.message },
      { status: 500 }
    );
  }
}
