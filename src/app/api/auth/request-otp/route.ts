import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { getDbBotStatus } from '@/bot/prisma-auth';
import { sendWhatsAppNotification } from '@/lib/whatsapp-notify';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST() {
  try {
    const now = new Date();

    // 1. Self-Cleaning: Delete stale records (isUsed or expired, but keep actively locked ones)
    try {
      await prisma.authOtp.deleteMany({
        where: {
          OR: [
            { isUsed: true },
            { expiresAt: { lt: now } },
          ],
          AND: {
            OR: [
              { lockedUntil: null },
              { lockedUntil: { lt: now } },
            ],
          },
        },
      });
    } catch (cleanErr) {
      console.warn('⚠️ [AUTH OTP] Error cleaning old OTP records:', cleanErr);
    }

    // 2. Check the most recent AuthOtp record for lockouts and cooldowns
    const latestOtp = await prisma.authOtp.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (latestOtp) {
      // Check if locked due to 5x failed attempts (15-minute lock)
      if (latestOtp.lockedUntil && latestOtp.lockedUntil > now) {
        const retryAfterSeconds = Math.ceil((latestOtp.lockedUntil.getTime() - now.getTime()) / 1000);
        return NextResponse.json(
          {
            error: 'Akun terkunci sementara karena 5x kesalahan OTP.',
            errorCode: 'LOCKED',
            retryAfterSeconds,
          },
          { status: 429 }
        );
      }

      // Check 60-second cooldown between requests
      const elapsedMs = now.getTime() - latestOtp.createdAt.getTime();
      const COOLDOWN_MS = 60 * 1000;
      if (elapsedMs < COOLDOWN_MS && !latestOtp.isUsed) {
        const retryAfterSeconds = Math.ceil((COOLDOWN_MS - elapsedMs) / 1000);
        return NextResponse.json(
          {
            error: 'Mohon tunggu sebelum meminta kode OTP baru.',
            errorCode: 'COOLDOWN',
            retryAfterSeconds,
          },
          { status: 429 }
        );
      }
    }

    // 3. Verify that WhatsApp Bot is online
    const botStatus = await getDbBotStatus();
    if (botStatus?.status !== 'CONNECTED') {
      return NextResponse.json(
        {
          error: 'WhatsApp Bot sedang offline. Gunakan Google Authenticator sebagai pemulihan.',
          errorCode: 'WA_UNAVAILABLE',
        },
        { status: 503 }
      );
    }

    // 4. Generate 6-digit cryptographic OTP & SHA-256 hash
    const otpCode = crypto.randomInt(100000, 1000000).toString();
    const codeHash = crypto.createHash('sha256').update(otpCode).digest('hex');
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes validity

    // Format message
    const message =
`🔐 *[SakuKu Security - Kode Login]*

Kode OTP akses dashboard Anda:
*${otpCode}*

Berlaku selama *3 menit*.
⚠️ Jangan bagikan kode ini kepada siapa pun.`;

    // 5. Send OTP via WhatsApp Bridge
    const sendResult = await sendWhatsAppNotification(message);
    if (!sendResult.success) {
      return NextResponse.json(
        {
          error: 'Gagal mengirim pesan WhatsApp. WhatsApp Bot mungkin terputus.',
          errorCode: 'WA_UNAVAILABLE',
        },
        { status: 503 }
      );
    }

    // 6. Save OTP record to database
    await prisma.authOtp.create({
      data: {
        codeHash,
        expiresAt,
        attempts: 0,
        isUsed: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Kode OTP telah berhasil dikirim ke WhatsApp Anda.',
      expiresInSeconds: 180,
    });
  } catch (error: any) {
    console.error('Error in request-otp:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error', errorCode: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
