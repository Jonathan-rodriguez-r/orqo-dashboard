import { SignJWT, jwtVerify } from 'jose';
import { cookies, headers } from 'next/headers';
import { randomUUID } from 'crypto';
import { getDb } from '@/lib/mongodb';
import { readHostFromHeaders, resolveWorkspaceFromHost } from '@/lib/tenant';

const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? 'orqo-dev-secret-change-in-production'
);

export const COOKIE = 'orqo_session';
export const SESSION_DAYS = 1;

export type AuthProvider = 'magic_link' | 'google';

export type SessionPayload = {
  sub: string;          // userId (_id.toString())
  email: string;
  name: string;
  avatar?: string;
  workspaceId: string;
  role: string;         // role slug e.g. 'owner', 'admin', 'analyst'
  permissions: string[]; // embedded snapshot — no DB lookup in middleware
  jti: string;          // JWT ID for session tracking / future revocation
  provider: AuthProvider;
};

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setJti(payload.jti)
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(SECRET);
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  const session = await verifySession(token);
  if (!session) return null;

  try {
    const reqHeaders = await headers();
    const host = readHostFromHeaders(reqHeaders);
    const db = await getDb();
    const tenant = await resolveWorkspaceFromHost(db, host);

    if (!tenant) return null;
    if (tenant.workspaceId !== session.workspaceId) {
      return null;
    }
  } catch {
    // If request headers are unavailable (non-request execution), keep JWT session fallback.
  }

  return session;
}

/** Build a fresh SessionPayload from a DB user document + role permissions */
export function buildSessionPayload(
  user: Record<string, any>,
  permissions: string[],
  provider: AuthProvider
): SessionPayload {
  return {
    sub: user._id.toString(),
    email: user.email,
    name: user.name ?? user.email.split('@')[0],
    avatar: user.avatar,
    workspaceId: user.workspaceId ?? 'default',
    role: user.role ?? 'viewer',
    permissions,
    jti: randomUUID(),
    provider,
  };
}
