import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getDb } from '@/lib/mongodb';
import { signSession, buildSessionPayload, COOKIE, SESSION_DAYS } from '@/lib/auth';
import { getDefaultPermissions } from '@/lib/rbac';
import { log, actorFromRequest } from '@/lib/logger';
import { getDefaultWorkspaceId, resolveWorkspaceFromRequest } from '@/lib/tenant';
import { getWorkspaceClient, resolveClientScopeForRole } from '@/lib/clients';

const APP_URL = process.env.APP_URL ?? 'http://localhost:3000';

/**
 * GET /api/auth/google/callback
 * Handles OAuth 2.0 authorization code exchange.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const jar = await cookies();

  if (error || !code) {
    jar.delete('orqo_oauth_state');
    redirect('/login?error=google_cancelled');
  }

  const storedState = jar.get('orqo_oauth_state')?.value;
  jar.delete('orqo_oauth_state');

  if (!storedState || storedState !== state) {
    const db = await getDb();
    await log(db, {
      level: 'WARN',
      severity: 'HIGH',
      category: 'security',
      action: 'CSRF_VIOLATION',
      message: 'OAuth state mismatch en flujo Google',
      actor: actorFromRequest(req),
    });
    redirect('/login?error=invalid_state');
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${APP_URL}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      console.error('[google/callback] token exchange failed', await tokenRes.text());
      redirect('/login?error=google_token');
    }

    const { access_token } = await tokenRes.json();

    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!userRes.ok) {
      redirect('/login?error=google_profile');
    }

    const profile: { sub: string; email: string; name: string; picture?: string } = await userRes.json();

    const db = await getDb();
    const tenant = await resolveWorkspaceFromRequest(db, req);
    if (!tenant) {
      redirect('/login?error=tenant_not_found');
    }

    const workspaceId = tenant.workspaceId;
    const workspaceClient = await getWorkspaceClient(db, workspaceId);
    const users = db.collection('users');
    const workspaceUsers = await users.countDocuments({ workspaceId });
    const totalUsers = await users.countDocuments();

    let user = await users.findOne({ email: profile.email, workspaceId });

    if (!user && workspaceId === getDefaultWorkspaceId()) {
      const legacyUser = await users.findOne({ email: profile.email, workspaceId: { $exists: false } as any });
      if (legacyUser?._id) {
        const scopedClient = resolveClientScopeForRole({
          role: legacyUser.role,
          workspaceClientId: workspaceClient.clientId,
          workspaceClientName: workspaceClient.clientName,
          promoteToGlobal: workspaceId === getDefaultWorkspaceId(),
        });
        await users.updateOne(
          { _id: legacyUser._id },
          {
            $set: {
              workspaceId,
              name: profile.name,
              avatar: profile.picture,
              googleId: profile.sub,
              lastLogin: new Date(),
              clientId: scopedClient.clientId,
              clientName: scopedClient.clientName,
              isGlobalUser: scopedClient.isGlobalUser,
            },
          }
        );
        user = await users.findOne({ _id: legacyUser._id });
      }
    }

    if (!user && workspaceUsers > 0) {
      await log(db, {
        level: 'WARN',
        severity: 'HIGH',
        category: 'security',
        action: 'GOOGLE_AUTH_BLOCKED',
        message: `Inicio con Google rechazado: ${profile.email} (workspace: ${workspaceId})`,
        actor: actorFromRequest(req, { email: profile.email }),
      });
      redirect('/login?error=unauthorized');
    }

    if (!user && workspaceUsers === 0 && totalUsers === 0) {
      const bootstrapRole = workspaceId === getDefaultWorkspaceId() ? 'owner' : 'admin';
      const scopedClient = resolveClientScopeForRole({
        role: bootstrapRole,
        workspaceClientId: workspaceClient.clientId,
        workspaceClientName: workspaceClient.clientName,
        promoteToGlobal: workspaceId === getDefaultWorkspaceId(),
      });
      const result = await users.insertOne({
        email: profile.email,
        name: profile.name,
        avatar: profile.picture,
        googleId: profile.sub,
        role: bootstrapRole,
        workspaceId,
        clientId: scopedClient.clientId,
        clientName: scopedClient.clientName,
        isGlobalUser: scopedClient.isGlobalUser,
        createdAt: new Date(),
        lastLogin: new Date(),
      });
      user = await users.findOne({ _id: result.insertedId });
    } else if (!user && workspaceUsers === 0) {
      redirect('/login?error=workspace_not_ready');
    } else if (user) {
      const scopedClient = resolveClientScopeForRole({
        role: user.role,
        workspaceClientId: workspaceClient.clientId,
        workspaceClientName: workspaceClient.clientName,
        promoteToGlobal: workspaceId === getDefaultWorkspaceId(),
      });
      await users.updateOne(
        { _id: user._id },
        {
          $set: {
            name: profile.name,
            avatar: profile.picture,
            googleId: profile.sub,
            lastLogin: new Date(),
            clientId: scopedClient.clientId,
            clientName: scopedClient.clientName,
            isGlobalUser: scopedClient.isGlobalUser,
          },
        }
      );
      user = await users.findOne({ _id: user._id });
    }

    if (!user) redirect('/login?error=server');

    const roleDoc = await db.collection('roles').findOne({ slug: user.role, workspaceId });
    const permissions: string[] = Array.from(
      new Set([...(roleDoc?.permissions ?? []), ...getDefaultPermissions(user.role)])
    );

    const scopedClient = resolveClientScopeForRole({
      role: user.role,
      workspaceClientId: workspaceClient.clientId,
      workspaceClientName: workspaceClient.clientName,
      promoteToGlobal: workspaceId === getDefaultWorkspaceId(),
    });
    const sessionPayload = buildSessionPayload(
      {
        ...user,
        clientId: scopedClient.clientId,
        clientName: scopedClient.clientName,
        isGlobalUser: scopedClient.isGlobalUser,
      },
      permissions,
      'google'
    );
    const jwt = await signSession(sessionPayload);

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
      action: 'GOOGLE_AUTH_SUCCESS',
      message: `${profile.email} inicio sesion via Google OAuth (workspace: ${workspaceId})`,
      actor: actorFromRequest(req, { email: profile.email, role: user.role }),
    });
  } catch (e) {
    console.error('[google/callback]', e);
    redirect('/login?error=server');
  }

  redirect('/dashboard');
}
