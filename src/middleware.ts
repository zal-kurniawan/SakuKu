import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /import routes when feature flag is disabled
  if (pathname.startsWith('/import')) {
    const isExcelImportEnabled =
      process.env.NEXT_PUBLIC_ENABLE_EXCEL_IMPORT === 'true' ||
      process.env.ENABLE_EXCEL_IMPORT === 'true';

    if (!isExcelImportEnabled) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/import/:path*'],
};
