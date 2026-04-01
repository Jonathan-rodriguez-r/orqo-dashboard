import { getDb } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { hasPermission, DEFAULT_ROLES, SYSTEM_MODULES } from '@/lib/rbac';
import { log, actorFromRequest, computeDiff } from '@/lib/logger';
import { canAccessProtectedRoles, isProtectedRoleSlug, resolveScopedWorkspaceId } from '@/lib/access-control';

const DELEGATION_BLOCKLIST = new Set<string>(['admin.clients', 'admin.seed']);
const VALID_PERMISSION_SET = new Set<string>(SYSTEM_MODULES.map((module) => module.slug));

function evaluatePermissionDelegation(
  session: NonNullable<Awaited<ReturnType<typeof getSession>>>,
  requested: unknown
) {
  const list = Array.isArray(requested)
    ? requested.map((item) => String(item ?? '').trim()).filter(Boolean)
    : [];
  const unique = Array.from(new Set(list));
  const invalid = unique.filter((perm) => !VALID_PERMISSION_SET.has(perm));

  if (invalid.length > 0) {
    return {
      accepted: [] as string[],
      invalid,
      rejected: [] as string[],
    };
  }

  if (canAccessProtectedRoles(session)) {
    return {
      accepted: unique,
      invalid: [] as string[],
      rejected: [] as string[],
    };
  }

  const ownPermissions = new Set(session.permissions ?? []);
  const accepted: string[] = [];
  const rejected: string[] = [];

  for (const perm of unique) {
    if (!ownPermissions.has(perm) || DELEGATION_BLOCKLIST.has(perm)) {
      rejected.push(perm);
      continue;
    }
    accepted.push(perm);
  }

  return {
    accepted,
    invalid: [] as string[],
    rejected,
  };
}

