import { getDb } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { resolveScopedWorkspaceId } from '@/lib/access-control';
import { getWorkspaceClient } from '@/lib/clients';

function normalizeHexColor(value: unknown) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const withHash = raw.startsWith('#') ? raw : `#${raw}`;
  if (!/^#[0-9a-fA-F]{6}$/.test(withHash)) return '';
  return withHash.toUpperCase();
}

const DEFAULT_PREFS = {
  dashboardTheme: {
    enabled: false,
    primaryColor: '',
    secondaryColor: '',
  },
};

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const workspaceId = resolveScopedWorkspaceId(session, searchParams.get('workspaceId'));
  const db = await getDb();
  const client = await getWorkspaceClient(db, workspaceId);

  await db.collection('user_preferences').createIndex({ userId: 1, workspaceId: 1 }, { unique: true });

  const doc = await db.collection('user_preferences').findOne(
    { userId: session.sub, workspaceId, clientId: client.clientId },
    { projection: { _id: 0, dashboardTheme: 1, updatedAt: 1 } }
  );

  const primary = normalizeHexColor(doc?.dashboardTheme?.primaryColor);
  const secondary = normalizeHexColor(doc?.dashboardTheme?.secondaryColor);

  return Response.json({
    ...DEFAULT_PREFS,
    ...(doc ?? {}),
    dashboardTheme: {
      enabled: Boolean(doc?.dashboardTheme?.enabled),
      primaryColor: primary,
      secondaryColor: secondary,
    },
  });
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const workspaceId = resolveScopedWorkspaceId(session, body.workspaceId ?? body.workspace_id ?? null);
  const enabled = Boolean(body?.dashboardTheme?.enabled);
  const primaryColor = normalizeHexColor(body?.dashboardTheme?.primaryColor);
  const secondaryColor = normalizeHexColor(body?.dashboardTheme?.secondaryColor);

  const db = await getDb();
  await db.collection('user_preferences').createIndex({ userId: 1, workspaceId: 1 }, { unique: true });
  const client = await getWorkspaceClient(db, workspaceId);

  await db.collection('user_preferences').updateOne(
    { userId: session.sub, workspaceId, clientId: client.clientId },
    {
      $set: {
        userId: session.sub,
        email: session.email,
        workspaceId,
        clientId: client.clientId,
        clientName: client.clientName,
        dashboardTheme: {
          enabled,
          primaryColor: enabled ? primaryColor : '',
          secondaryColor: enabled ? secondaryColor : '',
        },
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );

  return Response.json({ ok: true });
}
