import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import { cookies } from 'next/headers';
import { prisma } from './prisma';

export const COOKIE_NAME = 'sakuku_session';
export const IDLE_TIMEOUT_SECONDS = 3 * 24 * 60 * 60; // 3 Days Idle (Sliding)
export const ABSOLUTE_TIMEOUT_SECONDS = 7 * 24 * 60 * 60; // 7 Days Absolute Maximum

function getJwtSecret(): Uint8Array {
  const secret =
    process.env.JWT_SECRET ||
    'sakuku-default-jwt-secret-min-32-chars-long-development!';
  return new TextEncoder().encode(secret);
}

export interface SessionPayload extends JWTPayload {
  userId: string;
  phoneNumber: string;
  authMethod: 'WA_OTP' | 'TOTP';
  absoluteExp: number; // Unix timestamp in seconds
}

/**
 * Creates a signed JWT session token with 3-day idle / 7-day absolute constraints
 */
export async function createSessionToken(
  authMethod: 'WA_OTP' | 'TOTP',
  userId: string = 'owner',
  phoneNumber: string = process.env.MY_PHONE_NUMBER || '628563006136'
): Promise<{ token: string; maxAge: number; absoluteExp: number }> {
  const now = Math.floor(Date.now() / 1000);
  const absoluteExp = now + ABSOLUTE_TIMEOUT_SECONDS;
  const initialMaxAge = Math.min(IDLE_TIMEOUT_SECONDS, ABSOLUTE_TIMEOUT_SECONDS);

  const token = await new SignJWT({
    userId,
    phoneNumber,
    authMethod,
    absoluteExp,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(absoluteExp) // JWT valid until absolute max
    .sign(getJwtSecret());

  return { token, maxAge: initialMaxAge, absoluteExp };
}

/**
 * Verifies a session JWT token and enforces absolute expiration
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
 * Standard cookie configuration for SakuKu session
 */
export function getSessionCookieOptions(maxAge: number) {
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
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
