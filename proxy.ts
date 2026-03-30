import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { ROUTE_PERMISSIONS } from '@/lib/rbac';
import type { SessionPayload } from '@/lib/auth';

const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? 'orqo-dev-secret-change-in-production'
);

// Paths that never require auth
const PUBLIC_PREFIXES = [
  '/login',
  '/api/auth',       // login, verify, logout, google OAuth
  '/api/public',
  '/_next',
  '/favicon',
];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Only gate /dashboard and /api
  if (!pathname.startsWith('/dashboard') && !pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  const token = req.cookies.get('orqo_session')?.value;

  if (!token) {
    return redirectToLogin(req, 'unauthenticated');
  }

  let session: SessionPayload;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    session = payload as unknown as SessionPayload;
  } catch {
    const res = redirectToLogin(req, 'expired');
    res.cookies.delete('orqo_session');
    return res;
  }

  // Route-level permission check — runs at Edge, no DB query
  for (const { pattern, permission } of ROUTE_PERMISSIONS) {
    if (pattern.test(pathname)) {
      if (!session.permissions.includes(permission)) {
        // Authenticated but unauthorized — redirect to dashboard root
        const url = req.nextUrl.clone();
        url.pathname = '/dashboard';
        url.searchParams.set('denied', permission);
        return NextResponse.redirect(url);
      }
      break; // first matching pattern wins (most-specific first)
    }
  }

  // Inject identity headers for server components / API routes
  const res = NextResponse.next();
  res.headers.set('x-orqo-user-id',    session.sub);
  res.headers.set('x-orqo-email',      session.email);
  res.headers.set('x-orqo-role',       session.role);
  res.headers.set('x-orqo-workspace',  session.workspaceId);
  return res;
}

function redirectToLogin(req: NextRequest, reason?: string) {
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = reason ? `?reason=${reason}` : '';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
};
