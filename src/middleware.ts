import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE_NAME = 'sakuku_session';
const IDLE_TIMEOUT_SECONDS = 3 * 24 * 60 * 60; // 3 Days Idle

function getJwtSecret(): Uint8Array {
  const secret =
    process.env.JWT_SECRET ||
    'sakuku-default-jwt-secret-min-32-chars-long-development!';
  return new TextEncoder().encode(secret);
}

// Public routes that never require authentication
const PUBLIC_PATHS = [
  '/login',
  '/unauthorized',
  '/forbidden',
  '/api/auth/channel-status',
  '/api/auth/request-otp',
  '/api/auth/verify-otp',
  '/api/auth/verify-totp',
  '/api/health',
  '/health',
  '/robots.txt',
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Allow Static Assets & Favicons
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/health') ||
    pathname === '/favicon.ico' ||
    pathname === '/icon.svg' ||
    pathname === '/icon.png' ||
    pathname === '/apple-icon.png' ||
    pathname === '/apple-icon.svg' ||
    pathname === '/apple-touch-icon.png' ||
    pathname === '/robots.txt'
  ) {
    return NextResponse.next();
  }

  // 2. Check for Feature Flag: Excel Import (/import and /api/import/*)
  if (pathname.startsWith('/import') || pathname.startsWith('/api/import')) {
    const isExcelImportEnabled =
      process.env.NEXT_PUBLIC_ENABLE_EXCEL_IMPORT === 'true' ||
      process.env.ENABLE_EXCEL_IMPORT === 'true';

    if (!isExcelImportEnabled) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Forbidden: Fitur impor Excel dinonaktifkan oleh administrator.' },
          { status: 403 }
        );
      }
      return NextResponse.rewrite(new URL('/forbidden', req.url), { status: 403 });
    }
  }

  // 3. Allow Explicit Error View Pages
  if (pathname === '/unauthorized' || pathname === '/forbidden') {
    return NextResponse.next();
  }

  // 4. Session Token Extraction
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const isPublicRoute = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  let verifiedPayload: any = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, getJwtSecret());
      const nowSec = Math.floor(Date.now() / 1000);
      if (payload.absoluteExp && Number(payload.absoluteExp) > nowSec) {
        verifiedPayload = payload;
      }
    } catch {
      verifiedPayload = null;
    }
  }

  // 5. If User is Already Authenticated and visits /login -> Redirect to Dashboard (/)
  if (pathname === '/login') {
    if (verifiedPayload) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }

  // 6. Allow Public Auth Endpoints
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // 7. Protected Routes Check (All Dashboard pages & All APIs)
  if (!verifiedPayload) {
    // A. API Requests -> HTTP 401 JSON
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized: Sesi tidak ditemukan atau telah kedaluwarsa.', errorCode: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // B. Web Page Requests without Cookie -> Redirect to /login
    if (!token) {
      const loginUrl = new URL('/login', req.url);
      return NextResponse.redirect(loginUrl);
    }

    // C. Web Page Requests with Invalid / Expired Cookie -> Rewrite to Custom 401 Error Page
    return NextResponse.rewrite(new URL('/unauthorized', req.url), { status: 401 });
  }

  // 8. Sliding Idle Refresh (Extends cookie maxAge without database query)
  const response = NextResponse.next();
  const nowSec = Math.floor(Date.now() / 1000);
  const remainingAbsolute = Number(verifiedPayload.absoluteExp) - nowSec;
  const newMaxAge = Math.min(IDLE_TIMEOUT_SECONDS, remainingAbsolute);

  if (newMaxAge > 0 && token) {
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: newMaxAge,
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
