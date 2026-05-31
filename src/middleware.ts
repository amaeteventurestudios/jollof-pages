import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'jp_admin_session';

// Admin routes are protected. Access is granted via:
// 1. A valid session cookie set by /api/admin/login (custom login page)
// 2. HTTP Basic Auth header (ADMIN_USERNAME / ADMIN_PASSWORD env vars)
//    kept as fallback for API/curl access.
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  const adminUser = process.env.ADMIN_USERNAME;
  const adminPass = process.env.ADMIN_PASSWORD;

  if (!adminUser || !adminPass) {
    if (process.env.NODE_ENV === 'production') {
      return new NextResponse('Admin credentials not configured', { status: 503 });
    }
    return NextResponse.next();
  }

  // Check session cookie first (set by the custom login page)
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (session) {
    try {
      const decoded = Buffer.from(session, 'base64url').toString('utf8');
      const colonIdx = decoded.indexOf(':');
      if (colonIdx !== -1) {
        const sessionUser = decoded.slice(0, colonIdx);
        if (sessionUser === adminUser) {
          return NextResponse.next();
        }
      }
    } catch {
      // fall through to Basic Auth check
    }
  }

  // Fall back to HTTP Basic Auth
  const authorization = request.headers.get('Authorization');
  if (authorization?.startsWith('Basic ')) {
    const base64 = authorization.slice('Basic '.length);
    try {
      const decoded = atob(base64);
      const colonIdx = decoded.indexOf(':');
      if (colonIdx !== -1) {
        const user = decoded.slice(0, colonIdx);
        const pass = decoded.slice(colonIdx + 1);
        if (user === adminUser && pass === adminPass) {
          return NextResponse.next();
        }
      }
    } catch {
      // fall through
    }
  }

  // Not authenticated — redirect to custom login page
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('redirect', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/admin/:path*'],
};
