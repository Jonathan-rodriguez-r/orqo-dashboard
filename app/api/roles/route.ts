import { getDb } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';

/**
 * GET /api/roles — list all roles with their permissions (requires settings.roles)
 * PATCH /api/roles — update a role's permissions (requires settings.roles, owner only for system roles)
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

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session.permissions, 'settings.roles'))
    return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { slug, permissions } = await req.json();
  if (!slug || !Array.isArray(permissions))
    return Response.json({ error: 'slug y permissions son requeridos' }, { status: 400 });

  // Protect owner role — only owners can modify it
  if (slug === 'owner' && session.role !== 'owner')
    return Response.json({ error: 'Solo el propietario puede modificar el rol Owner.' }, { status: 403 });

  const db = await getDb();
  await db.collection('roles').updateOne({ slug }, { $set: { permissions } });

  // Propagate to users with this role so their snapshot stays fresh
  await db.collection('users').updateMany({ role: slug }, { $set: { permissions } });

  return Response.json({ ok: true });
}
