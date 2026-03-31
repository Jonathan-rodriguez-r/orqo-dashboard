import { getDb } from '@/lib/mongodb';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

// GET ?visitorId=xxx&agentId=xxx -> returns conversation messages
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const visitorId = searchParams.get('visitorId') ?? '';
  const agentId = searchParams.get('agentId') ?? '';

  if (!visitorId) return Response.json({ messages: [] }, { headers: CORS });

  try {
    const db = await getDb();
    const filter: Record<string, string> = { visitorId };
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

// POST { visitorId, agentId, role, content, metadata? } -> saves message, returns convId
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { visitorId, agentId, role, content, metadata } = body;

    if (!visitorId || !role || !content) {
      return Response.json({ error: 'visitorId, role, content are required' }, { status: 400, headers: CORS });
    }

    const db = await getDb();
    const now = new Date();
    const msg = { role, content, ts: now };

    const result = await db.collection('widget_conversations').findOneAndUpdate(
      { visitorId, agentId: agentId ?? 'default' },
      {
        $push: { messages: msg } as any,
        $set: { updatedAt: now, ...(metadata ? { metadata } : {}) },
        $setOnInsert: { visitorId, agentId: agentId ?? 'default', createdAt: now },
      },
      { upsert: true, returnDocument: 'after' }
    );

    const convId = result?._id?.toString() ?? '';
    return Response.json({ ok: true, convId }, { headers: CORS });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500, headers: CORS });
  }
}

// DELETE { visitorId, agentId? } -> clears runtime widget history only.
// The dashboard conversations collection is intentionally not deleted.
export async function DELETE(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const visitorId = String(body?.visitorId ?? '').trim();
    const agentId = String(body?.agentId ?? '').trim();

    if (!visitorId) {
      return Response.json({ error: 'visitorId is required' }, { status: 400, headers: CORS });
    }

    const db = await getDb();
    const widgetFilter: Record<string, string> = { visitorId };
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
