import { getDb } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';
import { log, actorFromRequest, computeDiff } from '@/lib/logger';

/**
 * GET    /api/roles — list roles (requires settings.roles)
 * POST   /api/roles — create role (requires settings.roles)
 * PATCH  /api/roles — update role permissions (requires settings.roles)
 * DELETE /api/roles — delete custom role (requires settings.roles)
 */

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  // Viewing roles is allowed to anyone who can manage users (for invite form dropdown)
  // or who has settings.roles permission
  if (
    !hasPermission(session.permissions, 'settings.roles') &&
    !hasPermission(session.permissions, 'settings.users')
  ) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const db = await getDb();
  const roles = await db.collection('roles').find({}).sort({ createdAt: 1 }).toArray();
  return Response.json({ ok: true, roles: roles.map(r => ({ ...r, _id: String(r._id) })) });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session.permissions, 'settings.roles'))
    return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { slug, label, description, permissions } = await req.json();
  if (!slug || !label)
    return Response.json({ error: 'slug y label son requeridos' }, { status: 400 });

  const db = await getDb();
  const existing = await db.collection('roles').findOne({ slug });
  if (existing) return Response.json({ error: 'Ya existe un rol con ese ID.' }, { status: 409 });

  await db.collection('roles').insertOne({
    slug,
    label,
    description: description ?? '',
    permissions: permissions ?? [],
    custom: true,
    createdAt: new Date(),
  });

  await log(db, {
    level: 'INFO', severity: 'LOW',
    category: 'roles', action: 'ROLE_CREATED',
    message: `${session.email} creó el rol "${label}" (${slug})`,
    actor:  actorFromRequest(req, { email: session.email, role: session.role }),
    target: { type: 'role', id: slug, label },
    metadata: { after: { slug, label, description: description ?? '', permissions: permissions ?? [] } },
  });

  return Response.json({ ok: true });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session.permissions, 'settings.roles'))
    return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { slug, permissions } = await req.json();
  if (!slug || !Array.isArray(permissions))
    return Response.json({ error: 'slug y permissions son requeridos' }, { status: 400 });

  if (slug === 'owner' && session.role !== 'owner')
    return Response.json({ error: 'Solo el propietario puede modificar el rol Owner.' }, { status: 403 });

  const db = await getDb();
  const existing = await db.collection('roles').findOne({ slug });
  const oldPermissions: string[] = existing?.permissions ?? [];

  await db.collection('roles').updateOne({ slug }, { $set: { permissions } });
  await db.collection('users').updateMany({ role: slug }, { $set: { permissions } });

  const added   = permissions.filter((p: string) => !oldPermissions.includes(p));
  const removed = oldPermissions.filter((p: string) => !permissions.includes(p));

  await log(db, {
    level: 'WARN', severity: 'MEDIUM',
    category: 'roles', action: 'ROLE_PERMISSIONS_UPDATED',
    message: `${session.email} actualizó permisos del rol "${slug}"`,
    actor:  actorFromRequest(req, { email: session.email, role: session.role }),
    target: { type: 'role', id: slug, label: existing?.label ?? slug },
    metadata: {
      before: { permissions: oldPermissions },
      after:  { permissions },
      diff:   computeDiff({ permissions: oldPermissions }, { permissions }),
      extra:  { added, removed },
    },
  });

  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session.permissions, 'settings.roles'))
    return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { slug } = await req.json();
  if (!slug) return Response.json({ error: 'slug requerido' }, { status: 400 });

  const systemRoles = ['owner', 'admin', 'analyst', 'agent_manager', 'viewer', 'operations'];
  if (systemRoles.includes(slug))
    return Response.json({ error: 'No se pueden eliminar los roles del sistema.' }, { status: 400 });

  const db = await getDb();
  const existing = await db.collection('roles').findOne({ slug });
  await db.collection('roles').deleteOne({ slug });

  await log(db, {
    level: 'WARN', severity: 'MEDIUM',
    category: 'roles', action: 'ROLE_DELETED',
    message: `${session.email} eliminó el rol "${existing?.label ?? slug}" (${slug})`,
    actor:  actorFromRequest(req, { email: session.email, role: session.role }),
    target: { type: 'role', id: slug, label: existing?.label ?? slug },
    metadata: { before: { slug, label: existing?.label, permissions: existing?.permissions } },
  });

  return Response.json({ ok: true });
}
