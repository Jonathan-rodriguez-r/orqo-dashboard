import { getDb } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';

/**
 * GET   /api/roles — list roles (requires settings.roles)
 * POST  /api/roles — create role (requires settings.roles)
 * PATCH /api/roles — update role permissions (requires settings.roles)
 */

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session.permissions, 'settings.roles'))
    return Response.json({ error: 'Forbidden' }, { status: 403 });

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
  await db.collection('roles').updateOne({ slug }, { $set: { permissions } });
  await db.collection('users').updateMany({ role: slug }, { $set: { permissions } });

  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session.permissions, 'settings.roles'))
    return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { slug } = await req.json();
  if (!slug) return Response.json({ error: 'slug requerido' }, { status: 400 });

  const systemRoles = ['owner', 'admin', 'analyst', 'agent_manager', 'viewer'];
  if (systemRoles.includes(slug))
    return Response.json({ error: 'No se pueden eliminar los roles del sistema.' }, { status: 400 });

  const db = await getDb();
  await db.collection('roles').deleteOne({ slug });
  return Response.json({ ok: true });
}
