import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import { cookies } from 'next/headers';
import { prisma } from './prisma';
import { getNextJakartaMidnight } from './timezone';

export const COOKIE_NAME = 'sakuku_session';

function getJwtSecret(): Uint8Array {
  const secret =
    process.env.JWT_SECRET ||
    'sakuku-default-jwt-secret-min-32-chars-long-development!';
  return new TextEncoder().encode(secret);
}

export interface SessionPayload extends JWTPayload {
  userId: string;
  phoneNumber: string;
  authMethod: 'TOTP' | string;
  absoluteExp: number; // Unix timestamp in seconds (00:00:00 Asia/Jakarta)
}

/**
 * Creates a signed JWT session token with fixed expiration at next 00:00:00 Asia/Jakarta.
 * Non-sliding session: expires strictly at midnight Jakarta time.
 */
export async function createSessionToken(
  authMethod: string = 'TOTP',
  userId: string = 'owner',
  phoneNumber: string = process.env.MY_PHONE_NUMBER || '628563006136'
): Promise<{ token: string; maxAge: number; expiresAt: Date; absoluteExp: number }> {
  const now = new Date();
  const nowSec = Math.floor(now.getTime() / 1000);
  const expiresAt = getNextJakartaMidnight(now);
  const absoluteExp = Math.floor(expiresAt.getTime() / 1000);
  const maxAge = Math.max(1, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));

  const token = await new SignJWT({
    userId,
    phoneNumber,
    authMethod,
    role: 'owner',
    absoluteExp,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(nowSec)
    .setExpirationTime(absoluteExp) // Token expires strictly at 00:00:00 Asia/Jakarta
    .sign(getJwtSecret());

  return { token, maxAge, expiresAt, absoluteExp };
}

/**
 * Verifies a session JWT token and enforces 00:00:00 Jakarta expiration
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    const sessionPayload = payload as unknown as SessionPayload;

    const now = Math.floor(Date.now() / 1000);
    if (!sessionPayload.absoluteExp || sessionPayload.absoluteExp <= now) {
      return null;
    }

    return sessionPayload;
  } catch {
    return null;
  }
}

/**
 * Standard cookie configuration for SakuKu session (fixed Jakarta midnight expiration)
 */
export function getSessionCookieOptions(expiresOrMaxAge?: Date | number, maxAgeSeconds?: number) {
  let expires: Date;
  let maxAge: number;

  if (expiresOrMaxAge instanceof Date) {
    expires = expiresOrMaxAge;
    maxAge = maxAgeSeconds !== undefined ? maxAgeSeconds : Math.max(1, Math.floor((expires.getTime() - Date.now()) / 1000));
  } else if (typeof expiresOrMaxAge === 'number') {
    maxAge = expiresOrMaxAge;
    expires = getNextJakartaMidnight();
  } else {
    expires = getNextJakartaMidnight();
    maxAge = Math.max(1, Math.floor((expires.getTime() - Date.now()) / 1000));
  }

  return {
    name: COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    expires,
    maxAge,
  };
}

/**
 * Server-side guard for Server Actions & Server Components.
 * Throws an Error if no valid authenticated owner session is found.
 */
export async function requireOwnerSession(): Promise<{ user: any; session: SessionPayload }> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    throw new Error('Unauthorized: Sesi tidak ditemukan. Silakan login kembali.');
  }

  const session = await verifySessionToken(token);
  if (!session) {
    throw new Error('Unauthorized: Sesi telah kedaluwarsa atau tidak sah.');
  }

  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        phoneNumber: session.phoneNumber,
        name: 'Owner',
        language: 'id',
      },
    });
  }

  return { user, session };
}

/**
 * Non-throwing helper to retrieve the current session user if authenticated
 */
export async function getSessionUser(): Promise<SessionPayload | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}
