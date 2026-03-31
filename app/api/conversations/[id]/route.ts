import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';

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
  const visitorId = String(conversation?.visitor_id ?? '').trim();
  const agentId = String(conversation?.agent_id ?? '').trim();

  let doc: any = null;

  if (visitorId) {
    const filter: Record<string, any> = { visitorId };
    if (agentId) filter.agentId = agentId;
    doc = await col.findOne(filter, { sort: { updatedAt: -1 } });
  }

  if (!doc && typeof conversation?.conv_id === 'string') {
    const parsed = parseWidgetConvIdPrefixes(conversation.conv_id);
    if (parsed) {
      const filter: Record<string, any> = {
        visitorId: { $regex: `^${escapeRegex(parsed.visitorPrefix)}` },
      };
      if (parsed.agentPrefix) {
        filter.agentId = { $regex: `^${escapeRegex(parsed.agentPrefix)}` };
      }
      doc = await col.findOne(filter, { sort: { updatedAt: -1 } });
    }
  }

  return normalizeMessages(doc?.messages ?? [], Date.now());
}

export async function GET(_req: Request, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    if (!ObjectId.isValid(id)) {
      return Response.json({ error: 'Invalid id' }, { status: 400 });
    }

    const db = await getDb();
    const conversation = await db.collection('conversations').findOne({ _id: new ObjectId(id) });

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
