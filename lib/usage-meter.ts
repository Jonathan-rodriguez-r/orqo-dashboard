import type { Db } from 'mongodb';

const MONTHLY_USAGE_COLLECTION = 'usage_monthly';
const USAGE_EVENTS_COLLECTION = 'usage_events';

type UsageBumpInput = {
  workspaceId: string;
  channel: string;
  count?: number;
  provider?: string;
  model?: string;
  conversationRef?: string;
  visitorId?: string;
  agentId?: string;
  preview?: string;
  timeZone?: string;
  now?: Date;
};

function safeTimeZone(raw: string | undefined) {
  const candidate = String(raw || '').trim();
  if (!candidate) return 'America/Bogota';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: candidate }).format(new Date());
    return candidate;
  } catch {
    return 'America/Bogota';
  }
}

function keyParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((p) => p.type === 'year')?.value ?? '1970';
  const month = parts.find((p) => p.type === 'month')?.value ?? '01';
  const day = parts.find((p) => p.type === 'day')?.value ?? '01';
  return { year, month, day };
}

function safeDimensionKey(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\$/g, '')
    .replace(/\./g, '_')
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
}

export function interactionPeriodKey(date = new Date(), timeZone = 'America/Bogota') {
  const tz = safeTimeZone(timeZone);
  const { year, month } = keyParts(date, tz);
  return `${year}-${month}`;
}

export async function getCurrentPeriodUsage(args: {
  db: Db;
  workspaceId: string;
  timeZone?: string;
  now?: Date;
}) {
  const monthlyCollection = args.db.collection<any>(MONTHLY_USAGE_COLLECTION);
  const now = args.now ?? new Date();
  const tz = safeTimeZone(args.timeZone);
  const periodKey = interactionPeriodKey(now, tz);
  const monthlyId = `${args.workspaceId}:${periodKey}`;
  let doc = await monthlyCollection.findOne({ _id: monthlyId });

  if (!doc) {
    const account = await args.db
      .collection('config')
      .findOne({ _id: 'account' as any }, { projection: { interactions_used: 1 } });
    const legacyUsed = Math.max(0, Number(account?.interactions_used ?? 0));
    if (legacyUsed > 0) {
      await monthlyCollection.updateOne(
        { _id: monthlyId },
        {
          $setOnInsert: {
            _id: monthlyId,
            workspaceId: args.workspaceId,
            periodKey,
            createdAt: now,
            interactions: legacyUsed,
          },
          $set: {
            updatedAt: now,
          },
        },
        { upsert: true }
      );
      doc = await monthlyCollection.findOne({ _id: monthlyId });
    }
  }

  return {
    periodKey,
    timeZone: tz,
    interactions: Math.max(0, Number(doc?.interactions ?? 0)),
  };
}

export async function bumpInteractionUsage(db: Db, input: UsageBumpInput) {
  const now = input.now ?? new Date();
  const count = Math.max(0, Math.floor(Number(input.count ?? 1)));
  if (!count) {
    const snapshot = await getCurrentPeriodUsage({
      db,
      workspaceId: input.workspaceId,
      timeZone: input.timeZone,
      now,
    });
    return { ...snapshot, total: snapshot.interactions };
  }

  const tz = safeTimeZone(input.timeZone);
  const { year, month, day } = keyParts(now, tz);
  const periodKey = `${year}-${month}`;
  const dayKey = `${year}-${month}-${day}`;
  const monthlyId = `${input.workspaceId}:${periodKey}`;
  const dayId = `${input.workspaceId}:${dayKey}`;
  const monthlyCollection = db.collection<any>(MONTHLY_USAGE_COLLECTION);
  const monthlyExists = await monthlyCollection.findOne({ _id: monthlyId }, { projection: { _id: 1 } });
  let legacyBase = 0;
  if (!monthlyExists) {
    const account = await db
      .collection('config')
      .findOne({ _id: 'account' as any }, { projection: { interactions_used: 1 } });
    legacyBase = Math.max(0, Number(account?.interactions_used ?? 0));
    if (legacyBase > 0) {
      await monthlyCollection.updateOne(
        { _id: monthlyId },
        {
          $setOnInsert: {
            _id: monthlyId,
            workspaceId: input.workspaceId,
            periodKey,
            createdAt: now,
            interactions: legacyBase,
          },
        },
        { upsert: true }
      );
    }
  }

  const channel = safeDimensionKey(input.channel || 'unknown') || 'unknown';
  const provider = safeDimensionKey(input.provider || '');
  const model = safeDimensionKey(input.model || '');

  const inc: Record<string, number> = {
    interactions: count,
    [`by_channel.${channel}`]: count,
  };
  if (provider) inc[`by_provider.${provider}`] = count;
  if (model) inc[`by_model.${model}`] = count;

  const monthly = await monthlyCollection.findOneAndUpdate(
    { _id: monthlyId },
    {
      $setOnInsert: {
        _id: monthlyId,
        workspaceId: input.workspaceId,
        periodKey,
        createdAt: now,
      },
      $set: {
        updatedAt: now,
      },
      $inc: inc,
    },
    { upsert: true, returnDocument: 'after' }
  );

  await db.collection<any>('usage_daily').updateOne(
    { _id: dayId },
    {
      $setOnInsert: {
        _id: dayId,
        workspaceId: input.workspaceId,
        periodKey,
        dayKey,
        createdAt: now,
      },
      $set: {
        updatedAt: now,
      },
      $inc: {
        interactions: count,
        [`by_channel.${channel}`]: count,
      },
    },
    { upsert: true }
  );

  await db.collection<any>(USAGE_EVENTS_COLLECTION).insertOne({
    workspaceId: input.workspaceId,
    periodKey,
    dayKey,
    ts: now.getTime(),
    at: now,
    count,
    channel,
    provider: input.provider ?? null,
    model: input.model ?? null,
    conversationRef: input.conversationRef ?? null,
    visitorId: input.visitorId ?? null,
    agentId: input.agentId ?? null,
    preview: String(input.preview ?? '').slice(0, 200),
  });

  return {
    periodKey,
    timeZone: tz,
    total: Math.max(0, Number(monthly?.interactions ?? 0)),
  };
}
