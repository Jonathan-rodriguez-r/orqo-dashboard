import { getDb } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { hasPermission, getDefaultPermissions } from '@/lib/rbac';
import { log, actorFromRequest, computeDiff } from '@/lib/logger';
import { randomBytes } from 'crypto';
import { Resend } from 'resend';
import { canAccessProtectedRoles, isProtectedRoleSlug, resolveScopedWorkspaceId } from '@/lib/access-control';
import { getDefaultWorkspaceId } from '@/lib/tenant';
import { getWorkspaceClient, resolveClientScopeForRole } from '@/lib/clients';

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.APP_URL ?? 'http://localhost:3000';

function requestBaseUrl(req: Request) {
  const host = String(req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? '').trim();
  if (!host) return APP_URL;
  const proto =
    String(req.headers.get('x-forwarded-proto') ?? '').trim() ||
    (process.env.NODE_ENV === 'production' ? 'https' : 'http');
  return `${proto}://${host}`;
}

const PROTECTED_ROLE_SLUGS = ['owner', 'orqo_operator', 'orqo_success', 'orqo_support'];

function canAssignRolePermissions(
  session: NonNullable<Awaited<ReturnType<typeof getSession>>>,
  roleSlug: string,
  rolePermissions: string[]
) {
  if (canAccessProtectedRoles(session)) return true;
  if (isProtectedRoleSlug(roleSlug)) return false;

  const ownPermissions = new Set(session.permissions ?? []);
  return rolePermissions.every((perm) => ownPermissions.has(perm));
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session.permissions, 'settings.users')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const workspaceId = resolveScopedWorkspaceId(session, searchParams.get('workspaceId'));
  const db = await getDb();

  const filter: Record<string, any> = { workspaceId };
  if (!canAccessProtectedRoles(session)) {
    filter.role = { $nin: PROTECTED_ROLE_SLUGS };
  }

  const users = await db
    .collection('users')
    .find(
      filter,
      {
        projection: {
          _id: 1,
          email: 1,
          name: 1,
          avatar: 1,
          role: 1,
          workspaceId: 1,
          clientId: 1,
          clientName: 1,
          isGlobalUser: 1,
          lastLogin: 1,
          createdAt: 1,
        },
      }
    )
    .sort({ createdAt: -1 })
    .toArray();

  return Response.json(users.map(({ _id, ...rest }) => ({ _id: String(_id), ...rest })));
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session.permissions, 'settings.users')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { email, name, role, workspaceId: requestedWorkspaceId } = await req.json();
  if (!email) return Response.json({ error: 'Email requerido' }, { status: 400 });

  const cleanEmail = String(email).trim().toLowerCase();
  const db = await getDb();
  const workspaceId = resolveScopedWorkspaceId(session, requestedWorkspaceId);
  const assignedRole = String(role ?? 'viewer').trim();
  if (isProtectedRoleSlug(assignedRole) && !canAccessProtectedRoles(session)) {
    return Response.json({ error: 'No autorizado para asignar roles reservados.' }, { status: 403 });
  }
  if (isProtectedRoleSlug(assignedRole) && workspaceId !== getDefaultWorkspaceId()) {
    return Response.json({ error: 'Los roles globales ORQO solo se gestionan en el workspace principal.' }, { status: 400 });
  }
  const workspaceClient = await getWorkspaceClient(db, workspaceId);
  const scopedClient = resolveClientScopeForRole({
    role: assignedRole,
    workspaceClientId: workspaceClient.clientId,
    workspaceClientName: workspaceClient.clientName,
    promoteToGlobal: workspaceId === getDefaultWorkspaceId(),
  });

  const existing = await db.collection('users').findOne({ email: cleanEmail, workspaceId });
  if (existing) return Response.json({ error: 'Este correo ya tiene acceso.' }, { status: 409 });

  const roleDoc = await db.collection('roles').findOne({ slug: assignedRole, workspaceId });
  if (!roleDoc && assignedRole !== 'viewer') {
    return Response.json({ error: 'Rol no encontrado en este workspace.' }, { status: 404 });
  }

  const permissions: string[] = Array.from(
    new Set([...(roleDoc?.permissions ?? []), ...getDefaultPermissions(assignedRole)])
  );
  if (!canAssignRolePermissions(session, assignedRole, permissions)) {
    return Response.json({ error: 'No autorizado para asignar ese rol.' }, { status: 403 });
  }
  const displayName = String(name ?? '').trim() || cleanEmail.split('@')[0];

  await db.collection('users').insertOne({
    email: cleanEmail,
    name: displayName,
    role: assignedRole,
    permissions,
    workspaceId,
    clientId: scopedClient.clientId,
    clientName: scopedClient.clientName,
    isGlobalUser: scopedClient.isGlobalUser,
    invitedBy: session.email,
    createdAt: new Date(),
    lastLogin: null,
  });

  const token = randomBytes(32).toString('hex');
  await db.collection('auth_tokens').insertOne({
    token,
    email: cleanEmail,
    workspaceId,
    expiresAt: Date.now() + 72 * 60 * 60 * 1000,
    used: false,
    type: 'invitation',
  });

  const inviteLink = `${requestBaseUrl(req)}/api/auth/verify?token=${token}`;

  let emailSent = false;
  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? 'ORQO <noreply@orqo.app>',
      to: cleanEmail,
      subject: `${session.name ?? session.email} te invito a ORQO Dashboard`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:24px auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
          <h2 style="margin:0 0 12px 0;">Invitacion ORQO</h2>
          <p>Hola <strong>${displayName}</strong>,</p>
          <p>${session.name ?? session.email} te invito al dashboard con el rol <strong>${roleDoc?.label ?? assignedRole}</strong>.</p>
          <p><a href="${inviteLink}" style="display:inline-block;padding:10px 16px;background:#2CB978;color:#fff;text-decoration:none;border-radius:8px;">Activar cuenta</a></p>
          <p style="font-size:12px;color:#6b7280;">Enlace valido por 72 horas.</p>
        </div>
      `,
    });
    emailSent = true;
  } catch (e) {
    console.error('[users/invite] email error:', e);
  }

  await log(db, {
    level: 'INFO',
    severity: 'LOW',
    category: 'users',
    action: 'USER_INVITED',
    message: `${session.email} invito a ${cleanEmail} con rol ${assignedRole}`,
    actor: actorFromRequest(req, { email: session.email, role: session.role }),
    target: { type: 'user', email: cleanEmail, label: displayName },
    metadata: {
      after: {
        email: cleanEmail,
        name: displayName,
        role: assignedRole,
        workspaceId,
        clientId: scopedClient.clientId,
        clientName: scopedClient.clientName,
        isGlobalUser: scopedClient.isGlobalUser,
      },
      extra: { emailSent },
    },
  });

  return Response.json({ ok: true, emailSent, inviteLink });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session.permissions, 'settings.users')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { email, role, name, newEmail, workspaceId: requestedWorkspaceId } = await req.json();
  if (!email) return Response.json({ error: 'email es requerido' }, { status: 400 });

  if (role && isProtectedRoleSlug(String(role)) && !canAccessProtectedRoles(session)) {
    return Response.json({ error: 'No autorizado para asignar roles reservados.' }, { status: 403 });
  }

  const db = await getDb();
  const workspaceId = resolveScopedWorkspaceId(session, requestedWorkspaceId);
  const workspaceClient = await getWorkspaceClient(db, workspaceId);
  const existing = await db.collection('users').findOne({ email, workspaceId });
  if (!existing) return Response.json({ error: 'Usuario no encontrado' }, { status: 404 });

  if (isProtectedRoleSlug(String(existing.role ?? '')) && !canAccessProtectedRoles(session)) {
    return Response.json({ error: 'No autorizado para modificar este usuario.' }, { status: 403 });
  }

  if (email === session.email && role && role !== session.role) {
    return Response.json({ error: 'No puedes cambiar tu propio rol.' }, { status: 400 });
  }

  const update: Record<string, any> = {};
  if (typeof name === 'string' && name.trim()) update.name = name.trim();
  if (typeof newEmail === 'string' && newEmail.trim()) update.email = newEmail.trim().toLowerCase();

  if (role) {
    const roleSlug = String(role).trim();
    if (isProtectedRoleSlug(roleSlug) && workspaceId !== getDefaultWorkspaceId()) {
      return Response.json({ error: 'Los roles globales ORQO solo se gestionan en el workspace principal.' }, { status: 400 });
    }
    const roleDoc = await db.collection('roles').findOne({ slug: roleSlug, workspaceId });
    if (!roleDoc && roleSlug !== 'viewer') {
      return Response.json({ error: 'Rol no encontrado en este workspace.' }, { status: 404 });
    }
    const permissions: string[] = Array.from(
      new Set([...(roleDoc?.permissions ?? []), ...getDefaultPermissions(roleSlug)])
    );
    if (!canAssignRolePermissions(session, roleSlug, permissions)) {
      return Response.json({ error: 'No autorizado para asignar ese rol.' }, { status: 403 });
    }
    const scopedClient = resolveClientScopeForRole({
      role: roleSlug,
      workspaceClientId: workspaceClient.clientId,
      workspaceClientName: workspaceClient.clientName,
      promoteToGlobal: workspaceId === getDefaultWorkspaceId(),
    });
    update.role = roleSlug;
    update.permissions = permissions;
    update.clientId = scopedClient.clientId;
    update.clientName = scopedClient.clientName;
    update.isGlobalUser = scopedClient.isGlobalUser;
  }

  if (Object.keys(update).length === 0) return Response.json({ ok: true, message: 'Sin cambios' });

  await db.collection('users').updateOne({ email, workspaceId }, { $set: update });

  const beforeSnap: Record<string, unknown> = {
    name: existing?.name,
    email: existing?.email,
    role: existing?.role,
  };
  const afterSnap: Record<string, unknown> = {
    name: update.name ?? existing?.name,
    email: update.email ?? existing?.email,
    role: update.role ?? existing?.role,
  };

  await log(db, {
    level: 'INFO',
    severity: 'LOW',
    category: 'users',
    action: 'USER_UPDATED',
    message: `${session.email} actualizo al usuario ${email}`,
    actor: actorFromRequest(req, { email: session.email, role: session.role }),
    target: { type: 'user', email },
    metadata: { before: beforeSnap, after: afterSnap, diff: computeDiff(beforeSnap, afterSnap) },
  });

  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session.permissions, 'settings.users')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { email, workspaceId: requestedWorkspaceId } = await req.json();
  if (!email) return Response.json({ error: 'Email requerido' }, { status: 400 });
  if (email === session.email) return Response.json({ error: 'No puedes eliminar tu propio usuario' }, { status: 400 });

  const db = await getDb();
  const workspaceId = resolveScopedWorkspaceId(session, requestedWorkspaceId);
  const existing = await db.collection('users').findOne({ email, workspaceId });
  if (!existing) return Response.json({ error: 'Usuario no encontrado' }, { status: 404 });

  if (isProtectedRoleSlug(String(existing.role ?? '')) && !canAccessProtectedRoles(session)) {
    return Response.json({ error: 'No autorizado para eliminar este usuario.' }, { status: 403 });
  }

  await db.collection('users').deleteOne({ email, workspaceId });

  await log(db, {
    level: 'WARN',
    severity: 'MEDIUM',
    category: 'users',
    action: 'USER_DELETED',
    message: `${session.email} elimino al usuario ${email}`,
    actor: actorFromRequest(req, { email: session.email, role: session.role }),
    target: { type: 'user', email, label: existing?.name },
    metadata: { before: { email, name: existing?.name, role: existing?.role, workspaceId } },
  });

  return Response.json({ ok: true });
}
