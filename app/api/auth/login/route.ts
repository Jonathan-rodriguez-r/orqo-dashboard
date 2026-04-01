import { getDb } from '@/lib/mongodb';
import { log, actorFromRequest } from '@/lib/logger';
import { randomBytes } from 'crypto';
import { Resend } from 'resend';
import { resolveWorkspaceFromRequest } from '@/lib/tenant';

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

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== 'string') {
      return Response.json({ error: 'Email requerido' }, { status: 400 });
    }
    const cleanEmail = String(email).trim().toLowerCase();

    const db = await getDb();
    const tenant = await resolveWorkspaceFromRequest(db, req);

    if (!tenant) {
      return Response.json(
        { error: 'Este dominio no esta configurado para un workspace de ORQO.' },
        { status: 404 }
      );
    }

    const workspaceId = tenant.workspaceId;
    const userCount = await db.collection('users').countDocuments({ workspaceId });
    const totalUsers = await db.collection('users').countDocuments();
    const user = await db.collection('users').findOne({ email: cleanEmail, workspaceId });

    if (userCount > 0 && !user) {
      await log(db, {
        level: 'WARN',
        severity: 'MEDIUM',
        category: 'auth',
        action: 'LOGIN_BLOCKED',
        message: `Intento de inicio de sesion con correo no autorizado: ${cleanEmail} (workspace: ${workspaceId})`,
        actor: actorFromRequest(req, { email: cleanEmail }),
      });
      return Response.json({ error: 'Este correo no tiene acceso al dashboard.' }, { status: 403 });
    }

    // First user ever in platform: provision owner in resolved workspace.
    if (userCount === 0 && totalUsers === 0) {
      await db.collection('users').insertOne({
        email: cleanEmail,
        name: cleanEmail.split('@')[0],
        role: 'owner',
        workspaceId,
        createdAt: new Date(),
      });
    } else if (userCount === 0 && !user) {
      return Response.json(
        { error: 'Este workspace no tiene usuarios autorizados todavia.' },
        { status: 403 }
      );
    }

    const token = randomBytes(32).toString('hex');
    await db.collection('auth_tokens').insertOne({
      token,
      email: cleanEmail,
      workspaceId,
      expiresAt: Date.now() + 15 * 60 * 1000,
      used: false,
    });

    const link = `${requestBaseUrl(req)}/api/auth/verify?token=${token}`;

    if (process.env.NODE_ENV !== 'production') {
      console.log('\n\x1b[32m[ORQO DEV] Magic link para', cleanEmail, ':\x1b[0m');
      console.log('\x1b[36m' + link + '\x1b[0m\n');
    }

    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? 'ORQO <noreply@orqo.app>',
      to: cleanEmail,
      subject: 'Tu enlace de acceso a ORQO Dashboard',
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
            <p style="color:#B4C4BC;font-size:15px;line-height:1.7;margin:0 0 24px;">
              Hola, recibimos una solicitud de acceso al dashboard de ORQO para <strong style="color:#E9EDE9;">${cleanEmail}</strong>.
            </p>
            <div style="text-align:center;margin:32px 0;">
              <a href="${link}" style="display:inline-block;background:#2CB978;color:#fff;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;text-decoration:none;">
                Acceder al Dashboard ->
              </a>
            </div>
            <p style="color:#7A9488;font-size:12px;line-height:1.7;margin:24px 0 0;text-align:center;">
              Este enlace expira en 15 minutos.<br/>
              Si no solicitaste este acceso, ignora este correo.
            </p>
            <hr style="border:none;border-top:1px solid #1D2920;margin:24px 0;"/>
            <p style="color:#2E4038;font-size:11px;text-align:center;margin:0;">
              Producto de Bacata Digital Media - bacatadm.com
            </p>
          </div>
        </body>
        </html>
      `,
    });

    await log(db, {
      level: 'INFO',
      severity: 'LOW',
      category: 'auth',
      action: 'MAGIC_LINK_SENT',
      message: `Magic link enviado a ${cleanEmail} (workspace: ${workspaceId})`,
      actor: actorFromRequest(req, { email: cleanEmail }),
    });

    return Response.json({ ok: true });
  } catch (e: any) {
    console.error('[auth/login]', e);
    return Response.json({ error: 'Error al enviar el correo. Intenta de nuevo.' }, { status: 500 });
  }
}
