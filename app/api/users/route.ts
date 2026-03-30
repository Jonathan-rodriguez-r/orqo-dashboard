import { getDb } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { hasPermission, getDefaultPermissions } from '@/lib/rbac';
import { randomBytes } from 'crypto';
import { Resend } from 'resend';

const resend  = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.APP_URL ?? 'http://localhost:3000';

/**
 * GET    /api/users — list workspace users       (requires settings.users)
 * POST   /api/users — invite user + send email   (requires settings.users)
 * PATCH  /api/users — edit user name/email/role  (requires settings.users)
 * DELETE /api/users — remove user               (requires settings.users)
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

  const cleanEmail   = email.trim().toLowerCase();
  const assignedRole = role ?? 'viewer';

  if (assignedRole === 'owner' && session.role !== 'owner')
    return Response.json({ error: 'Solo el propietario puede asignar el rol Owner.' }, { status: 403 });

  const db = await getDb();
  const existing = await db.collection('users').findOne({ email: cleanEmail });
  if (existing) return Response.json({ error: 'Este correo ya tiene acceso.' }, { status: 409 });

  // ── Create user ────────────────────────────────────────────────────────────
  const roleDoc    = await db.collection('roles').findOne({ slug: assignedRole });
  const permissions: string[] = roleDoc?.permissions ?? getDefaultPermissions(assignedRole);
  const displayName = name?.trim() || cleanEmail.split('@')[0];

  await db.collection('users').insertOne({
    email:       cleanEmail,
    name:        displayName,
    role:        assignedRole,
    permissions,
    workspaceId: session.workspaceId ?? 'default',
    invitedBy:   session.email,
    createdAt:   new Date(),
    lastLogin:   null,
  });

  // ── Generate invitation magic link (72h expiry) ────────────────────────────
  const token = randomBytes(32).toString('hex');
  await db.collection('auth_tokens').insertOne({
    token,
    email:     cleanEmail,
    expiresAt: Date.now() + 72 * 60 * 60 * 1000, // 72 hours
    used:      false,
    type:      'invitation',
  });

  const inviteLink = `${APP_URL}/api/auth/verify?token=${token}`;

  // Dev: always log the link
  if (process.env.NODE_ENV !== 'production') {
    console.log('\n\x1b[32m[ORQO DEV] Invitación para', cleanEmail, ':\x1b[0m');
    console.log('\x1b[36m' + inviteLink + '\x1b[0m\n');
  }

  // ── Send invitation email ──────────────────────────────────────────────────
  let emailSent = false;
  try {
    await resend.emails.send({
      from:    process.env.EMAIL_FROM ?? 'ORQO <noreply@orqo.app>',
      to:      cleanEmail,
      subject: `${session.name ?? session.email} te invitó a ORQO Dashboard`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#060908;font-family:'Helvetica Neue',Arial,sans-serif;">
          <div style="max-width:520px;margin:40px auto;background:#0B100D;border:1px solid #1D2920;border-radius:14px;padding:40px;">
            <div style="text-align:center;margin-bottom:32px;">
              <div style="font-size:28px;font-weight:800;color:#F5F5F2;letter-spacing:-0.5px;">
                OR<span style="color:#2CB978;">QO</span>
              </div>
              <div style="color:#7A9488;font-size:13px;margin-top:4px;">Dashboard</div>
            </div>

            <p style="color:#B4C4BC;font-size:15px;line-height:1.7;margin:0 0 8px;">
              Hola <strong style="color:#E9EDE9;">${displayName}</strong>,
            </p>
            <p style="color:#B4C4BC;font-size:15px;line-height:1.7;margin:0 0 24px;">
              <strong style="color:#E9EDE9;">${session.name ?? session.email}</strong> te ha invitado
              a unirte al dashboard de ORQO con el rol de
              <strong style="color:#2CB978;">${roleDoc?.label ?? assignedRole}</strong>.
            </p>

            <div style="text-align:center;margin:32px 0;">
              <a href="${inviteLink}"
                style="display:inline-block;background:#2CB978;color:#fff;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;text-decoration:none;">
                Activar mi cuenta →
              </a>
            </div>

            <p style="color:#7A9488;font-size:12px;line-height:1.7;margin:24px 0 0;text-align:center;">
              Este enlace expira en 72 horas.<br/>
              Si no esperabas esta invitación, puedes ignorar este correo.
            </p>
            <hr style="border:none;border-top:1px solid #1D2920;margin:24px 0;"/>
            <p style="color:#2E4038;font-size:11px;text-align:center;margin:0;">
              Producto de Bacata Digital Media · bacatadm.com
            </p>
          </div>
        </body>
        </html>
      `,
    });
    emailSent = true;
  } catch (e) {
    console.error('[users/invite] email error:', e);
  }

  return Response.json({ ok: true, emailSent, inviteLink });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session.permissions, 'settings.users'))
    return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { email, role, name, newEmail } = await req.json();
  if (!email) return Response.json({ error: 'email es requerido' }, { status: 400 });

  if (role === 'owner' && session.role !== 'owner')
    return Response.json({ error: 'Solo el propietario puede asignar el rol Owner.' }, { status: 403 });

  if (email === session.email && role && role !== session.role)
    return Response.json({ error: 'No puedes cambiar tu propio rol.' }, { status: 400 });

  const db = await getDb();
  const update: Record<string, any> = {};

  if (name)     update.name  = name.trim();
  if (newEmail) update.email = newEmail.trim().toLowerCase();

  if (role) {
    const roleDoc = await db.collection('roles').findOne({ slug: role });
    const permissions: string[] = roleDoc?.permissions ?? getDefaultPermissions(role);
    update.role        = role;
    update.permissions = permissions;
  }

  if (Object.keys(update).length === 0)
    return Response.json({ ok: true, message: 'Sin cambios' });

  await db.collection('users').updateOne({ email }, { $set: update });
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
