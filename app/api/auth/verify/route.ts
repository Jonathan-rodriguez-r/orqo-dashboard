import { getDb } from '@/lib/mongodb';
import { signSession, buildSessionPayload, COOKIE, SESSION_DAYS } from '@/lib/auth';
import { getDefaultPermissions } from '@/lib/rbac';
import { logSecurityEvent } from '@/lib/security-log';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) redirect('/login?error=unauthorized');

  let redirectTo = '/login?error=server';

  try {
    const db     = await getDb();
    const record = await db.collection('auth_tokens').findOne({ token, used: false });

    if (!record) {
      // Token doesn't exist or was already used — potential replay / brute-force
      await logSecurityEvent(db, req, 'invalid_token', 'magic_link',
        'Token de acceso inválido o ya utilizado');
      redirectTo = '/login?error=unauthorized';

    } else if (record.expiresAt < Date.now()) {
      await db.collection('auth_tokens').deleteOne({ token });
      await logSecurityEvent(db, req, 'expired_token', 'magic_link',
        'Intento de uso de token expirado', record.email);
      redirectTo = '/login?error=expired';

    } else {
      await db.collection('auth_tokens').updateOne({ token }, { $set: { used: true } });

      const user = await db.collection('users').findOne({ email: record.email });

      if (!user) {
        // Token valid but email not in users — invitation revoked or tampered
        await logSecurityEvent(db, req, 'unauthorized_email', 'magic_link',
          'Token válido pero el correo no está registrado como usuario', record.email);
        redirectTo = '/login?error=unauthorized';

      } else {
        await db.collection('users').updateOne(
          { email: record.email },
          { $set: { lastLogin: new Date() } }
        );

        const roleDoc = await db.collection('roles').findOne({ slug: user.role });
        const permissions: string[] = roleDoc?.permissions ?? getDefaultPermissions(user.role);

        const sessionPayload = buildSessionPayload(user, permissions, 'magic_link');
        const jwt = await signSession(sessionPayload);

        const jar = await cookies();
        jar.set(COOKIE, jwt, {
          httpOnly: true,
          secure:   process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path:     '/',
          maxAge:   60 * 60 * 24 * SESSION_DAYS,
        });

        redirectTo = '/dashboard';
      }
    }
  } catch (e) {
    console.error('[auth/verify]', e);
    redirectTo = '/login?error=server';
  }

  redirect(redirectTo);
}
