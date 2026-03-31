'use client';

import { useEffect, useState, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

type LogLevel    = 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
type LogSeverity = 'LOW'  | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type LogCategory = 'auth' | 'security' | 'users' | 'roles' | 'system' | 'billing' | 'connector' | 'agent' | 'conversation';

type AuditLog = {
  _id:           string;
  correlationId: string;
  level:         LogLevel;
  severity:      LogSeverity;
  category:      LogCategory;
  action:        string;
  message:       string;
  actor?:        { id?: string; email?: string; role?: string; ip?: string; userAgent?: string };
  target?:       { type?: string; id?: string; email?: string; label?: string };
  metadata?:     { before?: any; after?: any; diff?: any; error?: { message: string; stack?: string; code?: string }; extra?: any };
  http?:         { method?: string; path?: string; statusCode?: number; duration?: number };
  createdAt:     string;
};

type Stats = {
  byLevel:    Record<string, number>;
  byCategory: Record<string, number>;
};

type DatePreset = '1h' | '24h' | '7d' | '30d' | 'all';

// ── Config ────────────────────────────────────────────────────────────────────

const LEVEL_STYLE: Record<LogLevel, { bg: string; color: string; label: string }> = {
  INFO:  { bg: 'var(--acc-g)',           color: 'var(--acc)',    label: 'INFO'  },
  WARN:  { bg: 'var(--yellow-g)',         color: 'var(--yellow)', label: 'WARN'  },
  ERROR: { bg: 'rgba(220,72,72,0.12)',    color: 'var(--red)',    label: 'ERROR' },
  FATAL: { bg: 'rgba(220,38,38,0.22)',    color: '#FF4444',       label: 'FATAL' },
};

const SEVERITY_STYLE: Record<LogSeverity, { color: string; label: string }> = {
  LOW:      { color: 'var(--g05)',    label: 'Baja'     },
  MEDIUM:   { color: 'var(--yellow)', label: 'Media'    },
  HIGH:     { color: '#F97316',       label: 'Alta'     },
  CRITICAL: { color: 'var(--red)',    label: 'Crítica'  },
};

const CATEGORY_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  auth:         { bg: 'rgba(59,130,246,0.12)',  color: '#3B82F6', label: 'Autenticación'  },
  security:     { bg: 'rgba(220,72,72,0.12)',   color: 'var(--red)',  label: 'Seguridad'   },
  users:        { bg: 'rgba(139,92,246,0.12)',  color: '#8B5CF6', label: 'Usuarios'        },
  roles:        { bg: 'rgba(249,115,22,0.12)',  color: '#F97316', label: 'Roles'           },
  system:       { bg: 'rgba(107,114,128,0.12)', color: '#6B7280', label: 'Sistema'         },
  billing:      { bg: 'rgba(16,185,129,0.12)',  color: '#10B981', label: 'Facturación'     },
  connector:    { bg: 'rgba(20,184,166,0.12)',  color: '#14B8A6', label: 'Conectores'      },
  agent:        { bg: 'rgba(99,102,241,0.12)',  color: '#6366F1', label: 'Agentes'         },
  conversation: { bg: 'rgba(6,182,212,0.12)',   color: '#06B6D4', label: 'Conversaciones'  },
};

const ALL_LEVELS:     LogLevel[]    = ['INFO', 'WARN', 'ERROR', 'FATAL'];
const ALL_SEVERITIES: LogSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const ALL_CATEGORIES: LogCategory[] = ['auth', 'security', 'users', 'roles', 'system', 'billing', 'connector', 'agent', 'conversation'];

const PAGE_SIZE = 50;

// ── Helpers ───────────────────────────────────────────────────────────────────

function presetToFrom(preset: DatePreset): string {
  if (preset === 'all') return '';
  const map: Record<string, number> = { '1h': 3_600_000, '24h': 86_400_000, '7d': 604_800_000, '30d': 2_592_000_000 };
  return new Date(Date.now() - map[preset]!).toISOString();
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60_000) return 'ahora';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

