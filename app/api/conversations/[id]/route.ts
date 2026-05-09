import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';
import { actorFromRequest, log } from '@/lib/logger';
import { resolveScopedWorkspaceId } from '@/lib/access-control';
import { getWorkspaceClient } from '@/lib/clients';

type RouteContext = { params: Promise<{ id: string }> };

type ConversationMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  ts: number;
};

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toTs(value: unknown, fallback: number) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function normalizeMessages(raw: any[], startTs = Date.now()): ConversationMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, index) => {
      const roleRaw = String(item?.role ?? '').toLowerCase();
      const role: ConversationMessage['role'] =
        roleRaw === 'user' ? 'user' : roleRaw === 'assistant' || roleRaw === 'agent' ? 'assistant' : 'system';
      const content = typeof item?.content === 'string' ? item.content.trim() : '';
      if (!content) return null;
      return {
        role,
        content,
        ts: toTs(item?.ts, startTs + index),
      };
    })
    .filter(Boolean) as ConversationMessage[];
}

function parseWidgetConvIdPrefixes(convId: string) {
  if (!convId.startsWith('W-')) return null;
  const parts = convId.split('-');
  if (parts.length < 3) return null;
  const visitorPrefix = String(parts[1] ?? '').trim();
  const agentPrefix = String(parts[2] ?? '').trim();
  if (!visitorPrefix) return null;
  return { visitorPrefix, agentPrefix };
}

async function loadWidgetFallbackMessages(db: Awaited<ReturnType<typeof getDb>>, conversation: any) {
  const col = db.collection('widget_conversations');
  const workspaceId = String(conversation?.workspaceId ?? '').trim();
  const visitorId = String(conversation?.visitor_id ?? '').trim();
  const agentId = String(conversation?.agent_id ?? '').trim();

  let doc: any = null;

  if (visitorId) {
    const filter: Record<string, any> = { visitorId };
    if (workspaceId) filter.workspaceId = workspaceId;
    if (agentId) filter.agentId = agentId;
    doc = await col.findOne(filter, { sort: { updatedAt: -1 } });
  }

  if (!doc && typeof conversation?.conv_id === 'string') {
    const parsed = parseWidgetConvIdPrefixes(conversation.conv_id);
    if (parsed) {
      const filter: Record<string, any> = {
        visitorId: { $regex: `^${escapeRegex(parsed.visitorPrefix)}` },
      };
      if (workspaceId) filter.workspaceId = workspaceId;
      if (parsed.agentPrefix) {
        filter.agentId = { $regex: `^${escapeRegex(parsed.agentPrefix)}` };
      }
      doc = await col.findOne(filter, { sort: { updatedAt: -1 } });
    }
  }

  return normalizeMessages(doc?.messages ?? [], Date.now());
}

export async function GET(req: Request, ctx: RouteContext) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await ctx.params;
    const { searchParams } = new URL(req.url);
    const workspaceId = resolveScopedWorkspaceId(session, searchParams.get('workspaceId'));

    const db = await getDb();

    // Core conversations (WhatsApp) have UUID string _id, not ObjectId
    if (!ObjectId.isValid(id)) {
      const coreConfig = await db.collection<any>('workspace_configs').findOne({ workspaceId, key: 'core' });
      const coreWorkspaceId = coreConfig?.coreWorkspaceId as string | undefined;
      if (!coreWorkspaceId) {
        return Response.json({ error: 'Conversation not found' }, { status: 404 });
      }
      const coreConv = await db.collection('conversations').findOne({ _id: id as any, workspaceId: coreWorkspaceId });
      if (!coreConv) {
        return Response.json({ error: 'Conversation not found' }, { status: 404 });
      }
      const rawMessages: any[] = coreConv.messages ?? [];
      const messages: ConversationMessage[] = rawMessages
        .filter((m: any) => m.role === 'user' || m.role === 'assistant')
        .map((m: any) => ({
          role: m.role as 'user' | 'assistant',
          content: String(m.content ?? '').trim(),
          ts: toTs(m.timestamp, Date.now()),
        }))
        .filter((m: any) => m.content);
      return Response.json({
        conversation: {
          _id: id,
          workspaceId,
          channel: 'whatsapp',
          user_name: coreConv.phoneNumber ?? 'WhatsApp',
          user_phone: coreConv.phoneNumber,
          status: 'open',
          model: coreConv.lastModel ?? '',
          totalTokens: coreConv.totalTokens ?? 0,
          createdAt: coreConv.createdAt,
          updatedAt: rawMessages.at(-1)?.timestamp ?? coreConv.createdAt,
          _source: 'core',
        },
        messages,
        source: 'conversation',
      });
    }

    const client = await getWorkspaceClient(db, workspaceId);
    const conversation = await db.collection('conversations').findOne({
      _id: new ObjectId(id),
      workspaceId,
      clientId: client.clientId,
    });

    if (!conversation) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const localMessages = normalizeMessages(conversation.messages ?? [], Number(conversation.updatedAt ?? Date.now()));
    let source: 'conversation' | 'widget_runtime' | 'summary' = 'conversation';
    let messages = localMessages;

    if (messages.length === 0 && String(conversation.channel ?? '') === 'widget') {
      const runtimeMessages = await loadWidgetFallbackMessages(db, conversation);
      if (runtimeMessages.length > 0) {
        messages = runtimeMessages;
        source = 'widget_runtime';
      }
    }

    if (messages.length === 0 && conversation.last_message) {
      messages = [
        {
          role: 'assistant',
          content: String(conversation.last_message),
          ts: Number(conversation.updatedAt ?? Date.now()),
        },
      ];
      source = 'summary';
    }

    return Response.json({
      conversation: {
        ...conversation,
        _id: conversation._id.toString(),
      },
      messages,
      source,
    });
  } catch (e: any) {
    return Response.json({ error: e?.message ?? 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, ctx: RouteContext) {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session.permissions, 'conversations.delete')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await ctx.params;
    if (!ObjectId.isValid(id)) {
      return Response.json({ error: 'Invalid id' }, { status: 400 });
    }
    const { searchParams } = new URL(req.url);
    const workspaceId = resolveScopedWorkspaceId(session, searchParams.get('workspaceId'));

    const db = await getDb();
    const client = await getWorkspaceClient(db, workspaceId);
    const _id = new ObjectId(id);
    const existing = await db.collection('conversations').findOne({ _id, workspaceId, clientId: client.clientId });

    if (!existing) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const result = await db.collection('conversations').deleteOne({ _id, workspaceId, clientId: client.clientId });
    if (!result.deletedCount) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 });
    }

    await log(db, {
      level: 'WARN',
      severity: 'MEDIUM',
      category: 'conversation',
      action: 'CONVERSATION_DELETED',
      message: `${session.email} elimino la conversacion ${existing?.conv_id ?? id}`,
      actor: actorFromRequest(req, { id: session.sub, email: session.email, role: session.role }),
      target: {
        type: 'conversation',
        id,
        label: String(existing?.conv_id ?? id),
      },
      metadata: {
        before: {
          conv_id: existing?.conv_id ?? null,
          user_name: existing?.user_name ?? null,
          user_email: existing?.user_email ?? null,
          channel: existing?.channel ?? null,
          status: existing?.status ?? null,
          updatedAt: existing?.updatedAt ?? null,
        },
      },
      http: {
        method: 'DELETE',
        path: `/api/conversations/${id}`,
        statusCode: 200,
      },
    });

    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ error: e?.message ?? 'Internal error' }, { status: 500 });
  }
}
