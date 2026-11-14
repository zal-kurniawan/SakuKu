import { NextResponse } from 'next/server';
import { getDbBotStatus } from '@/bot/prisma-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Public channel status endpoint
 * Checks if WhatsApp Bot engine is available and if offline TOTP is configured
 */
export async function GET() {
  try {
    const statusRecord = await getDbBotStatus();
    const waAvailable = statusRecord?.status === 'CONNECTED';
    const totpConfigured = Boolean(process.env.TOTP_SECRET && process.env.TOTP_SECRET.trim().length > 0);

    return NextResponse.json({
      waAvailable,
      totpConfigured,
    });
  } catch (error: any) {
    console.error('Error checking auth channel status:', error);
    return NextResponse.json({
      waAvailable: false,
      totpConfigured: Boolean(process.env.TOTP_SECRET),
    });
  }
}
