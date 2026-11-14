import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { sendWhatsAppNotification } from '@/lib/whatsapp-notify';
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
        { error: 'Format kode OTP harus 6 digit angka.', errorCode: 'INVALID_FORMAT' },
        { status: 400 }
      );
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const rawUa = req.headers.get('user-agent') || '';
    const deviceSummary = formatDeviceSummary(rawUa);
    const now = new Date();

    // 1. Fetch the latest active OTP record
    const latestOtp = await prisma.authOtp.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (!latestOtp || latestOtp.isUsed) {
      return NextResponse.json(
        {
          error: 'Tidak ada kode OTP aktif. Silakan minta kode baru.',
          errorCode: 'NO_ACTIVE_OTP',
        },
        { status: 400 }
      );
    }

    // 2. Check if currently locked
    if (latestOtp.lockedUntil && latestOtp.lockedUntil > now) {
      const retryAfterSeconds = Math.ceil((latestOtp.lockedUntil.getTime() - now.getTime()) / 1000);
      return NextResponse.json(
        {
          error: 'Akses login terkunci selama 15 menit akibat terlalu banyak kesalahan.',
          errorCode: 'LOCKED',
          retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    // 3. Check expiration
    if (latestOtp.expiresAt < now) {
      return NextResponse.json(
        {
          error: 'Kode OTP telah kedaluwarsa (berlaku 3 menit). Silakan minta kode baru.',
          errorCode: 'EXPIRED',
        },
        { status: 400 }
      );
    }

    // 4. Verify SHA-256 Hash
    const inputHash = crypto.createHash('sha256').update(code).digest('hex');
    const isMatch = crypto.timingSafeEqual(
      Buffer.from(inputHash, 'hex'),
      Buffer.from(latestOtp.codeHash, 'hex')
    );

    if (!isMatch) {
      const newAttempts = latestOtp.attempts + 1;

      if (newAttempts >= 5) {
        const lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        await prisma.authOtp.update({
          where: { id: latestOtp.id },
          data: {
            attempts: newAttempts,
            lockedUntil,
          },
        });

        const timeWib = new Date().toLocaleString('id-ID', {
          timeZone: 'Asia/Jakarta',
          dateStyle: 'full',
          timeStyle: 'medium',
        });

        // Send Critical Security Alert to Owner via WhatsApp
        const alertMsg =
`🚨 *[PERINGATAN KEAMANAN SAKUKU]*

Terdeteksi *5x percobaan login gagal* (salah memasukkan kode OTP) pada dashboard web SakuKu!

• Waktu: ${timeWib} WIB
• IP Address: ${ip}
• Perangkat: ${deviceSummary}
• Tindakan: Akses login otomatis dikunci selama *15 menit*.`;

        sendWhatsAppNotification(alertMsg).catch((err) =>
          console.error('Failed to send lockout alert to WhatsApp:', err)
        );

        return NextResponse.json(
          {
            error: 'Terlalu banyak percobaan salah. Login dikunci selama 15 menit.',
            errorCode: 'LOCKED_NOW',
            retryAfterSeconds: 900,
          },
          { status: 429 }
        );
      } else {
        await prisma.authOtp.update({
          where: { id: latestOtp.id },
          data: { attempts: newAttempts },
        });

        const remaining = 5 - newAttempts;
        return NextResponse.json(
          {
            error: `Kode OTP salah. Sisa kesempatan: ${remaining} kali.`,
            errorCode: 'INVALID_OTP',
            remainingAttempts: remaining,
          },
          { status: 401 }
        );
      }
    }

    // 5. Verification Successful
    await prisma.authOtp.update({
      where: { id: latestOtp.id },
      data: { isUsed: true },
    });

    // Create Smart Session Token (3 days idle, 7 days absolute)
    const ownerPhone = process.env.MY_PHONE_NUMBER || '628563006136';
    const { token, maxAge } = await createSessionToken('WA_OTP', 'owner', ownerPhone);

    const response = NextResponse.json({
      success: true,
      message: 'Autentikasi berhasil. Selamat datang di SakuKu!',
    });

    // Set cookie sakuku_session
    const cookieOptions = getSessionCookieOptions(maxAge);
    response.cookies.set(cookieOptions.name, token, cookieOptions);

    return response;
  } catch (error: any) {
    console.error('Error in verify-otp:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error', errorCode: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
