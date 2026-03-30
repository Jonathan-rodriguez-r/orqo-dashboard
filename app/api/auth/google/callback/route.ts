import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getDb } from '@/lib/mongodb';
import { signSession, buildSessionPayload, COOKIE, SESSION_DAYS } from '@/lib/auth';
import { getDefaultPermissions } from '@/lib/rbac';
import { log, actorFromRequest } from '@/lib/logger';

const APP_URL = process.env.APP_URL ?? 'http://localhost:3000';

/**
 * GET /api/auth/google/callback
 * Handles the OAuth 2.0 authorization code exchange.
 * No library dependencies — pure fetch.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code  = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const jar = await cookies();

  // ── Error / cancelled by user ────────────────────────────────────────────
  if (error || !code) {
    jar.delete('orqo_oauth_state');
    redirect('/login?error=google_cancelled');
  }

  // ── CSRF state validation ─────────────────────────────────────────────────
  const storedState = jar.get('orqo_oauth_state')?.value;
  jar.delete('orqo_oauth_state');

  if (!storedState || storedState !== state) {
    const db = await getDb();
    await log(db, {
      level: 'WARN', severity: 'HIGH',
      category: 'security', action: 'CSRF_VIOLATION',
      message: 'OAuth state mismatch — posible ataque CSRF en flujo Google',
      actor: actorFromRequest(req),
    });
    redirect('/login?error=invalid_state');
  }

  try {
    // ── Exchange code for tokens ─────────────────────────────────────────────
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code:          code!,
        client_id:     process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri:  `${APP_URL}/api/auth/google/callback`,
        grant_type:    'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      console.error('[google/callback] token exchange failed', await tokenRes.text());
      redirect('/login?error=google_token');
    }

    const { access_token } = await tokenRes.json();

    // ── Fetch user profile ────────────────────────────────────────────────────
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!userRes.ok) {
      redirect('/login?error=google_profile');
    }

    const profile: { sub: string; email: string; name: string; picture?: string } =
      await userRes.json();

    const db  = await getDb();
    const col = db.collection('users');

    // ── Find or provision user ────────────────────────────────────────────────
    const userCount = await col.countDocuments();
    let user = await col.findOne({ email: profile.email });

    if (!user && userCount > 0) {
      await log(db, {
        level: 'WARN', severity: 'HIGH',
        category: 'security', action: 'GOOGLE_AUTH_BLOCKED',
        message: `Inicio con Google rechazado — correo no autorizado: ${profile.email}`,
        actor: actorFromRequest(req, { email: profile.email }),
      });
      redirect('/login?error=unauthorized');
    }

    if (!user) {
      // First ever user — provision as owner
      const result = await col.insertOne({
        email:       profile.email,
        name:        profile.name,
        avatar:      profile.picture,
        googleId:    profile.sub,
        role:        'owner',
        workspaceId: 'default',
        createdAt:   new Date(),
        lastLogin:   new Date(),
      });
      user = await col.findOne({ _id: result.insertedId });
    } else {
      // Update profile from Google
      await col.updateOne(
        { email: profile.email },
        {
          $set: {
            name:      profile.name,
            avatar:    profile.picture,
            googleId:  profile.sub,
            lastLogin: new Date(),
          },
        }
      );
      user = await col.findOne({ email: profile.email });
    }

    if (!user) redirect('/login?error=server');

    // ── Load permissions from DB role (fall back to default role definition) ──
    const roleDoc = await db.collection('roles').findOne({ slug: user.role });
    const permissions: string[] = roleDoc?.permissions ?? getDefaultPermissions(user.role);

    // ── Create session ────────────────────────────────────────────────────────
    const sessionPayload = buildSessionPayload(user!, permissions, 'google');
    const jwt = await signSession(sessionPayload);

    jar.set(COOKIE, jwt, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path:     '/',
      maxAge:   60 * 60 * 24 * SESSION_DAYS,
    });

    await log(db, {
      level: 'INFO', severity: 'LOW',
      category: 'auth', action: 'GOOGLE_AUTH_SUCCESS',
      message: `${profile.email} inició sesión via Google OAuth`,
      actor: actorFromRequest(req, { email: profile.email, role: user!.role }),
    });

  } catch (e) {
    console.error('[google/callback]', e);
    redirect('/login?error=server');
  }

  redirect('/dashboard');
}