function fmtAbsTime(iso: string) {
  return new Date(iso).toLocaleString('es', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

// ── Small components ──────────────────────────────────────────────────────────

function LevelBadge({ level }: { level: LogLevel }) {
  const s = LEVEL_STYLE[level] ?? LEVEL_STYLE.INFO;
  return (
    <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: s.bg, color: s.color, letterSpacing: '0.03em' }}>
      {s.label}
    </span>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const s = CATEGORY_STYLE[category] ?? { bg: 'var(--g02)', color: 'var(--g05)', label: category };
  return (
    <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function SeverityDot({ severity }: { severity: LogSeverity }) {
  const s = SEVERITY_STYLE[severity] ?? SEVERITY_STYLE.LOW;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: s.color }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, flexShrink: 0 }}/>
      {s.label}
    </span>
  );
}

function MetaSection({ label, data }: { label: string; data: any }) {
  if (!data) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--g05)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
        {label}
      </div>
      <pre style={{
        margin: 0, fontSize: 11, lineHeight: 1.6,
        color: 'var(--g06)', background: 'var(--g01)',
        border: '1px solid var(--g03)', borderRadius: 6,
        padding: '8px 10px', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
      }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value?: string | number }) {
  if (!value) return null;
  return (
    <div style={{ marginBottom: 6 }}>
      <span style={{ fontSize: 10, color: 'var(--g05)', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 6 }}>{label}</span>
      <span style={{ fontSize: 11.5, color: 'var(--g06)', fontFamily: 'monospace' }}>{value}</span>
    </div>
  );
}

// ── Expanded row ─────────────────────────────────────────────────────────────

