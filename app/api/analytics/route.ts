import { getDb } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { getWorkspaceConfig } from '@/lib/workspace-config';
import { resolveScopedWorkspaceId } from '@/lib/access-control';
import { getWorkspaceClient } from '@/lib/clients';

export const dynamic = 'force-dynamic';

const CHANNEL_META: Record<string, { label: string; color: string }> = {
  whatsapp: { label: 'WhatsApp', color: '#25D366' },
  instagram: { label: 'Instagram Business', color: '#E1306C' },
  facebook: { label: 'Facebook Messenger', color: '#1877F2' },
  shopify: { label: 'Shopify', color: '#96BF48' },
  woocommerce: { label: 'WooCommerce Widget', color: '#7F54B3' },
  widget: { label: 'Widget Web', color: '#2CB978' },
};

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const days = Math.min(90, Math.max(7, Number(searchParams.get('days') ?? 30)));
    const workspaceId = resolveScopedWorkspaceId(session, searchParams.get('workspaceId'));

    const db = await getDb();
    const client = await getWorkspaceClient(db, workspaceId);

    const from = new Date();
    from.setDate(from.getDate() - days + 1);
    from.setHours(0, 0, 0, 0);
    const fromStr = from.toISOString().split('T')[0];
    const fromMs = from.getTime();
    const toMs = Date.now();

    const widgetCfg = await getWorkspaceConfig(db, workspaceId, 'widget', {
      defaults: { closeOnInactivity: true, inactivityCloseMinutes: 15 } as any,
    });

    const inactivityEnabled = widgetCfg?.closeOnInactivity !== false;
    const inactivityMinutes = Math.max(1, Math.min(240, Number(widgetCfg?.inactivityCloseMinutes ?? 15)));
    if (inactivityEnabled) {
      const cutoff = Date.now() - inactivityMinutes * 60 * 1000;
      await db.collection('conversations').updateMany(
        {
          workspaceId,
          clientId: client.clientId,
          channel: 'widget',
          status: 'open',
          updatedAt: { $lt: cutoff },
        },
        {
          $set: {
            status: 'closed',
            closedAt: Date.now(),
            closureReason: 'inactivity_timeout',
            autoClosed: true,
          },
        }
      );
    }

    const daily = await db
      .collection('analytics_daily')
      .find({ workspaceId, clientId: client.clientId, date: { $gte: fromStr } })
      .sort({ date: 1 })
      .toArray();

    let totalConv = 0,
      totalResolved = 0,
      totalEscalated = 0;
    const byChannelMap: Record<string, number> = {};
    const byHourMap: Record<number, number> = {};

    for (const d of daily) {
      totalConv += d.conversations ?? 0;
      totalResolved += d.resolved ?? 0;
      totalEscalated += d.escalated ?? 0;

      for (const [ch, cnt] of Object.entries(d.byChannel ?? {})) {
        byChannelMap[ch] = (byChannelMap[ch] ?? 0) + Number(cnt);
      }
      for (const [h, cnt] of Object.entries(d.byHour ?? {})) {
        byHourMap[Number(h)] = (byHourMap[Number(h)] ?? 0) + Number(cnt);
      }
    }

    let byChannel = Object.entries(byChannelMap)
      .map(([channel, count]) => ({
        channel,
        count,
        label: CHANNEL_META[channel]?.label ?? channel,
        color: CHANNEL_META[channel]?.color ?? '#888',
      }))
      .sort((a, b) => b.count - a.count);

    const byHour = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label: `${String(i).padStart(2, '0')}h`,
      count: byHourMap[i] ?? 0,
    }));

    const prevFrom = new Date(from);
    prevFrom.setDate(prevFrom.getDate() - days);
    const prevFromStr = prevFrom.toISOString().split('T')[0];

    const prevDaily = await db
      .collection('analytics_daily')
      .find({ workspaceId, clientId: client.clientId, date: { $gte: prevFromStr, $lt: fromStr } })
      .toArray();

    const prevConv = prevDaily.reduce((s, d) => s + (d.conversations ?? 0), 0);

    const avgResponse =
      daily.length > 0 ? daily.reduce((s, d) => s + (d.avgResponseTime ?? 1.5), 0) / daily.length : 1.5;

    const [feedbackAgg, byChannelLive] = await Promise.all([
      db
        .collection('conversations')
        .aggregate([
          { $match: { workspaceId, clientId: client.clientId, updatedAt: { $gte: fromMs, $lte: toMs } } },
          {
            $group: {
              _id: null,
              helpfulYes: { $sum: { $cond: [{ $eq: ['$feedback.helpful', true] }, 1, 0] } },
              helpfulNo: { $sum: { $cond: [{ $eq: ['$feedback.helpful', false] }, 1, 0] } },
              feedbackResponses: { $sum: { $cond: [{ $in: ['$feedback.helpful', [true, false]] }, 1, 0] } },
              closedByInactivity: { $sum: { $cond: [{ $eq: ['$closureReason', 'inactivity_timeout'] }, 1, 0] } },
              closedConversations: { $sum: { $cond: [{ $in: ['$status', ['closed', 'resolved']] }, 1, 0] } },
            },
          },
        ])
        .toArray(),
      db
        .collection('conversations')
        .aggregate([
          { $match: { workspaceId, clientId: client.clientId, updatedAt: { $gte: fromMs, $lte: toMs } } },
          { $group: { _id: '$channel', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ])
        .toArray(),
    ]);

    if (Array.isArray(byChannelLive) && byChannelLive.length > 0) {
      byChannel = byChannelLive
        .map((row: any) => {
          const channel = String(row?._id ?? 'unknown');
          return {
            channel,
            count: Number(row?.count ?? 0),
            label: CHANNEL_META[channel]?.label ?? channel,
            color: CHANNEL_META[channel]?.color ?? '#888',
          };
        })
        .sort((a, b) => b.count - a.count);
    }

    const feedback = feedbackAgg[0] ?? {};
    const feedbackResponses = Number(feedback.feedbackResponses ?? 0);
    const helpfulYes = Number(feedback.helpfulYes ?? 0);
    const helpfulNo = Number(feedback.helpfulNo ?? 0);
    const satisfaction = feedbackResponses > 0 ? Math.round((helpfulYes / feedbackResponses) * 100) : 0;

    return Response.json({
      ok: true,
      totals: {
        conversations: totalConv,
        resolved: totalResolved,
        escalated: totalEscalated,
        resolucion: totalConv > 0 ? Math.round((totalResolved / totalConv) * 100) : 0,
        desvio: totalConv > 0 ? Math.round((totalEscalated / totalConv) * 100) : 0,
        avgResponseTime: Math.round(avgResponse * 10) / 10,
        prevConversations: prevConv,
        trend: prevConv > 0 ? Math.round(((totalConv - prevConv) / prevConv) * 100) : 0,
        feedbackResponses,
        helpfulYes,
        helpfulNo,
        satisfaction,
        closedByInactivity: Number(feedback.closedByInactivity ?? 0),
        closedConversations: Number(feedback.closedConversations ?? 0),
      },
      daily: daily.map((d) => ({
        date: d.date,
        label: new Date(d.date + 'T12:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short' }),
        conversations: d.conversations ?? 0,
        resolved: d.resolved ?? 0,
        escalated: d.escalated ?? 0,
      })),
      byChannel,
      byHour,
    });
  } catch (e: any) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
