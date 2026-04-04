import { cookies } from 'next/headers';
import { getDb } from '@/lib/mongodb';
import { ACTIVE_WORKSPACE_COOKIE, getSession, SESSION_DAYS } from '@/lib/auth';
import { canAccessProtectedRoles } from '@/lib/access-control';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canAccessProtectedRoles(session)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const workspaceId = String(body?.workspaceId ?? '').trim();
  if (!workspaceId) {
    return Response.json({ error: 'workspaceId requerido' }, { status: 400 });
  }

  const db = await getDb();
  const workspace = await db.collection('workspaces').findOne(
    { _id: workspaceId as any },
    { projection: { _id: 1, name: 1, clientId: 1, clientName: 1 } }
  );

  if (!workspace?._id) {
    return Response.json({ error: 'Workspace no encontrado' }, { status: 404 });
  }

  const jar = await cookies();
  jar.set(ACTIVE_WORKSPACE_COOKIE, String(workspace._id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * SESSION_DAYS,
  });

  return Response.json({
    ok: true,
    workspaceId: String(workspace._id),
    workspaceName: String(workspace.name ?? workspace._id),
    clientId: String(workspace.clientId ?? ''),
    clientName: String(workspace.clientName ?? ''),
  });
}

export async function DELETE() {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const jar = await cookies();
  jar.delete(ACTIVE_WORKSPACE_COOKIE);
  return Response.json({ ok: true });
}
