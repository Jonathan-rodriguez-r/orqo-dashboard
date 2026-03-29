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

  try {
    const db = await getDb();
    const record = await db.collection('auth_tokens').findOne({ token, used: false });

    if (!record) {
      redirect('/login?error=invalid');
    }

    if (record.expiresAt < Date.now()) {
      await db.collection('auth_tokens').deleteOne({ token });
      redirect('/login?error=expired');
    }

    // Mark token as used
    await db.collection('auth_tokens').updateOne({ token }, { $set: { used: true } });

    // Get or create user
    let user = await db.collection('users').findOne({ email: record.email });
    if (!user) {
      redirect('/login?error=noaccess');
    }

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
  } catch (e) {
    redirect('/login?error=server');
  }

  redirect('/dashboard');
}
