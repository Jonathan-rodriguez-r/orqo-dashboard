import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const APP_URL = process.env.APP_URL ?? 'http://localhost:3000';

/**
 * GET /api/auth/google
 * Initiates the Google OAuth 2.0 Authorization Code flow.
 * Stores a CSRF state token in a short-lived cookie.
 */
export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return Response.json({ error: 'Google OAuth no configurado' }, { status: 501 });
  }

  const state = randomBytes(16).toString('hex');
  const jar = await cookies();

  jar.set('orqo_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  });

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  `${APP_URL}/api/auth/google/callback`,
    response_type: 'code',
    scope:         'openid email profile',
    state,
    access_type:   'online',
    prompt:        'select_account',
  });

  return Response.redirect(`${GOOGLE_AUTH_URL}?${params}`);
}
