import { NextRequest, NextResponse } from 'next/server';

// Admin routes are protected with HTTP Basic Auth using
// ADMIN_USERNAME and ADMIN_PASSWORD environment variables.
// These are server-only env vars and are never exposed to the client.
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  const adminUser = process.env.ADMIN_USERNAME;
  const adminPass = process.env.ADMIN_PASSWORD;

  // If env vars are not configured, block access entirely in production
  if (!adminUser || !adminPass) {
    if (process.env.NODE_ENV === 'production') {
      return new NextResponse('Admin credentials not configured', { status: 503 });
    }
    // In development allow access so local dev without .env.local still works
    return NextResponse.next();
  }

  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Basic ')) {
    return challengeResponse();
  }

  const base64 = authorization.slice('Basic '.length);
  let decoded: string;
  try {
    decoded = atob(base64);
  } catch {
    return challengeResponse();
  }

  const colonIdx = decoded.indexOf(':');
  if (colonIdx === -1) return challengeResponse();

  const user = decoded.slice(0, colonIdx);
  const pass = decoded.slice(colonIdx + 1);

  if (user !== adminUser || pass !== adminPass) {
    return challengeResponse();
  }

  return NextResponse.next();
}

function challengeResponse(): NextResponse {
  return new NextResponse('Unauthorized', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Jollof Pages Admin", charset="UTF-8"',
    },
  });
}

export const config = {
  matcher: ['/admin/:path*'],
};
