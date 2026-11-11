import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { getDbLiveQR, getDbBotStatus, setDbLiveQR, setDbBotStatus } from '@/bot/prisma-auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function checkAuth(req: NextRequest): boolean {
  const adminSecret = process.env.ADMIN_SECRET_KEY;
  if (!adminSecret) return true; // If no secret configured, allow access

  const headerSecret = req.headers.get('x-admin-secret');
  const querySecret = req.nextUrl.searchParams.get('secret');

  return headerSecret === adminSecret || querySecret === adminSecret;
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json(
      { error: 'Unauthorized: Kunci rahasia admin (ADMIN_SECRET_KEY) tidak valid.' },
      { status: 401 }
    );
  }

  try {
    const [qrRecord, statusRecord] = await Promise.all([
      getDbLiveQR(),
      getDbBotStatus(),
    ]);

    const status = statusRecord?.status || 'DISCONNECTED';
    let qrImageDataUrl: string | null = null;

    if (qrRecord?.qr && status === 'SCANNING_QR') {
      try {
        qrImageDataUrl = await QRCode.toDataURL(qrRecord.qr, {
          width: 380,
          margin: 2,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        });
      } catch (qrErr) {
        console.error('Failed to generate QR data URL:', qrErr);
      }
    }

    return NextResponse.json({
      success: true,
      status,
      connected: status === 'CONNECTED',
      qrImage: qrImageDataUrl,
      rawQr: qrRecord?.qr || null,
      phone: statusRecord?.phone || null,
      name: statusRecord?.name || 'SakuKu Bot',
      updatedAt: qrRecord?.updatedAt || statusRecord?.updatedAt || new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching bot QR status:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil status bot: ' + error.message },
      { status: 500 }
    );
  }
}

// Reset WhatsApp Session (Logout)
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json(
      { error: 'Unauthorized: Kunci rahasia admin tidak valid.' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    if (body.action === 'reset') {
      // Clear whatsapp sessions from DB
      await prisma.whatsAppSession.deleteMany({});
      await setDbBotStatus('DISCONNECTED');
      await setDbLiveQR(null);

      return NextResponse.json({
        success: true,
        message: 'Sesi WhatsApp berhasil direset. Silakan muat ulang worker bot untuk memicu QR code baru.',
      });
    }

    return NextResponse.json({ error: 'Action tidak dikenal' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Gagal mereset sesi bot: ' + error.message },
      { status: 500 }
    );
  }
}
