import { getDb } from '@/lib/mongodb';
import { writeLog } from '@/app/api/admin/logs/route';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
};

function baseWidgetConversationRef(visitorId: string, agentId: string) {
  return `W-${visitorId.slice(0, 12)}-${agentId.slice(0, 6)}`.replace(/[^A-Za-z0-9_-]/g, '');
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const key = String(body?.key ?? '').trim();
    const visitorId = String(body?.visitorId ?? '').trim();
    const agentId = String(body?.agentId ?? 'default').trim();
    const helpful = Boolean(body?.helpful);
    const reason = String(body?.reason ?? '').trim().slice(0, 400);
    let conversationRef = String(body?.conversationRef ?? '').trim();

    if (!visitorId) {
      return Response.json({ error: 'visitorId is required' }, { status: 400, headers: CORS });
    }

    const db = await getDb();
    const account = await db.collection('config').findOne({ _id: 'account' as any });
    if (!account || !key || key !== account.api_key) {
      return Response.json({ error: 'Unauthorized key' }, { status: 401, headers: CORS });
    }

    if (!conversationRef) {
      const baseRef = baseWidgetConversationRef(visitorId, agentId);
      const latest = await db.collection('conversations').findOne(
        {
          channel: 'widget',
          visitor_id: visitorId,
          agent_id: agentId,
          conv_id: { $regex: `^${baseRef}` },
        },
        { sort: { updatedAt: -1 }, projection: { conv_id: 1 } }
      );
      conversationRef = String(latest?.conv_id ?? baseRef);
    }

    const now = Date.now();
    const result = await db.collection('conversations').updateOne(
      { conv_id: conversationRef, channel: 'widget' },
      {
        $set: {
          status: 'closed',
          closedAt: now,
          closureReason: 'user_feedback',
          updatedAt: now,
          feedback: {
            helpful,
            reason,
            submittedAt: now,
            source: 'widget',
          },
        },
      }
    );

    if (!result.matchedCount) {
      return Response.json({ error: 'Conversation not found' }, { status: 404, headers: CORS });
    }

    await writeLog({
      level: 'info',
      source: 'widget-feedback',
      msg: `Feedback recibido: ${helpful ? 'helpful' : 'not_helpful'}`,
      detail: `${conversationRef}${reason ? ` | ${reason}` : ''}`,
    }).catch(() => {});

    return Response.json({ ok: true, conversationRef, helpful }, { headers: CORS });
  } catch (e: any) {
    await writeLog({
      level: 'error',
      source: 'widget-feedback',
      msg: 'Error registrando feedback de widget',
      detail: e?.message ?? 'unknown',
    }).catch(() => {});
    return Response.json({ error: e?.message ?? 'Internal error' }, { status: 500, headers: CORS });
  }
}

