import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { generateAgentReply, type ChatTurn, type AgentRuntime } from '@/lib/ai-orchestrator';
import { writeLog } from '@/app/api/admin/logs/route';
import { bumpInteractionUsage } from '@/lib/usage-meter';
import { trackWidgetInstallSource } from '@/lib/widget-install-tracker';
import { resolveWidgetWorkspace } from '@/lib/widget-auth';
import { getWorkspaceConfig } from '@/lib/workspace-config';
import { getWorkspaceClient } from '@/lib/clients';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
};

type PersistedWidgetMessage = {
  role: 'user' | 'assistant';
  content: string;
  ts: number;
  attachments?: WidgetAttachment[];
};

type UsageStats = {
  input: number;
  output: number;
  total: number;
};

type WidgetAttachment = {
  kind: 'image' | 'file' | 'audio';
  name: string;
  type: string;
  size: number;
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

function genConvId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return 'CNV-' + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function normalizeText(value: string) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function sanitizeHistory(historyRaw: any[]): ChatTurn[] {
  return historyRaw
    .filter((m: any) => (m?.role === 'user' || m?.role === 'assistant') && typeof m?.content === 'string')
    .map((m: any) => ({ role: m.role, content: String(m.content) }))
    .slice(-12);
}

function sanitizeAttachments(raw: any[]): WidgetAttachment[] {
  return (raw || [])
    .filter((a: any) => a && typeof a === 'object')
    .map((a: any) => {
      const kind: WidgetAttachment['kind'] =
        a?.kind === 'audio' ? 'audio' : a?.kind === 'image' ? 'image' : 'file';
      return {
        kind,
        name: String(a?.name ?? 'adjunto').slice(0, 200),
        type: String(a?.type ?? 'application/octet-stream').slice(0, 120),
        size: Number.isFinite(Number(a?.size)) ? Math.max(0, Number(a.size)) : 0,
      };
    })
    .slice(0, 8);
}

function attachmentSummary(attachments: WidgetAttachment[]) {
  if (!attachments.length) return '';
  const byType = {
    image: attachments.filter((a) => a.kind === 'image').length,
    file: attachments.filter((a) => a.kind === 'file').length,
    audio: attachments.filter((a) => a.kind === 'audio').length,
  };
  return [
    'Adjuntos del usuario:',
    byType.image ? `- imagenes: ${byType.image}` : '',
    byType.file ? `- archivos: ${byType.file}` : '',
    byType.audio ? `- notas de voz: ${byType.audio}` : '',
    ...attachments.map((a) => `- ${a.kind}: ${a.name} (${a.type}, ${a.size} bytes)`),
  ]
    .filter(Boolean)
    .join('\n');
}

function buildMessageForInference(message: string, attachments: WidgetAttachment[]) {
  const cleanMessage = String(message || '').trim();
  if (!attachments.length) return cleanMessage;
  const summary = attachmentSummary(attachments);
  if (!cleanMessage) return summary;
  return `${cleanMessage}\n\n${summary}`;
}

function historyForInference(history: ChatTurn[], message: string) {
  const last = history.length > 0 ? history[history.length - 1] : null;
  if (last?.role === 'user' && normalizeText(last.content) === normalizeText(message)) {
    return history.slice(0, -1);
  }
  return history;
}

function estimateTokens(text: string) {
  const compact = String(text || '').trim();
  if (!compact) return 0;
  // Generic estimator for UI/accounting when provider usage is unavailable.
  return Math.max(1, Math.ceil(compact.length / 4));
}

function buildUsageEstimate(args: {
  agent: AgentRuntime;
  history: ChatTurn[];
  message: string;
  reply: string;
}): UsageStats {
  const agentContext = [
    args.agent.name || '',
    args.agent.profile?.systemPrompt || '',
    args.agent.profile?.personality || '',
    Array.isArray(args.agent.profile?.languages) ? args.agent.profile?.languages.join(', ') : '',
    args.agent.corporateContext || '',
    Array.isArray(args.agent.skills) ? args.agent.skills.join(', ') : '',
  ]
    .filter(Boolean)
    .join('\n');

  const inputText = [
    agentContext,
    ...args.history.map((turn) => `${turn.role}: ${turn.content}`),
    `user: ${args.message}`,
  ]
    .filter(Boolean)
    .join('\n');

  const input = estimateTokens(inputText);
  const output = estimateTokens(args.reply);
  return {
    input,
    output,
    total: input + output,
  };
}

function baseWidgetConversationRef(visitorId: string, agentId: string) {
  return `W-${visitorId.slice(0, 12)}-${agentId.slice(0, 6)}`.replace(/[^A-Za-z0-9_-]/g, '');
}

function toSafePositiveInt(value: unknown, fallback: number, min = 1, max = 10_000) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
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
    const attachmentsRaw = Array.isArray(body?.attachments) ? body.attachments : [];
    const attachments = sanitizeAttachments(attachmentsRaw);
    const messageForModel = buildMessageForInference(message, attachments);

    if (!messageForModel) return Response.json({ error: 'message is required' }, { status: 400, headers: CORS });

    const db = await getDb();
    const resolvedWorkspace = await resolveWidgetWorkspace({ db, req, key, agentId });
    if (!resolvedWorkspace) {
      return Response.json({ error: 'Unauthorized key' }, { status: 401, headers: CORS });
    }
    const account = await getWorkspaceConfig(db, resolvedWorkspace, 'account', {
      defaults: { timezone: 'America/Bogota', api_key: '' } as any,
    });
    const widgetCfg = await getWorkspaceConfig(db, resolvedWorkspace, 'widget', {
      defaults: { closeOnInactivity: true, inactivityCloseMinutes: 15 } as any,
    });

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
        workspaceId: resolvedWorkspace,
        detail: `origin=${origin || 'n/a'} referer=${referer || 'n/a'}`,
      });
      return Response.json({ error: 'Unauthorized key' }, { status: 401, headers: CORS });
    }
    await trackWidgetInstallSource({ db, workspaceId: resolvedWorkspace, origin, referer }).catch(() => {});

    const history = sanitizeHistory(historyRaw);
    const modelHistory = historyForInference(history, messageForModel);
    const safeAgentId = agentId || 'default';
    const convBase = visitorId ? baseWidgetConversationRef(visitorId, safeAgentId) : '';

    let agentDoc: any = null;
    if (agentId && agentId !== 'default' && ObjectId.isValid(agentId)) {
      agentDoc = await db.collection('agents_v2').findOne({ _id: new ObjectId(agentId), workspaceId: resolvedWorkspace });
    }
    if (!agentDoc) {
      agentDoc = await db.collection('agents_v2').findOne(
        { workspaceId: resolvedWorkspace, status: 'active', 'channels.web': true },
        { sort: { updatedAt: -1 } }
      );
    }

    if (agentDoc?.webWidgetToken && agentToken && agentToken !== agentDoc.webWidgetToken) {
      return Response.json({ error: 'Invalid agent token' }, { status: 401, headers: CORS });
    }

    const workspaceId = String(agentDoc?.workspaceId ?? resolvedWorkspace);
    const workspaceClient = await getWorkspaceClient(db, workspaceId);
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
      message: messageForModel,
      history: modelHistory,
    });

    for (const at of result.attempts ?? []) {
      if (at.status === 'error') {
        await writeLog({
          level: at.isQuotaOrTokens ? 'error' : 'warn',
          source: 'widget-reply',
          workspaceId,
          msg: `Intento fallido ${at.provider}/${at.model} [${at.errorType ?? 'unknown'}]`,
          detail: at.reason ?? 'error',
        }).catch(() => {});
      }
    }

    if (result.fallbackUsed || (Array.isArray(result.errors) && result.errors.length > 0)) {
      await writeLog({
        level: 'warn',
        source: 'widget-reply',
        workspaceId,
        msg: `Reply con degradacion (${result.fallbackType ?? 'none'})`,
        detail: (result.errors ?? []).slice(-4).join(' | '),
      }).catch(() => {});
    }

    const usage = buildUsageEstimate({
      agent,
      history: modelHistory,
      message: messageForModel,
      reply: result.reply,
    });

    let persistedConvRef = convBase;

    if (visitorId) {
      const now = new Date();
      const nowMs = now.getTime();
      const inactivityEnabled = widgetCfg?.closeOnInactivity !== false;
      const inactivityMinutes = toSafePositiveInt(widgetCfg?.inactivityCloseMinutes, 15, 1, 240);
      const inactivityCutoffMs = nowMs - inactivityMinutes * 60 * 1000;

      const latestOpen = await db.collection('conversations').findOne(
        {
          workspaceId,
          $or: [{ clientId: workspaceClient.clientId }, { clientId: { $exists: false } }],
          channel: 'widget',
          visitor_id: visitorId,
          agent_id: safeAgentId,
          status: 'open',
        },
        { sort: { updatedAt: -1 }, projection: { _id: 1, conv_id: 1, updatedAt: 1 } }
      );

      if (latestOpen?.conv_id) persistedConvRef = String(latestOpen.conv_id);

      if (
        inactivityEnabled &&
        latestOpen?._id &&
        Number(latestOpen.updatedAt ?? 0) > 0 &&
        Number(latestOpen.updatedAt) < inactivityCutoffMs
      ) {
        await db.collection('conversations').updateOne(
          {
            _id: latestOpen._id,
            workspaceId,
            $or: [{ clientId: workspaceClient.clientId }, { clientId: { $exists: false } }],
          },
          {
            $set: {
              status: 'closed',
              closedAt: nowMs,
              closureReason: 'inactivity_timeout',
              autoClosed: true,
              updatedAt: nowMs,
            },
          }
        );

        persistedConvRef = `${convBase}-${nowMs.toString(36)}`;
        await writeLog({
          level: 'info',
          source: 'widget-conversation',
          workspaceId,
          msg: 'Conversacion cerrada por inactividad',
          detail: `${latestOpen.conv_id} (${inactivityMinutes}m)`,
        }).catch(() => {});
      }

      const previewMessage = result.reply.slice(0, 280);
      const who = visitorId.startsWith('v_') ? 'Visitante web' : visitorId;
      const newTurns: PersistedWidgetMessage[] = [
        { role: 'user', content: messageForModel, ts: nowMs, ...(attachments.length ? { attachments } : {}) },
        { role: 'assistant', content: result.reply, ts: nowMs + 1 },
      ];

      await db.collection('conversations').updateOne(
        {
          workspaceId,
          conv_id: persistedConvRef,
          channel: 'widget',
          $or: [{ clientId: workspaceClient.clientId }, { clientId: { $exists: false } }],
        },
        {
          $set: {
            workspaceId,
            clientId: workspaceClient.clientId,
            clientName: workspaceClient.clientName,
            user_name: who,
            user_email: '',
            last_message: previewMessage,
            status: 'open',
            channel: 'widget',
            agent: agentDoc?.name ?? 'Asistente Web',
            model: result.model,
            model_label: result.model,
            model_provider: result.provider,
            visitor_id: visitorId,
            agent_id: safeAgentId,
            closedAt: null,
            closureReason: null,
            autoClosed: false,
            updatedAt: nowMs,
          },
          $inc: {
            message_count: newTurns.length,
            'tokens.input': usage.input,
            'tokens.output': usage.output,
            'tokens.total': usage.total,
          },
          $push: {
            messages: {
              $each: newTurns,
              $slice: -600,
            },
          },
          $setOnInsert: {
            createdAt: now,
            conv_id: persistedConvRef || genConvId(),
          },
        } as any,
        { upsert: true }
      );
    }

    try {
      await bumpInteractionUsage(db, {
        workspaceId,
        channel: 'widget',
        count: 1,
        provider: result.provider,
        model: result.model,
        conversationRef: persistedConvRef || undefined,
        visitorId: visitorId || undefined,
        agentId: safeAgentId || undefined,
        preview: message.slice(0, 200),
        timeZone: String(account?.timezone ?? 'America/Bogota'),
      });
    } catch (usageErr: any) {
      await writeLog({
        level: 'warn',
        source: 'widget-reply',
        workspaceId,
        msg: 'No se pudo registrar uso de interacciones',
        detail: usageErr?.message ?? 'unknown',
      }).catch(() => {});
    }

    await writeLog({
      level: 'info',
      source: 'widget-reply',
      workspaceId,
      msg: 'Reply IA generado',
      detail: `${result.provider}/${result.model}`,
    }).catch(() => {});

    return Response.json({ ...result, usage, conversationRef: persistedConvRef || null }, { headers: CORS });
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
