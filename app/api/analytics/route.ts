import { getDb } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

const CHANNEL_META: Record<string, { label: string; color: string }> = {
  whatsapp:   { label: 'WhatsApp',           color: '#25D366' },
  instagram:  { label: 'Instagram Business', color: '#E1306C' },
  facebook:   { label: 'Facebook Messenger', color: '#1877F2' },
  shopify:    { label: 'Shopify',            color: '#96BF48' },
  woocommerce:{ label: 'WooCommerce Widget', color: '#7F54B3' },
  widget:     { label: 'Widget Web',         color: '#2CB978' },
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const days = Math.min(90, Math.max(7, Number(searchParams.get('days') ?? 30)));

    const db = await getDb();

    // Date range
    const from = new Date();
    from.setDate(from.getDate() - days + 1);
    from.setHours(0, 0, 0, 0);
    const fromStr = from.toISOString().split('T')[0];

    // Analytics daily
    const daily = await db
      .collection('analytics_daily')
      .find({ date: { $gte: fromStr } })
      .sort({ date: 1 })
      .toArray();

    // Totals
    let totalConv = 0, totalResolved = 0, totalEscalated = 0;
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

    const byChannel = Object.entries(byChannelMap)
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

    // Previous period comparison
    const prevFrom = new Date(from);
    prevFrom.setDate(prevFrom.getDate() - days);
    const prevFromStr = prevFrom.toISOString().split('T')[0];

    const prevDaily = await db
      .collection('analytics_daily')
      .find({ date: { $gte: prevFromStr, $lt: fromStr } })
      .toArray();

    const prevConv = prevDaily.reduce((s, d) => s + (d.conversations ?? 0), 0);

    // Avg response time
    const avgResponse = daily.length > 0
      ? daily.reduce((s, d) => s + (d.avgResponseTime ?? 1.5), 0) / daily.length
      : 1.5;

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
      },
      daily: daily.map(d => ({
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
