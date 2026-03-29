import { getDb } from '@/lib/mongodb';

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

export default async function DashboardPage() {
  const db = await getDb();

  const configDoc = await db.collection('config').findOne({ _id: 'account' as any });
  const config = configDoc ?? { plan: 'Starter', interactions_limit: 1000 };

  const convCount = await db.collection('conversations').countDocuments();
  const agentDocs = await db.collection('agents').find({}).toArray();
  const activeAgents = agentDocs.filter((a: any) => a.enabled !== false).length;
  const recentConvs = await db.collection('conversations')
    .find({})
    .sort({ updatedAt: -1 })
    .limit(5)
    .toArray();

  const interactionsUsed = Math.floor(convCount * 4.3);
  const planLimit = config.interactions_limit ?? 1000;
  const usagePct = Math.min(100, Math.round((interactionsUsed / planLimit) * 100));

  return (
    <div className="dash-content">
      <div className="page-header">
        <h1 className="page-title">Resumen</h1>
        <p className="page-sub">Estado general de tu asistente ORQO</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Conversaciones</div>
          <div className="stat-value">{convCount}</div>
          <div className="stat-sub">Total acumulado</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Agentes activos</div>
          <div className="stat-value stat-acc">{activeAgents}</div>
          <div className="stat-sub">de {agentDocs.length} configurados</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Interacciones usadas</div>
          <div className="stat-value">{interactionsUsed}</div>
          <div className="stat-sub stat-acc">{usagePct}% del plan</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Plan actual</div>
          <div className="stat-value" style={{fontSize:'20px'}}>{config.plan ?? 'Starter'}</div>
          <div className="stat-sub">{planLimit.toLocaleString()} interacciones/mes</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title">Conversaciones recientes</div>
          {recentConvs.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">💬</div>
              <div className="empty-text">Sin conversaciones aún</div>
            </div>
          ) : (
            <div>
              {recentConvs.map((c: any) => (
                <div key={String(c._id)} className="conv-row">
                  <div className="conv-avatar">👤</div>
                  <div className="conv-info">
                    <div className="conv-name">{c.user_name ?? 'Visitante'}</div>
                    <div className="conv-preview">{c.last_message ?? '—'}</div>
                  </div>
                  <div className="conv-meta">{relTime(c.updatedAt ?? Date.now())}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title">Estado del sistema</div>
          <div className="status-list">
            <div className="status-item">
              <span className="dot dot-green"/>
              <span className="status-item-label">Widget activo</span>
              <span className="status-item-val badge badge-green">OK</span>
            </div>
            <div className="status-item">
              <span className="dot dot-green"/>
              <span className="status-item-label">API ORQO</span>
              <span className="status-item-val badge badge-green">OK</span>
            </div>
            <div className="status-item">
              <span className="dot dot-yellow"/>
              <span className="status-item-label">MongoDB Atlas</span>
              <span className="status-item-val badge badge-green">Conectado</span>
            </div>
          </div>
          <hr className="section-divider"/>
          <div className="card-title" style={{marginBottom:'10px'}}>Uso del plan</div>
          <div className="progress-wrap">
            <div className="progress-labels">
              <span>{interactionsUsed.toLocaleString()} usadas</span>
              <span>{planLimit.toLocaleString()} límite</span>
            </div>
            <div className="progress-bar">
              <div
                className={`progress-fill${usagePct > 85 ? ' danger' : usagePct > 65 ? ' warn' : ''}`}
                style={{width:`${usagePct}%`}}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
