import { SignJWT, jwtVerify } from 'jose';
import { cookies, headers } from 'next/headers';
import { randomUUID } from 'crypto';
import { getDb } from '@/lib/mongodb';
import { getDefaultWorkspaceId, readHostFromHeaders, resolveWorkspaceFromHost } from '@/lib/tenant';
import { DEFAULT_CLIENT_ID, DEFAULT_CLIENT_NAME, getWorkspaceClient } from '@/lib/clients';

const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? 'orqo-dev-secret-change-in-production'
);

export const COOKIE = 'orqo_session';
export const ACTIVE_WORKSPACE_COOKIE = 'orqo_active_workspace';
export const SESSION_DAYS = 1;

export type AuthProvider = 'magic_link' | 'google';

export type SessionPayload = {
  sub: string;          // userId (_id.toString())
  email: string;
  name: string;
  avatar?: string;
  workspaceId: string;
  clientId: string;
  clientName: string;
  role: string;         // role slug e.g. 'owner', 'admin', 'analyst'
  permissions: string[]; // embedded snapshot — no DB lookup in middleware
  isGlobalUser: boolean;
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
  const requestedWorkspaceId = String(jar.get(ACTIVE_WORKSPACE_COOKIE)?.value ?? '').trim();

  const session = await verifySession(token);
  if (!session) return null;

  if (typeof session.isGlobalUser !== 'boolean') {
    session.isGlobalUser = false;
  }
  if (!session.clientId) {
    session.clientId = DEFAULT_CLIENT_ID;
  }
  if (!session.clientName) {
    session.clientName = DEFAULT_CLIENT_NAME;
  }

  try {
    const reqHeaders = await headers();
    const host = readHostFromHeaders(reqHeaders);
    const db = await getDb();
    const tenant = await resolveWorkspaceFromHost(db, host);
    const isSharedLoginHost =
      tenant?.workspaceId === getDefaultWorkspaceId() &&
      ['default_host', 'local', 'fallback'].includes(String(tenant?.source ?? ''));

    if (!tenant) return null;
    if (tenant.workspaceId !== session.workspaceId && !session.isGlobalUser && !isSharedLoginHost) {
      return null;
    }

    const effectiveWorkspaceId = session.isGlobalUser && requestedWorkspaceId
      ? requestedWorkspaceId
      : session.workspaceId;

    const workspaceDoc = await db.collection('workspaces').findOne(
      { _id: effectiveWorkspaceId as any },
      { projection: { _id: 1 } }
    );

    if (workspaceDoc?._id) {
      session.workspaceId = String(workspaceDoc._id);
      const workspaceClient = await getWorkspaceClient(db, session.workspaceId);
      session.clientId = workspaceClient.clientId;
      session.clientName = workspaceClient.clientName;
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
    clientId: user.clientId ?? DEFAULT_CLIENT_ID,
    clientName: user.clientName ?? DEFAULT_CLIENT_NAME,
    role: user.role ?? 'viewer',
    permissions,
    isGlobalUser: Boolean(user.isGlobalUser),
    jti: randomUUID(),
    provider,
  };
}
