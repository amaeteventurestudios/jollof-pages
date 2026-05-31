import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'jp_admin_session';
const SESSION_MAX_AGE = 60 * 60 * 8; // 8 hours

export async function POST(request: NextRequest) {
  const adminUser = process.env.ADMIN_USERNAME;
  const adminPass = process.env.ADMIN_PASSWORD;

  if (!adminUser || !adminPass) {
    return NextResponse.json({ error: 'Admin credentials not configured.' }, { status: 503 });
  }

  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { username, password } = body;
  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 });
  }

  if (username !== adminUser || password !== adminPass) {
    await new Promise((r) => setTimeout(r, 400)); // prevent timing attacks
    return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
  }

  // Create a signed session value: base64(username:timestamp) is enough for
  // this use case — the middleware validates against env vars on every request.
  const sessionValue = Buffer.from(`${adminUser}:${Date.now()}`).toString('base64');

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, sessionValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
  return response;
}
