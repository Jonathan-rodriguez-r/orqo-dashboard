import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { generateAgentReply, type ChatTurn, type AgentRuntime } from '@/lib/ai-orchestrator';
import { writeLog } from '@/app/api/admin/logs/route';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

function genConvId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return 'CNV-' + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const key = String(body?.key ?? '').trim();
    const visitorId = String(body?.visitorId ?? '').trim();
    const agentId = String(body?.agentId ?? 'default').trim();
    const agentToken = String(body?.agentToken ?? '').trim();
    const message = String(body?.message ?? '').trim();
    const historyRaw = Array.isArray(body?.history) ? body.history : [];

    if (!key) return Response.json({ error: 'key is required' }, { status: 400, headers: CORS });
    if (!message) return Response.json({ error: 'message is required' }, { status: 400, headers: CORS });

    const db = await getDb();
    const account = await db.collection('config').findOne({ _id: 'account' as any });
    if (!account || account.api_key !== key) {
      await writeLog({
        level: 'warn',
        source: 'widget-reply',
        msg: 'API key inválida en reply',
      });
      return Response.json({ error: 'Unauthorized key' }, { status: 401, headers: CORS });
    }

    const history: ChatTurn[] = historyRaw
      .filter((m: any) => (m?.role === 'user' || m?.role === 'assistant') && typeof m?.content === 'string')
      .map((m: any) => ({ role: m.role, content: m.content }))
      .slice(-12);

    let agentDoc: any = null;
    if (agentId && agentId !== 'default' && ObjectId.isValid(agentId)) {
      agentDoc = await db.collection('agents_v2').findOne({ _id: new ObjectId(agentId) });
    }
    if (!agentDoc) {
      agentDoc = await db.collection('agents_v2').findOne(
        { status: 'active', 'channels.web': true },
        { sort: { updatedAt: -1 } }
      );
    }

    if (agentDoc?.webWidgetToken && agentToken && agentToken !== agentDoc.webWidgetToken) {
      return Response.json({ error: 'Invalid agent token' }, { status: 401, headers: CORS });
    }

    const workspaceId = String(agentDoc?.workspaceId ?? 'default');
    const agent: AgentRuntime = agentDoc
      ? {
          name: agentDoc.name,
          profile: agentDoc.profile,
          corporateContext: agentDoc.corporateContext,
          skills: agentDoc.skills,
          advanced: agentDoc.advanced,
        }
      : {
          name: 'Asistente ORQO',
          profile: {
            systemPrompt: 'Responde de forma útil y clara, en español por defecto.',
            personality: 'professional',
            languages: ['auto'],
            responseLength: 'standard',
          },
        };

    const result = await generateAgentReply({
      db,
      workspaceId,
      agent,
      message,
      history,
    });

    // Persist lightweight operational conversation for dashboard list.
    if (visitorId) {
      const now = new Date();
      const updatedAt = now.getTime();
      const previewMessage = result.reply.slice(0, 280);
      const who = visitorId.startsWith('v_') ? 'Visitante web' : visitorId;
      const convId = `W-${visitorId.slice(0, 12)}-${(agentId || 'default').slice(0, 6)}`.replace(/[^A-Za-z0-9_-]/g, '');

      await db.collection('conversations').updateOne(
        { conv_id: convId, channel: 'widget' },
        {
          $set: {
            workspaceId,
            user_name: who,
            user_email: '',
            last_message: previewMessage,
            message_count: (history.length + 2),
            status: 'open',
            channel: 'widget',
            agent: agentDoc?.name ?? 'Asistente Web',
            model: result.model,
            model_label: result.model,
            model_provider: result.provider,
            updatedAt,
          },
          $setOnInsert: {
            createdAt: now,
            conv_id: convId || genConvId(),
            tokens: { input: 0, output: 0, total: 0 },
          },
        },
        { upsert: true }
      );
    }

    await writeLog({
      level: 'info',
      source: 'widget-reply',
      msg: 'Reply IA generado',
      detail: `${result.provider}/${result.model}`,
    }).catch(() => {});

    return Response.json(result, { headers: CORS });
  } catch (e: any) {
    await writeLog({
      level: 'error',
      source: 'widget-reply',
      msg: 'Error en widget reply',
      detail: e?.message ?? 'unknown',
    }).catch(() => {});

    return Response.json({ error: e?.message ?? 'Internal error' }, { status: 500, headers: CORS });
  }
}
