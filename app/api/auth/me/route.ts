import { getSession } from '@/lib/auth';

/**
 * GET /api/auth/me
 * Returns the current session identity for client components.
 * Lightweight — reads JWT from cookie, no DB query.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: 'Unauthenticated' }, { status: 401 });
  }
  return Response.json({
    email:       session.email,
    name:        session.name,
    avatar:      session.avatar,
    workspaceId: session.workspaceId,
    clientId:    session.clientId,
    clientName:  session.clientName,
    role:        session.role,
    permissions: session.permissions,
    isGlobalUser: session.isGlobalUser,
    provider:    session.provider,
  });
}
