import { getDb } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { getCurrentPeriodUsage, interactionPeriodKey } from '@/lib/usage-meter';
import { getWorkspaceConfig } from '@/lib/workspace-config';
import { resolveScopedWorkspaceId } from '@/lib/access-control';

function validPeriodKey(raw: string) {
  const value = String(raw || '').trim();
  return /^\d{4}-\d{2}$/.test(value) ? value : '';
}

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const workspaceId = resolveScopedWorkspaceId(session, searchParams.get('workspaceId'));
    const account = await getWorkspaceConfig(db, workspaceId, 'account', {
      defaults: { timezone: 'America/Bogota' } as any,
    });

    const usageMonthly = db.collection<any>('usage_monthly');
    const usageEvents = db.collection<any>('usage_events');

    const workspace = workspaceId;
    const timezone = String(account?.timezone ?? 'America/Bogota');
    const now = new Date();
    const currentPeriod = interactionPeriodKey(now, timezone);
    const requestedPeriod = validPeriodKey(searchParams.get('period') ?? '');
    const periodKey = requestedPeriod || currentPeriod;

    const monthlyDoc = await usageMonthly.findOne({
      _id: `${workspace}:${periodKey}`,
    });

    const [dailyRaw, topConvRaw, recentRaw] = await Promise.all([
      usageEvents
        .aggregate([
          { $match: { workspaceId: workspace, periodKey } },
          { $group: { _id: '$dayKey', interactions: { $sum: '$count' } } },
          { $sort: { _id: 1 } },
        ])
        .toArray(),
      usageEvents
        .aggregate([
          { $match: { workspaceId: workspace, periodKey, conversationRef: { $nin: [null, ''] } } },
          {
            $group: {
              _id: '$conversationRef',
              interactions: { $sum: '$count' },
              lastAt: { $max: '$ts' },
              preview: { $first: '$preview' },
              agentId: { $first: '$agentId' },
              channel: { $first: '$channel' },
            },
          },
          { $sort: { interactions: -1, lastAt: -1 } },
          { $limit: 12 },
        ])
        .toArray(),
      usageEvents
        .find({ workspaceId: workspace, periodKey })
        .sort({ ts: -1 })
        .limit(30)
        .project({
          _id: 0,
          ts: 1,
          count: 1,
          channel: 1,
          provider: 1,
          model: 1,
          conversationRef: 1,
          preview: 1,
        })
        .toArray(),
    ]);

    const usageSnapshot = await getCurrentPeriodUsage({
      db,
      workspaceId: workspace,
      timeZone: timezone,
      now,
    });

    return Response.json({
      periodKey,
      currentPeriod,
      timeZone: timezone,
      totalInteractions: Math.max(0, Number(monthlyDoc?.interactions ?? 0)),
      currentPeriodInteractions:
        periodKey === usageSnapshot.periodKey ? usageSnapshot.interactions : Math.max(0, Number(monthlyDoc?.interactions ?? 0)),
      byChannel: monthlyDoc?.by_channel ?? {},
      byProvider: monthlyDoc?.by_provider ?? {},
      byModel: monthlyDoc?.by_model ?? {},
      daily: dailyRaw.map((d: any) => ({
        dayKey: String(d?._id ?? ''),
        interactions: Math.max(0, Number(d?.interactions ?? 0)),
      })),
      topConversations: topConvRaw.map((row: any) => ({
        conversationRef: String(row?._id ?? ''),
        interactions: Math.max(0, Number(row?.interactions ?? 0)),
        lastAt: Math.max(0, Number(row?.lastAt ?? 0)),
        preview: String(row?.preview ?? ''),
        agentId: String(row?.agentId ?? ''),
        channel: String(row?.channel ?? ''),
      })),
      recentEvents: recentRaw.map((row: any) => ({
        ts: Math.max(0, Number(row?.ts ?? 0)),
        count: Math.max(0, Number(row?.count ?? 0)),
        channel: String(row?.channel ?? ''),
        provider: String(row?.provider ?? ''),
        model: String(row?.model ?? ''),
        conversationRef: String(row?.conversationRef ?? ''),
        preview: String(row?.preview ?? ''),
      })),
    });
  } catch (e: any) {
    return Response.json({ error: e.message ?? 'Internal error' }, { status: 500 });
  }
}