function ExpandedRow({ log }: { log: AuditLog }) {
  const hasMeta = log.metadata && Object.keys(log.metadata).length > 0;
  const hasHttp = log.http && Object.keys(log.http).length > 0;

  return (
    <div style={{ padding: '16px 20px', background: 'var(--g01)', borderTop: '1px solid var(--g03)' }}>
      {/* Correlation ID */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--g04)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Correlation ID</span>
        <code style={{ fontSize: 11.5, color: 'var(--acc)', fontFamily: 'monospace', userSelect: 'all' }}>{log.correlationId}</code>
        <span style={{ fontSize: 10.5, color: 'var(--g04)' }}>·</span>
        <span style={{ fontSize: 11, color: 'var(--g04)' }}>{fmtAbsTime(log.createdAt)}</span>
      </div>

      {/* Actor / Target / HTTP — three column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
        {log.actor && (
          <div className="card-sm" style={{ padding: '10px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--g05)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Actor</div>
            <DetailField label="email"  value={log.actor.email}  />
            <DetailField label="rol"    value={log.actor.role}   />
            <DetailField label="ip"     value={log.actor.ip}     />
            {log.actor.userAgent && (
              <div style={{ fontSize: 10, color: 'var(--g04)', marginTop: 4, wordBreak: 'break-all' }} title={log.actor.userAgent}>
                {log.actor.userAgent.slice(0, 72)}{log.actor.userAgent.length > 72 ? '…' : ''}
              </div>
            )}
          </div>
        )}

        {log.target && (
          <div className="card-sm" style={{ padding: '10px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--g05)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Target</div>
            <DetailField label="tipo"  value={log.target.type}  />
            <DetailField label="id"    value={log.target.id}    />
            <DetailField label="email" value={log.target.email} />
            <DetailField label="label" value={log.target.label} />
          </div>
        )}

        {hasHttp && (
          <div className="card-sm" style={{ padding: '10px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--g05)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>HTTP</div>
            <DetailField label="método"  value={log.http!.method}   />
            <DetailField label="path"    value={log.http!.path}     />
            <DetailField label="status"  value={log.http!.statusCode} />
            {log.http!.duration && <DetailField label="duración" value={`${log.http!.duration}ms`} />}
          </div>
        )}
      </div>

      {/* Metadata sections */}
      {hasMeta && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--g05)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Metadata</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {log.metadata!.before && <MetaSection label="Antes"   data={log.metadata!.before} />}
            {log.metadata!.after  && <MetaSection label="Después" data={log.metadata!.after}  />}
            {log.metadata!.diff   && <MetaSection label="Diff"    data={log.metadata!.diff}   />}
            {log.metadata!.error  && <MetaSection label="Error"   data={log.metadata!.error}  />}
            {log.metadata!.extra  && <MetaSection label="Extra"   data={log.metadata!.extra}  />}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LogsPage() {
  const [logs, setLogs]       = useState<AuditLog[]>([]);
  const [total, setTotal]     = useState(0);
  const [stats, setStats]     = useState<Stats>({ byLevel: {}, byCategory: {} });
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [pruning, setPruning] = useState(false);
  const [pruneDays, setPruneDays] = useState(30);
  const [pruneMsg, setPruneMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Filters
  const [q, setQ]                   = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [level, setLevel]           = useState('');
  const [category, setCategory]     = useState('');
  const [preset, setPreset]         = useState<DatePreset>('24h');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 400);
    return () => clearTimeout(t);
  }, [q]);

  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (debouncedQ) params.set('q', debouncedQ);
    if (level)      params.set('level', level);
    if (category)   params.set('category', category);
    const from = presetToFrom(preset);
    if (from) params.set('from', from);

    fetch(`/api/logs?${params}`)
      .then(async r => {
        if (r.status === 403) { setForbidden(true); return null; }
        return r.json();
      })
      .then(d => {
        if (!d) return;
        if (d.ok) {
          setForbidden(false);
          setLogs(d.items ?? []);
          setTotal(d.total ?? 0);
          setStats(d.stats ?? { byLevel: {}, byCategory: {} });
        }
      })
      .finally(() => setLoading(false));
  }, [page, debouncedQ, level, category, preset]);

  useEffect(() => { load(); }, [load]);

  async function pruneOldLogs() {
    const ok = window.confirm(`Se eliminaran logs con mas de ${pruneDays} dias. Esta accion no se puede deshacer.`);
    if (!ok) return;

    setPruning(true);
    setPruneMsg(null);
    try {
      const res = await fetch(`/api/logs?days=${pruneDays}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'No fue posible depurar logs.');

      const deletedAudit = Number(data?.deleted?.audit_logs ?? 0);
      const deletedActivity = Number(data?.deleted?.activity_logs ?? 0);
      setPruneMsg({
        ok: true,
        text: `Depuracion completada: audit=${deletedAudit}, runtime=${deletedActivity}.`,
      });

      setPage(1);
      load();
    } catch (e: any) {
      setPruneMsg({ ok: false, text: e?.message || 'Error al depurar logs.' });
    } finally {
      setPruning(false);
      setTimeout(() => setPruneMsg(null), 4500);
    }
  }

  function resetFilters() {
    setQ(''); setDebouncedQ(''); setLevel(''); setCategory(''); setPreset('24h'); setPage(1);
  }

  const totalPages   = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const errorCount   = (stats.byLevel['ERROR'] ?? 0) + (stats.byLevel['FATAL'] ?? 0);
  const warnCount    = stats.byLevel['WARN']  ?? 0;
  const infoCount    = stats.byLevel['INFO']  ?? 0;
  const retentionDays = 30;

  const filterPillStyle = (active: boolean, color?: string) => ({
    display: 'inline-flex' as const, alignItems: 'center' as const, gap: 4,
    padding: '4px 10px', borderRadius: 20, fontSize: 11.5, fontWeight: active ? 700 : 500,
    cursor: 'pointer', transition: 'all 0.12s',
    border: `1px solid ${active ? (color ?? 'var(--acc)') : 'var(--g03)'}`,
    background: active ? (color ? color + '18' : 'var(--acc-g)') : 'transparent',
    color: active ? (color ?? 'var(--acc)') : 'var(--g05)',
  });

  return (
    <div className="dash-content">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Logs &amp; Auditoría</h1>
          <p className="page-sub">Registro completo de actividad del sistema — retención {retentionDays} días</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <select
            className="input"
            value={pruneDays}
            onChange={(e) => setPruneDays(Number(e.target.value))}
            style={{ width: 118 }}
          >
            <option value={7}>7 dias</option>
            <option value={15}>15 dias</option>
            <option value={30}>30 dias</option>
            <option value={60}>60 dias</option>
            <option value={90}>90 dias</option>
          </select>
          <button className="btn btn-ghost btn-sm" onClick={pruneOldLogs} disabled={pruning}>
            {pruning ? 'Depurando...' : `Borrar > ${pruneDays}d`}
          </button>
        </div>
      </div>
      {pruneMsg && (
        <div style={{ marginBottom: 12, fontSize: 12.5, color: pruneMsg.ok ? 'var(--acc)' : 'var(--red)' }}>
          {pruneMsg.text}
        </div>
      )}

      {/* Permission error */}
      {forbidden && (
        <div style={{ background: 'rgba(220,72,72,0.08)', border: '1px solid rgba(220,72,72,0.25)', borderRadius: 'var(--radius-lg)', padding: '20px 24px', marginBottom: 20, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>🔒</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--red)', marginBottom: 4 }}>Sin permiso: admin.logs</div>
            <div style={{ fontSize: 13, color: 'var(--g05)', lineHeight: 1.6 }}>
              Tu sesión activa no incluye el permiso <code style={{ fontFamily: 'monospace', fontSize: 12, background: 'var(--g02)', padding: '1px 5px', borderRadius: 4 }}>admin.logs</code>.
              Esto ocurre cuando la sesión fue creada antes de actualizar el rol.
            </div>
            <a
              href="/api/auth/logout"
              style={{ display: 'inline-block', marginTop: 10, fontSize: 12.5, color: 'var(--acc)', textDecoration: 'underline', cursor: 'pointer' }}
              onClick={async e => { e.preventDefault(); await fetch('/api/auth/logout', { method: 'POST' }); window.location.href = '/login'; }}
            >
              Cerrar sesión y volver a entrar →
            </a>
          </div>
        </div>
      )}

      {/* Stats cards */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-label">Total (filtro actual)</div>
          <div className="stat-value">{total.toLocaleString('es')}</div>
          <div className="stat-sub">entradas encontradas</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">FATAL + ERROR</div>
          <div className={`stat-value${errorCount > 0 ? ' stat-red' : ''}`}>{errorCount.toLocaleString('es')}</div>
          <div className="stat-sub">{stats.byLevel['FATAL'] ?? 0} fatal · {stats.byLevel['ERROR'] ?? 0} error</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Advertencias</div>
          <div className="stat-value" style={{ color: warnCount > 0 ? 'var(--yellow)' : undefined }}>{warnCount.toLocaleString('es')}</div>
          <div className="stat-sub">nivel WARN</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Informativos</div>
          <div className="stat-value stat-acc">{infoCount.toLocaleString('es')}</div>
          <div className="stat-sub">nivel INFO</div>
        </div>
      </div>

      <div className="card">
        {/* ── Filter bar ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>

          {/* Row 1: search + date presets */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="search-wrap" style={{ flex: 1, minWidth: 220 }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="6.5" cy="6.5" r="5"/><path d="M10.5 10.5 14 14"/>
              </svg>
              <input
                className="search-input"
                placeholder="Buscar mensaje, acción, email, correlation ID..."
                value={q}
                onChange={e => { setQ(e.target.value); setPage(1); }}
              />
            </div>

            {/* Date presets */}
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              {(['1h','24h','7d','30d','all'] as DatePreset[]).map(p => (
                <button
                  key={p}
                  onClick={() => { setPreset(p); setPage(1); }}
                  style={filterPillStyle(preset === p)}
                >
                  {p === 'all' ? 'Todo' : p}
                </button>
              ))}
            </div>

            {/* Clear filters */}
            {(q || level || category || preset !== '24h') && (
              <button
                onClick={resetFilters}
                style={{ fontSize: 11.5, color: 'var(--g05)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: '0 4px' }}
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Row 2: level pills + category pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button style={filterPillStyle(level === '')} onClick={() => { setLevel(''); setPage(1); }}>Todos los niveles</button>
            {ALL_LEVELS.map(l => (
              <button
                key={l}
                style={filterPillStyle(level === l, LEVEL_STYLE[l].color)}
                onClick={() => { setLevel(level === l ? '' : l); setPage(1); }}
              >
                {l}
              </button>
            ))}
            <span style={{ width: 1, background: 'var(--g03)', margin: '0 4px' }}/>
            <button style={filterPillStyle(category === '')} onClick={() => { setCategory(''); setPage(1); }}>Todas las categorías</button>
            {ALL_CATEGORIES.map(c => {
              const cs = CATEGORY_STYLE[c];
              return (
                <button
                  key={c}
                  style={filterPillStyle(category === c, cs.color)}
                  onClick={() => { setCategory(category === c ? '' : c); setPage(1); }}
                >
                  {cs.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Mobile cards (≤767px) ── */}
        <div className="log-cards">
          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--g05)', padding: 32, fontSize: 13 }}>Cargando...</div>
          ) : logs.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">🔍</div>
              <div className="empty-text">
                {total === 0 && !q && !level && !category
                  ? 'Sin logs aún. Los eventos se registran automáticamente.'
                  : 'Sin resultados para estos filtros'}
              </div>
            </div>
          ) : logs.map(entry => {
            const isExp = expandedId === entry._id;
            return (
              <div key={entry._id} className={`log-card${isExp ? ' lc-expanded' : ''}`} onClick={() => setExpandedId(isExp ? null : entry._id)}>
                <div className="log-card-top">
                  <LevelBadge level={entry.level} />
                  <CategoryBadge category={entry.category} />
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--g05)' }} title={fmtAbsTime(entry.createdAt)}>
                    {fmtTime(entry.createdAt)}
                  </span>
                </div>
                <div className="log-card-msg">{entry.message}</div>
                <div className="log-card-sub">
                  <code style={{ fontFamily: 'monospace', fontSize: 10.5 }}>{entry.action}</code>
                  {entry.actor?.email && <span style={{ marginLeft: 8 }}>· {entry.actor.email}</span>}
                </div>
                {isExp && <ExpandedRow log={entry} />}
              </div>
            );
          })}
        </div>

        {/* ── Table (≥768px) ── */}
        <div className="logs-table-wrap table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 56 }}>Hora</th>
                <th style={{ width: 68 }}>Nivel</th>
                <th style={{ width: 60 }} className="hide-sm">Sev.</th>
                <th style={{ width: 120 }} className="hide-md">Categoría</th>
                <th style={{ width: 200 }} className="hide-md">Acción</th>
                <th>Mensaje</th>
                <th style={{ width: 140 }} className="hide-md">Actor</th>
                <th style={{ width: 32 }}/>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: 'var(--g05)', padding: 40 }}>
                    Cargando...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty">
                      <div className="empty-icon">🔍</div>
                      <div className="empty-text">
                        {total === 0 && !q && !level && !category
                          ? 'Sin logs aún. Los eventos se registran automáticamente al usar el sistema.'
                          : 'Sin resultados para estos filtros'}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : logs.flatMap(entry => {
                const isExpanded = expandedId === entry._id;
                const rows = [(
                  <tr
                    key={entry._id}
                    style={{ cursor: 'pointer', background: isExpanded ? 'var(--g02)' : undefined }}
                    onClick={() => setExpandedId(isExpanded ? null : entry._id)}
                  >
                    {/* Hora */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: 12, color: 'var(--g05)' }} title={fmtAbsTime(entry.createdAt)}>
                        {fmtTime(entry.createdAt)}
                      </span>
                    </td>

                    {/* Nivel */}
                    <td><LevelBadge level={entry.level} /></td>

                    {/* Severidad */}
                    <td className="hide-sm"><SeverityDot severity={entry.severity} /></td>

                    {/* Categoría */}
                    <td className="hide-md"><CategoryBadge category={entry.category} /></td>

                    {/* Acción */}
                    <td className="hide-md">
                      <code style={{ fontSize: 11, color: 'var(--g06)', fontFamily: 'monospace', letterSpacing: '0.01em' }}>
                        {entry.action}
                      </code>
                    </td>

                    {/* Mensaje */}
                    <td style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12.5, color: 'var(--g07)' }}>
                      {entry.message}
                    </td>

                    {/* Actor */}
                    <td className="hide-md" style={{ fontSize: 11.5, color: 'var(--g05)' }}>
                      {entry.actor?.email
                        ? <span style={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{entry.actor.email}</span>
                        : entry.actor?.ip
                          ? <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{entry.actor.ip}</span>
                          : <span style={{ color: 'var(--g04)' }}>sistema</span>
                      }
                    </td>

                    {/* Expand */}
                    <td style={{ textAlign: 'center', color: 'var(--g04)', fontSize: 14 }}>
                      {isExpanded ? '▾' : '▸'}
                    </td>
                  </tr>
                )];

                if (isExpanded) {
                  rows.push((
                    <tr key={`${entry._id}-exp`}>
                      <td colSpan={8} style={{ padding: 0 }}>
                        <ExpandedRow log={entry} />
                      </td>
                    </tr>
                  ));
                }

                return rows;
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="pagination">
          <span className="page-info">
            {total > 0
              ? `${((page - 1) * PAGE_SIZE) + 1}–${Math.min(page * PAGE_SIZE, total)} de ${total.toLocaleString('es')}`
              : '0 resultados'}
          </span>
          <button className="page-btn" disabled={page <= 1}         onClick={() => setPage(p => p - 1)}>← Anterior</button>
          <button className="page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Siguiente →</button>
        </div>
      </div>
    </div>
  );
}
