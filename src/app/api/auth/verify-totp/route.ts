import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDbBotStatus } from '@/bot/prisma-auth';
import { verifyTotp } from '@/lib/totp';
import { createSessionToken, getSessionCookieOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function formatDeviceSummary(ua: string): string {
  if (!ua) return 'Perangkat Tidak Dikenal';
  if (ua.includes('iPhone')) return 'iPhone (Safari Mobile)';
  if (ua.includes('Android')) return 'Android Mobile';
  if (ua.includes('Macintosh')) return 'macOS Desktop';
  if (ua.includes('Windows')) return 'Windows Desktop';
  if (ua.includes('Linux')) return 'Linux Desktop';
  return ua.slice(0, 50);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const code = typeof body.code === 'string' ? body.code.trim() : '';

    if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: 'Format kode TOTP harus 6 digit angka.', errorCode: 'INVALID_FORMAT' },
        { status: 400 }
      );
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const rawUa = req.headers.get('user-agent') || '';
    const deviceSummary = formatDeviceSummary(rawUa);
    const now = new Date();

    // 1. Strict Backend Guard: Disallow TOTP while WhatsApp Bot is ONLINE
    const botStatus = await getDbBotStatus();
    if (botStatus?.status === 'CONNECTED') {
      return NextResponse.json(
        {
          error:
            'WhatsApp Bot sedang online normal. Pemulihan offline TOTP (Google Authenticator) dinonaktifkan demi kepatuhan keamanan.',
          errorCode: 'WA_BOT_ONLINE',
        },
        { status: 403 }
      );
    }

    // 2. Fetch or create AuthSecurityState singleton
    let secState = await prisma.authSecurityState.findUnique({
      where: { id: 'singleton' },
    });

    if (!secState) {
      secState = await prisma.authSecurityState.create({
        data: { id: 'singleton' },
      });
    }

    // 3. Check if currently locked
    if (secState.totpLockedUntil && secState.totpLockedUntil > now) {
      const retryAfterSeconds = Math.ceil((secState.totpLockedUntil.getTime() - now.getTime()) / 1000);
      return NextResponse.json(
        {
          error: 'Akses pemulihan TOTP terkunci selama 15 menit akibat terlalu banyak kesalahan.',
          errorCode: 'LOCKED',
          retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    // 4. Verify TOTP Secret configuration
    const totpSecret = process.env.TOTP_SECRET;
    if (!totpSecret) {
      return NextResponse.json(
        {
          error: 'TOTP_SECRET belum dikonfigurasi di server. Jalankan "npm run auth:setup-totp".',
          errorCode: 'TOTP_NOT_CONFIGURED',
        },
        { status: 500 }
      );
    }

    // 5. Verify TOTP Code (with Anti-Replay and +/- 30s tolerance)
    const result = verifyTotp(code, totpSecret, secState.lastUsedTotpStep);

    if (!result.valid) {
      const newAttempts = secState.totpAttempts + 1;
      const timeWib = new Date().toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        dateStyle: 'full',
        timeStyle: 'medium',
      });

      if (newAttempts >= 5) {
        const lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        const alertMsg =
`🚨 *[PERINGATAN KEAMANAN SAKUKU]*

Terdeteksi *5x percobaan login TOTP gagal* pada dashboard web SakuKu saat WhatsApp Bot offline!

• Waktu: ${timeWib} WIB
• IP Address: ${ip}
• Perangkat: ${deviceSummary}
• Tindakan: Akses TOTP otomatis dikunci selama *15 menit*.`;

        await prisma.authSecurityState.update({
          where: { id: 'singleton' },
          data: {
            totpAttempts: newAttempts,
            totpLockedUntil: lockedUntil,
            pendingSecurityAlert: alertMsg,
          },
        });

        return NextResponse.json(
          {
            error: 'Terlalu banyak percobaan salah. Pemulihan TOTP dikunci selama 15 menit.',
            errorCode: 'LOCKED_NOW',
            retryAfterSeconds: 900,
          },
          { status: 429 }
        );
      } else {
        await prisma.authSecurityState.update({
          where: { id: 'singleton' },
          data: { totpAttempts: newAttempts },
        });

        const remaining = 5 - newAttempts;
        const errMsg =
          result.error === 'REPLAYED'
            ? `Kode TOTP ini sudah pernah digunakan. Mohon tunggu kode berikutnya di aplikasi Authenticator.`
            : `Kode Authenticator salah. Sisa kesempatan: ${remaining} kali.`;

        return NextResponse.json(
          {
            error: errMsg,
            errorCode: result.error === 'REPLAYED' ? 'TOTP_REPLAYED' : 'INVALID_TOTP',
            remainingAttempts: remaining,
          },
          { status: 401 }
        );
      }
    }

    // 6. TOTP Verification Successful
    const timeWib = new Date().toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      dateStyle: 'full',
      timeStyle: 'medium',
    });

    const auditMessage =
`🛡️ *[LOG PEMULIHAN AKSES SAKUKU]*

Login darurat menggunakan *Google Authenticator (TOTP)* berhasil dilakukan saat WhatsApp Bot offline.

• Waktu: ${timeWib} WIB
• IP Address: ${ip}
• Perangkat: ${deviceSummary}`;

    await prisma.authSecurityState.update({
      where: { id: 'singleton' },
      data: {
        totpAttempts: 0,
        totpLockedUntil: null,
        lastUsedTotpStep: result.step,
        pendingSecurityAlert: auditMessage,
      },
    });

    // Create Smart Session Token (3 days idle, 7 days absolute)
    const ownerPhone = process.env.MY_PHONE_NUMBER || '628563006136';
    const { token, maxAge } = await createSessionToken('TOTP', 'owner', ownerPhone);

    const response = NextResponse.json({
      success: true,
      recoveryMode: true,
      message: 'Pemulihan akses darurat berhasil! Anda akan diarahkan ke dashboard.',
    });

    // Set cookie sakuku_session
    const cookieOptions = getSessionCookieOptions(maxAge);
    response.cookies.set(cookieOptions.name, token, cookieOptions);

    return response;
  } catch (error: any) {
    console.error('Error in verify-totp:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error', errorCode: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