async function ensureWorkspaceSystemRoles(db: any, workspaceId: string) {
  const ops = DEFAULT_ROLES.map((role) => ({
    updateOne: {
      filter: { slug: role.slug, workspaceId },
      update: {
        $setOnInsert: {
          slug: role.slug,
          label: role.label,
          description: role.description,
          custom: false,
          workspaceId,
          createdAt: new Date(),
        },
        $set: { permissions: role.permissions, updatedAt: new Date() },
      },
      upsert: true,
    },
  }));
  await db.collection('roles').bulkWrite(ops, { ordered: false });
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session.permissions, 'settings.roles') && !hasPermission(session.permissions, 'settings.users')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const workspaceId = resolveScopedWorkspaceId(session, searchParams.get('workspaceId'));

  const db = await getDb();
  await ensureWorkspaceSystemRoles(db, workspaceId);
  const roles = await db
    .collection('roles')
    .find({ workspaceId })
    .sort({ createdAt: 1 })
    .toArray();

  const visibleRoles = canAccessProtectedRoles(session)
    ? roles
    : roles.filter((role) => !isProtectedRoleSlug(String(role.slug ?? '')));

  return Response.json({ ok: true, roles: visibleRoles.map((r) => ({ ...r, _id: String(r._id) })) });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session.permissions, 'settings.roles')) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { slug, label, description, permissions, workspaceId: requestedWorkspaceId } = await req.json();
  if (!slug || !label) return Response.json({ error: 'slug y label son requeridos' }, { status: 400 });

  const roleSlug = String(slug).trim();
  if (isProtectedRoleSlug(roleSlug)) {
    return Response.json({ error: 'No se puede crear un rol reservado.' }, { status: 400 });
  }

  const db = await getDb();
  const workspaceId = resolveScopedWorkspaceId(session, requestedWorkspaceId);
  const existing = await db.collection('roles').findOne({ slug: roleSlug, workspaceId });
  if (existing) return Response.json({ error: 'Ya existe un rol con ese ID.' }, { status: 409 });

  const delegation = evaluatePermissionDelegation(session, permissions ?? []);
  if (delegation.invalid.length > 0) {
    return Response.json(
      { error: `Permisos invalidos: ${delegation.invalid.join(', ')}` },
      { status: 400 }
    );
  }
  if (delegation.rejected.length > 0) {
    return Response.json(
      { error: `No puedes delegar estos permisos: ${delegation.rejected.join(', ')}` },
      { status: 403 }
    );
  }

  await db.collection('roles').insertOne({
    slug: roleSlug,
    label,
    description: description ?? '',
    permissions: delegation.accepted,
    custom: true,
    workspaceId,
    createdAt: new Date(),
  });

  await log(db, {
    level: 'INFO',
    severity: 'LOW',
    category: 'roles',
    action: 'ROLE_CREATED',
    message: `${session.email} creo el rol "${label}" (${roleSlug})`,
    actor: actorFromRequest(req, { email: session.email, role: session.role }),
    target: { type: 'role', id: roleSlug, label },
    metadata: { after: { slug: roleSlug, label, description: description ?? '', permissions: delegation.accepted, workspaceId } },
  });

  return Response.json({ ok: true });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session.permissions, 'settings.roles')) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { slug, permissions, workspaceId: requestedWorkspaceId } = await req.json();
  if (!slug || !Array.isArray(permissions)) return Response.json({ error: 'slug y permissions son requeridos' }, { status: 400 });

  const roleSlug = String(slug).trim();
  if (isProtectedRoleSlug(roleSlug) && !canAccessProtectedRoles(session)) {
    return Response.json({ error: 'No autorizado para modificar roles reservados.' }, { status: 403 });
  }

  const db = await getDb();
  const workspaceId = resolveScopedWorkspaceId(session, requestedWorkspaceId);
  const existing = await db.collection('roles').findOne({ slug: roleSlug, workspaceId });
  if (!existing) return Response.json({ error: 'Rol no encontrado' }, { status: 404 });

  const delegation = evaluatePermissionDelegation(session, permissions);
  if (delegation.invalid.length > 0) {
    return Response.json(
      { error: `Permisos invalidos: ${delegation.invalid.join(', ')}` },
      { status: 400 }
    );
  }
  if (delegation.rejected.length > 0) {
    return Response.json(
      { error: `No puedes delegar estos permisos: ${delegation.rejected.join(', ')}` },
      { status: 403 }
    );
  }

  const oldPermissions: string[] = existing?.permissions ?? [];
  await db.collection('roles').updateOne({ slug: roleSlug, workspaceId }, { $set: { permissions: delegation.accepted } });
  await db.collection('users').updateMany({ role: roleSlug, workspaceId }, { $set: { permissions: delegation.accepted } });

  const added = delegation.accepted.filter((p: string) => !oldPermissions.includes(p));
  const removed = oldPermissions.filter((p: string) => !delegation.accepted.includes(p));

  await log(db, {
    level: 'WARN',
    severity: 'MEDIUM',
    category: 'roles',
    action: 'ROLE_PERMISSIONS_UPDATED',
    message: `${session.email} actualizo permisos del rol "${roleSlug}"`,
    actor: actorFromRequest(req, { email: session.email, role: session.role }),
    target: { type: 'role', id: roleSlug, label: existing?.label ?? roleSlug },
    metadata: {
      before: { permissions: oldPermissions },
      after: { permissions: delegation.accepted },
      diff: computeDiff({ permissions: oldPermissions }, { permissions: delegation.accepted }),
      extra: { added, removed, workspaceId },
    },
  });

  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session.permissions, 'settings.roles')) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { slug, workspaceId: requestedWorkspaceId } = await req.json();
  if (!slug) return Response.json({ error: 'slug requerido' }, { status: 400 });

  const roleSlug = String(slug).trim();
  const systemRoles = [
    'owner',
    'admin',
    'analyst',
    'agent_manager',
    'viewer',
    'operations',
    'orqo_operator',
    'orqo_success',
    'orqo_support',
  ];
  if (systemRoles.includes(roleSlug)) {
    return Response.json({ error: 'No se pueden eliminar roles del sistema.' }, { status: 400 });
  }

  const db = await getDb();
  const workspaceId = resolveScopedWorkspaceId(session, requestedWorkspaceId);
  const existing = await db.collection('roles').findOne({ slug: roleSlug, workspaceId });
  if (!existing) return Response.json({ error: 'Rol no encontrado' }, { status: 404 });

  await db.collection('roles').deleteOne({ slug: roleSlug, workspaceId });

  await log(db, {
    level: 'WARN',
    severity: 'MEDIUM',
    category: 'roles',
    action: 'ROLE_DELETED',
    message: `${session.email} elimino el rol "${existing?.label ?? roleSlug}" (${roleSlug})`,
    actor: actorFromRequest(req, { email: session.email, role: session.role }),
    target: { type: 'role', id: roleSlug, label: existing?.label ?? roleSlug },
    metadata: { before: { slug: roleSlug, label: existing?.label, permissions: existing?.permissions, workspaceId } },
  });

  return Response.json({ ok: true });
}
