import { getDb } from '@/lib/mongodb';
import { signSession, buildSessionPayload, COOKIE, SESSION_DAYS } from '@/lib/auth';
import { getDefaultPermissions } from '@/lib/rbac';
import { log, actorFromRequest } from '@/lib/logger';
import { getDefaultWorkspaceId, resolveWorkspaceFromRequest } from '@/lib/tenant';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) redirect('/login?error=unauthorized');

  let redirectTo = '/login?error=server';

  try {
    const db = await getDb();
    const tenant = await resolveWorkspaceFromRequest(db, req, { allowFallback: true });
    const record = await db.collection('auth_tokens').findOne({ token, used: false });

    if (!record) {
      await log(db, {
        level: 'WARN',
        severity: 'HIGH',
        category: 'security',
        action: 'UNAUTHORIZED_TOKEN_USE',
        message: 'Token de acceso invalido o ya utilizado',
        actor: actorFromRequest(req),
      });
      redirectTo = '/login?error=unauthorized';
    } else if (record.expiresAt < Date.now()) {
      await db.collection('auth_tokens').deleteOne({ token });
      await log(db, {
        level: 'WARN',
        severity: 'MEDIUM',
        category: 'security',
        action: 'EXPIRED_TOKEN_USE',
        message: `Intento de uso de token expirado (${record.email})`,
        actor: actorFromRequest(req, { email: record.email }),
      });
      redirectTo = '/login?error=expired';
    } else {
      const tokenWorkspaceId = String(record.workspaceId ?? getDefaultWorkspaceId());
      if (tenant && tenant.workspaceId !== tokenWorkspaceId) {
        await log(db, {
          level: 'WARN',
          severity: 'HIGH',
          category: 'security',
          action: 'TENANT_MISMATCH',
          message: `Token de ${record.email} usado en dominio de otro workspace (${tokenWorkspaceId} vs ${tenant.workspaceId})`,
          actor: actorFromRequest(req, { email: record.email }),
        });
        redirectTo = '/login?error=unauthorized';
      } else {
        await db.collection('auth_tokens').updateOne({ token }, { $set: { used: true } });

        const users = db.collection('users');
        let user = await users.findOne({ email: record.email, workspaceId: tokenWorkspaceId });

        if (!user && tokenWorkspaceId === getDefaultWorkspaceId()) {
          const legacyUser = await users.findOne({ email: record.email, workspaceId: { $exists: false } as any });
          if (legacyUser?._id) {
            await users.updateOne(
              { _id: legacyUser._id },
              { $set: { workspaceId: tokenWorkspaceId, lastLogin: new Date() } }
            );
            user = await users.findOne({ _id: legacyUser._id });
          }
        }

        if (!user) {
          await log(db, {
            level: 'WARN',
            severity: 'HIGH',
            category: 'security',
            action: 'TOKEN_EMAIL_NOT_REGISTERED',
            message: `Token valido pero correo sin registro en workspace: ${record.email} (${tokenWorkspaceId})`,
            actor: actorFromRequest(req, { email: record.email }),
          });
          redirectTo = '/login?error=unauthorized';
        } else {
          await users.updateOne(
            { _id: user._id },
            { $set: { lastLogin: new Date() } }
          );

          const roleDoc = await db.collection('roles').findOne({ slug: user.role, workspaceId: tokenWorkspaceId });
          const permissions: string[] = Array.from(
            new Set([...(roleDoc?.permissions ?? []), ...getDefaultPermissions(user.role)])
          );

          const sessionPayload = buildSessionPayload(user, permissions, 'magic_link');
          const jwt = await signSession(sessionPayload);

          const jar = await cookies();
          jar.set(COOKIE, jwt, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * SESSION_DAYS,
          });

          await log(db, {
            level: 'INFO',
            severity: 'LOW',
            category: 'auth',
            action: 'LOGIN_SUCCESS',
            message: `${record.email} inicio sesion via magic link (workspace: ${tokenWorkspaceId})`,
            actor: actorFromRequest(req, {
              email: record.email,
              role: user.role,
            }),
          });

          redirectTo = '/dashboard';
        }
      }
    }
  } catch (e) {
    console.error('[auth/verify]', e);
    redirectTo = '/login?error=server';
  }

  redirect(redirectTo);
}
