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
    const origin = String(req.headers.get('origin') ?? '').trim();
    const referer = String(req.headers.get('referer') ?? '').trim();
    const visitorId = String(body?.visitorId ?? '').trim();
    const agentId = String(body?.agentId ?? 'default').trim();
    const agentToken = String(body?.agentToken ?? '').trim();
    const message = String(body?.message ?? '').trim();
    const historyRaw = Array.isArray(body?.history) ? body.history : [];

    if (!message) return Response.json({ error: 'message is required' }, { status: 400, headers: CORS });

    const db = await getDb();
    const account = await db.collection('config').findOne({ _id: 'account' as any });

    const trustedOrigins = new Set(['https://orqo.io', 'https://www.orqo.io', 'http://localhost:3000']);
    const trustedByOrigin = trustedOrigins.has(origin);
    const trustedByReferer = (() => {
      try {
        if (!referer) return false;
        const u = new URL(referer);
        return trustedOrigins.has(`${u.protocol}//${u.host}`);
      } catch {
        return false;
      }
    })();

    const keyIsValid = !!account && !!key && account.api_key === key;
    if (!keyIsValid && !trustedByOrigin && !trustedByReferer) {
      await writeLog({
        level: 'warn',
        source: 'widget-reply',
        msg: 'API key invalida en reply',
        detail: `origin=${origin || 'n/a'} referer=${referer || 'n/a'}`,
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
            systemPrompt: 'Responde de forma util y clara, en espanol por defecto.',
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

    for (const at of result.attempts ?? []) {
      if (at.status === 'error') {
        await writeLog({
          level: at.isQuotaOrTokens ? 'error' : 'warn',
          source: 'widget-reply',
          msg: `Intento fallido ${at.provider}/${at.model} [${at.errorType ?? 'unknown'}]`,
          detail: at.reason ?? 'error',
        }).catch(() => {});
      }
    }

    if (result.fallbackUsed || (Array.isArray(result.errors) && result.errors.length > 0)) {
      await writeLog({
        level: 'warn',
        source: 'widget-reply',
        msg: `Reply con degradacion (${result.fallbackType ?? 'none'})`,
        detail: (result.errors ?? []).slice(-4).join(' | '),
      }).catch(() => {});
    }

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
            message_count: history.length + 2,
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
