import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? 'orqo-dev-secret-change-in-production'
);

const PUBLIC = ['/login', '/api/auth'];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC.some(p => pathname.startsWith(p))) return NextResponse.next();

  // Only protect /dashboard and /api (except auth)
  if (!pathname.startsWith('/dashboard') && !pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  const token = req.cookies.get('orqo_session')?.value;

  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  try {
    await jwtVerify(token, SECRET);
    return NextResponse.next();
  } catch {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    const res = NextResponse.redirect(url);
    res.cookies.delete('orqo_session');
    return res;
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
};
