import { getDb } from '@/lib/mongodb';
import OverviewBoard from '@/components/dashboard/OverviewBoard';
import { getCurrentPeriodUsage } from '@/lib/usage-meter';
import { getSession } from '@/lib/auth';
import { getWorkspaceConfig } from '@/lib/workspace-config';
import { getWorkspaceClient } from '@/lib/clients';

export const dynamic = 'force-dynamic';

const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: '#25D366',
  instagram: '#E1306C',
  facebook: '#1877F2',
  shopify: '#96BF48',
  woocommerce: '#7F54B3',
  widget: '#2CB978',
};

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  facebook: 'Facebook',
  shopify: 'Shopify',
  woocommerce: 'WooCommerce',
  widget: 'Widget Web',
};

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const db = await getDb();
  const workspaceId = session.workspaceId;
  const client = await getWorkspaceClient(db, workspaceId);

  const [configDoc, agentDocs, recentConvs] = await Promise.all([
    getWorkspaceConfig(db, workspaceId, 'account', {
      defaults: {
        plan: 'Starter',
        interactions_limit: 1000,
        timezone: 'America/Bogota',
      } as any,
    }),
    db.collection('agents_v2').find({ workspaceId, status: { $ne: 'disabled' } }).toArray(),
    db.collection('conversations').find({ workspaceId, clientId: client.clientId }).sort({ updatedAt: -1 }).limit(8).toArray(),
  ]);

  const config: any = configDoc ?? { plan: 'Starter', interactions_limit: 1000, timezone: 'America/Bogota' };
  const activeAgents = agentDocs.filter((a: any) => a.enabled !== false).length;
  const planLimit: number = config.interactions_limit ?? 1000;

  const usage = await getCurrentPeriodUsage({
    db,
    workspaceId,
    timeZone: String(config?.timezone ?? 'America/Bogota'),
  });

  const [usageDoc, recentUsageRaw] = await Promise.all([
    db.collection<any>('usage_monthly').findOne({ _id: `${workspaceId}:${usage.periodKey}` }),
    db
      .collection<any>('usage_events')
      .find({ workspaceId, periodKey: usage.periodKey })
      .sort({ ts: -1 })
      .limit(8)
      .toArray(),
  ]);

  const interactionsUsed = usage.interactions;
  const usagePct = planLimit > 0 ? Math.min(100, Math.round((interactionsUsed / planLimit) * 100)) : 0;

  const channelStats = Object.entries(usageDoc?.by_channel ?? {})
    .map(([channel, count]) => {
      const key = String(channel);
      return {
        channel: key,
        label: CHANNEL_LABELS[key] ?? key,
        count: Number(count ?? 0),
        color: CHANNEL_COLORS[key] ?? '#2CB978',
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const providerStats = Object.entries(usageDoc?.by_provider ?? {})
    .map(([name, count]) => ({ name: String(name), count: Number(count ?? 0) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const recentConversations = recentConvs.map((c: any) => ({
    id: String(c?._id ?? ''),
    userName: String(c?.user_name ?? 'Visitante'),
    lastMessage: String(c?.last_message ?? ''),
    channel: String(c?.channel ?? ''),
    updatedAt: Number(c?.updatedAt ?? Date.now()),
  }));

  const recentUsage = recentUsageRaw.map((evt: any) => ({
    provider: String(evt?.provider ?? 'n/a'),
    model: String(evt?.model ?? 'n/a'),
    ts: Number(evt?.ts ?? Date.now()),
  }));

  return (
    <div className="dash-content">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div>
          <h1 className="page-title">Vista General</h1>
          <p className="page-sub">Dashboard operativo reordenable, enfocado en rendimiento y conversion</p>
        </div>
        <div className="overview-plan-chip">
          <span style={{ color: 'var(--g05)' }}>Plan</span>
          <span style={{ fontWeight: 700, color: 'var(--acc)' }}>{config.plan ?? 'Starter'}</span>
          <span style={{ color: 'var(--g03)' }}>|</span>
          <span style={{ color: 'var(--g05)' }}>
            {interactionsUsed.toLocaleString('es')}/{planLimit.toLocaleString('es')} interacciones
          </span>
          <div className="progress-bar" style={{ width: 82, marginLeft: 4 }}>
            <div
              className={`progress-fill${usagePct > 85 ? ' danger' : usagePct > 65 ? ' warn' : ''}`}
              style={{ width: `${usagePct}%` }}
            />
          </div>
        </div>
      </div>

      <OverviewBoard
        activeAgents={activeAgents}
        interactionsUsed={interactionsUsed}
        planLimit={planLimit}
        usagePct={usagePct}
        usagePeriodKey={usage.periodKey}
        recentConversations={recentConversations}
        channelStats={channelStats}
        providerStats={providerStats}
        recentUsage={recentUsage}
      />
    </div>
  );
}
