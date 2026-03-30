import { getDb } from '@/lib/mongodb';
import { signSession } from '@/lib/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    redirect('/login?error=invalid');
  }

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
      // Mark token as used
      await db.collection('auth_tokens').updateOne({ token }, { $set: { used: true } });

      const user = await db.collection('users').findOne({ email: record.email });
      if (!user) {
        redirectTo = '/login?error=noaccess';
      } else {
        // Update last login
        await db.collection('users').updateOne(
          { email: record.email },
          { $set: { lastLogin: Date.now() } }
        );

        // Create session JWT
        const jwt = await signSession({ sub: record.email, name: user.name ?? record.email });

        const jar = await cookies();
        jar.set('orqo_session', jwt, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 7, // 7 days
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
