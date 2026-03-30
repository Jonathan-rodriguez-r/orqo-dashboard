import { getDb } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { hasPermission, getDefaultPermissions } from '@/lib/rbac';

/**
 * GET /api/users — list workspace users (requires settings.users)
 * POST /api/users — invite user (requires settings.users)
 * DELETE /api/users — remove user (requires settings.users, cannot self-delete)
 */

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session.permissions, 'settings.users'))
    return Response.json({ error: 'Forbidden' }, { status: 403 });

  const db = await getDb();
  const users = await db
    .collection('users')
    .find({}, { projection: { _id: 1, email: 1, name: 1, avatar: 1, role: 1, lastLogin: 1, createdAt: 1 } })
    .sort({ createdAt: -1 })
    .toArray();

  return Response.json(users.map(({ _id, ...rest }) => ({ _id: String(_id), ...rest })));
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session.permissions, 'settings.users'))
    return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { email, name, role } = await req.json();
  if (!email) return Response.json({ error: 'Email requerido' }, { status: 400 });

  // Only owners can assign owner role
  const assignedRole = role ?? 'viewer';
  if (assignedRole === 'owner' && session.role !== 'owner')
    return Response.json({ error: 'Solo el propietario puede asignar el rol Owner.' }, { status: 403 });

  const db = await getDb();
  const existing = await db.collection('users').findOne({ email: email.trim().toLowerCase() });
  if (existing) return Response.json({ error: 'Este usuario ya existe' }, { status: 409 });

  const roleDoc = await db.collection('roles').findOne({ slug: assignedRole });
  const permissions: string[] = roleDoc?.permissions ?? getDefaultPermissions(assignedRole);

  await db.collection('users').insertOne({
    email:       email.trim().toLowerCase(),
    name:        name?.trim() ?? email.split('@')[0],
    role:        assignedRole,
    permissions,
    workspaceId: session.workspaceId ?? 'default',
    invitedBy:   session.email,
    createdAt:   new Date(),
    lastLogin:   null,
  });

  return Response.json({ ok: true });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session.permissions, 'settings.users'))
    return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { email, role } = await req.json();
  if (!email || !role) return Response.json({ error: 'email y role son requeridos' }, { status: 400 });

  if (email === session.email && role !== session.role)
    return Response.json({ error: 'No puedes cambiar tu propio rol.' }, { status: 400 });

  if (role === 'owner' && session.role !== 'owner')
    return Response.json({ error: 'Solo el propietario puede asignar el rol Owner.' }, { status: 403 });

  const db = await getDb();
  const roleDoc = await db.collection('roles').findOne({ slug: role });
  const permissions: string[] = roleDoc?.permissions ?? getDefaultPermissions(role);

  await db.collection('users').updateOne({ email }, { $set: { role, permissions } });
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session.permissions, 'settings.users'))
    return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { email } = await req.json();
  if (!email) return Response.json({ error: 'Email requerido' }, { status: 400 });
  if (email === session.email)
    return Response.json({ error: 'No puedes eliminar tu propio usuario' }, { status: 400 });

  const db = await getDb();
  await db.collection('users').deleteOne({ email });
  return Response.json({ ok: true });
}
