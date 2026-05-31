import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'jp_admin_session';

// Must match the function in /api/admin/login/route.ts exactly.
// crypto.subtle works in both Edge Runtime and Node.js — no Buffer needed.
async function deriveSessionToken(user: string, pass: string): Promise<string> {
  const data = new TextEncoder().encode(`jollof-admin:${user}:${pass}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function middleware(request: NextRequest) {
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

  // Check session cookie (set by /api/admin/login)
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (session) {
    const expected = await deriveSessionToken(adminUser, adminPass);
    if (session === expected) {
      return NextResponse.next();
    }
  }

  // Fallback: HTTP Basic Auth (for API/curl access)
  const authorization = request.headers.get('Authorization');
  if (authorization?.startsWith('Basic ')) {
    try {
      const decoded = atob(authorization.slice('Basic '.length));
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

  // Not authenticated — redirect to login
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('redirect', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/admin/:path*'],
};
