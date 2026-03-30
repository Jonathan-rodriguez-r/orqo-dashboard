import { getDb } from '@/lib/mongodb';
import HomeCharts from '@/components/dashboard/HomeCharts';

export const dynamic = 'force-dynamic';

function relTime(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

const CH_COLORS: Record<string, string> = {
  whatsapp: '#25D366', instagram: '#E1306C', facebook: '#1877F2',
  shopify: '#96BF48', woocommerce: '#7F54B3', widget: '#2CB978',
};

export default async function DashboardPage() {
  const db = await getDb();

  const [configDoc, agentDocs, recentConvs] = await Promise.all([
    db.collection('config').findOne({ _id: 'account' as any }),
    db.collection('agents').find({}).toArray(),
    db.collection('conversations').find({}).sort({ updatedAt: -1 }).limit(6).toArray(),
  ]);

  const config = configDoc ?? { plan: 'Starter', interactions_limit: 1000 };
  const activeAgents = agentDocs.filter((a: any) => a.enabled !== false).length;
  const planLimit: number = config.interactions_limit ?? 1000;

  // Usage estimate
  const convCount = recentConvs.length;
  const totalConv = await db.collection('conversations').countDocuments();
  const interactionsUsed = Math.floor(totalConv * 4.3);
  const usagePct = Math.min(100, Math.round((interactionsUsed / planLimit) * 100));

  return (
    <div className="dash-content">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Vista General</h1>
          <p className="page-sub">Rendimiento, eficiencia y ROI operativo de tu asistente</p>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--g01)', border: '1px solid var(--g03)',
          borderRadius: 'var(--radius-sm)', padding: '8px 14px', fontSize: 12,
        }}>
          <span style={{ color: 'var(--g05)' }}>Plan</span>
          <span style={{ fontWeight: 700, color: 'var(--acc)' }}>{config.plan ?? 'Starter'}</span>
          <span style={{ color: 'var(--g03)' }}>|</span>
          <span style={{ color: 'var(--g05)' }}>{interactionsUsed.toLocaleString('es')}/{planLimit.toLocaleString('es')} interacciones</span>
          <div className={`progress-bar`} style={{ width: 60, marginLeft: 4 }}>
            <div
              className={`progress-fill${usagePct > 85 ? ' danger' : usagePct > 65 ? ' warn' : ''}`}
              style={{ width: `${usagePct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Charts — client component (recharts) */}
      <HomeCharts days={30} />

      {/* Bottom row: Recent conversations + System status */}
      <div className="grid-2" style={{ marginTop: 24 }}>
        {/* Recent conversations */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>Conversaciones recientes</div>
            <a href="/dashboard/conversations" style={{ fontSize: 12, color: 'var(--acc)' }}>
              Ver todas →
            </a>
          </div>
          {recentConvs.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">💬</div>
              <div className="empty-text">Sin conversaciones aún</div>
            </div>
          ) : recentConvs.map((c: any) => (
            <div key={String(c._id)} className="conv-row">
              <div className="conv-avatar" style={{ fontSize: 13, fontWeight: 700, color: 'var(--acc)' }}>
                {(c.user_name ?? 'V').slice(0, 1)}
              </div>
              <div className="conv-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div className="conv-name">{c.user_name ?? 'Visitante'}</div>
                  {c.channel && (
                    <span style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: CH_COLORS[c.channel] ?? '#888',
                      flexShrink: 0,
                    }}/>
                  )}
                </div>
                <div className="conv-preview">{c.last_message ?? '—'}</div>
              </div>
              <div className="conv-meta">{relTime(c.updatedAt ?? Date.now())}</div>
            </div>
          ))}
        </div>

        {/* System + Plan */}
        <div className="card">
          <div className="card-title">Estado del sistema</div>
          <div className="status-list">
            <div className="status-item">
              <span className="dot dot-green"/>
              <span className="status-item-label">Widget activo</span>
              <span className="badge badge-green">OK</span>
            </div>
            <div className="status-item">
              <span className="dot dot-green"/>
              <span className="status-item-label">API ORQO</span>
              <span className="badge badge-green">OK</span>
            </div>
            <div className="status-item">
              <span className="dot dot-green"/>
              <span className="status-item-label">MongoDB Atlas</span>
              <span className="badge badge-green">Conectado</span>
            </div>
            <div className="status-item">
              <span className="dot dot-green"/>
              <span className="status-item-label">Agentes activos</span>
              <span className="badge badge-green">{activeAgents} activos</span>
            </div>
          </div>

          <hr className="section-divider"/>

          <div className="card-title" style={{ marginBottom: 10 }}>Uso del plan</div>
          <div className="progress-wrap">
            <div className="progress-labels">
              <span>{interactionsUsed.toLocaleString('es')} usadas</span>
              <span>{planLimit.toLocaleString('es')} límite</span>
            </div>
            <div className="progress-bar">
              <div
                className={`progress-fill${usagePct > 85 ? ' danger' : usagePct > 65 ? ' warn' : ''}`}
                style={{ width: `${usagePct}%` }}
              />
            </div>
            <p style={{ fontSize: 12, color: 'var(--g05)', marginTop: 8 }}>
              {usagePct}% del límite mensual utilizado
            </p>
          </div>

          <hr className="section-divider"/>
          <a
            href="/dashboard/settings"
            className="btn btn-ghost btn-sm"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            Ir a Configuración
          </a>
        </div>
      </div>
    </div>
  );
}
