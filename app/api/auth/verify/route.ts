import { getDb } from '@/lib/mongodb';
import { signSession, buildSessionPayload, COOKIE, SESSION_DAYS } from '@/lib/auth';
import { getDefaultPermissions } from '@/lib/rbac';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) redirect('/login?error=invalid');

  let redirectTo = '/login?error=server';

  try {
    const db = await getDb();
    const record = await db.collection('auth_tokens').findOne({ token, used: false });

    if (!record) {
      redirectTo = '/login?error=invalid';
    } else if (record.expiresAt < Date.now()) {
      await db.collection('auth_tokens').deleteOne({ token });
      redirectTo = '/login?error=expired';
    } else {
      await db.collection('auth_tokens').updateOne({ token }, { $set: { used: true } });

      const user = await db.collection('users').findOne({ email: record.email });
      if (!user) {
        redirectTo = '/login?error=noaccess';
      } else {
        await db.collection('users').updateOne(
          { email: record.email },
          { $set: { lastLogin: new Date() } }
        );

        // Load permissions from DB role (fall back to default role definition)
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
