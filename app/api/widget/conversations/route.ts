import { getDb } from '@/lib/mongodb';
import { resolveWidgetWorkspace } from '@/lib/widget-auth';
import { getWorkspaceConfig } from '@/lib/workspace-config';
import { getWorkspaceClient } from '@/lib/clients';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

async function validateWorkspaceKey(args: {
  db: Awaited<ReturnType<typeof getDb>>;
  req: Request;
  key: string;
  agentId?: string;
}) {
  const workspaceId = await resolveWidgetWorkspace({ db: args.db, req: args.req, key: args.key, agentId: args.agentId });
  if (!workspaceId) return null;
  const account = await getWorkspaceConfig(args.db, workspaceId, 'account', { defaults: { api_key: '' } as any });
  if (!account || !args.key || args.key !== account.api_key) return null;
  return workspaceId;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const visitorId = String(searchParams.get('visitorId') ?? '').trim();
  const agentId = String(searchParams.get('agentId') ?? '').trim();
  const key = String(searchParams.get('key') ?? '').trim();

  if (!visitorId) return Response.json({ messages: [] }, { headers: CORS });

  try {
    const db = await getDb();
    const workspaceId = await validateWorkspaceKey({ db, req, key, agentId });
    if (!workspaceId) return Response.json({ error: 'Unauthorized key', messages: [] }, { status: 401, headers: CORS });
    const client = await getWorkspaceClient(db, workspaceId);

    const filter: Record<string, any> = {
      visitorId,
      workspaceId,
      $or: [{ clientId: client.clientId }, { clientId: { $exists: false } }],
    };
    if (agentId) filter.agentId = agentId;

    const conv = await db
      .collection('widget_conversations')
      .findOne(filter, { sort: { updatedAt: -1 } });

    if (!conv) return Response.json({ messages: [], convId: null }, { headers: CORS });

    return Response.json(
      {
        convId: conv._id.toString(),
        messages: conv.messages ?? [],
      },
      { headers: CORS }
    );
  } catch (e: any) {
    return Response.json({ messages: [], error: e.message }, { headers: CORS });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { visitorId, agentId, role, content, metadata } = body;
    const key = String(body?.key ?? '').trim();

    if (!visitorId || !role || !content) {
      return Response.json({ error: 'visitorId, role, content are required' }, { status: 400, headers: CORS });
    }

    const db = await getDb();
    const workspaceId = await validateWorkspaceKey({ db, req, key, agentId });
    if (!workspaceId) return Response.json({ error: 'Unauthorized key' }, { status: 401, headers: CORS });
    const client = await getWorkspaceClient(db, workspaceId);

    const now = new Date();
    const msg = { role, content, ts: now };

    const result = await db.collection('widget_conversations').findOneAndUpdate(
      {
        workspaceId,
        visitorId,
        agentId: agentId ?? 'default',
        $or: [{ clientId: client.clientId }, { clientId: { $exists: false } }],
      },
      {
        $push: { messages: msg } as any,
        $set: {
          updatedAt: now,
          clientId: client.clientId,
          clientName: client.clientName,
          ...(metadata ? { metadata } : {}),
        },
        $setOnInsert: {
          workspaceId,
          clientId: client.clientId,
          clientName: client.clientName,
          visitorId,
          agentId: agentId ?? 'default',
          createdAt: now,
        },
      },
      { upsert: true, returnDocument: 'after' }
    );

    const convId = result?._id?.toString() ?? '';
    return Response.json({ ok: true, convId }, { headers: CORS });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500, headers: CORS });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const visitorId = String(body?.visitorId ?? '').trim();
    const agentId = String(body?.agentId ?? '').trim();
    const key = String(body?.key ?? '').trim();

    if (!visitorId) {
      return Response.json({ error: 'visitorId is required' }, { status: 400, headers: CORS });
    }

    const db = await getDb();
    const workspaceId = await validateWorkspaceKey({ db, req, key, agentId });
    if (!workspaceId) return Response.json({ error: 'Unauthorized key' }, { status: 401, headers: CORS });
    const client = await getWorkspaceClient(db, workspaceId);

    const widgetFilter: Record<string, any> = {
      workspaceId,
      visitorId,
      $or: [{ clientId: client.clientId }, { clientId: { $exists: false } }],
    };
    if (agentId) widgetFilter.agentId = agentId;

    const widgetDelete = await db.collection('widget_conversations').deleteMany(widgetFilter);

    return Response.json(
      {
        ok: true,
        deleted: {
          widget_conversations: widgetDelete.deletedCount ?? 0,
        },
      },
      { headers: CORS }
    );
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500, headers: CORS });
  }
}
