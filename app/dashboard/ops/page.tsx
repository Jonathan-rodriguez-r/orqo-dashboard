'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

type OpLevel    = 'info' | 'warn' | 'error';
type OpCategory = 'conversation' | 'skill' | 'llm' | 'channel' | 'inactivity' | 'system';

type OpLog = {
  _id: string;
  workspaceId: string;
  ts: string;
  source: string;
  level: OpLevel;
  category: OpCategory;
  action: string;
  message: string;
  metadata: Record<string, unknown>;
};

const LEVEL_COLORS: Record<OpLevel, { bg: string; color: string; label: string }> = {
  info:  { bg: 'color-mix(in srgb, var(--acc) 12%, var(--g01))',  color: 'var(--acc)',  label: 'INFO'  },
  warn:  { bg: 'color-mix(in srgb, #f59e0b 12%, var(--g01))',     color: '#f59e0b',     label: 'WARN'  },
  error: { bg: 'color-mix(in srgb, var(--red) 12%, var(--g01))',  color: 'var(--red)',  label: 'ERROR' },
};

const CATEGORY_LABELS: Record<OpCategory, string> = {
  conversation: 'Conversación',
  skill:        'Skill',
  llm:          'LLM',
  channel:      'Canal',
  inactivity:   'Inactividad',
  system:       'Sistema',
};

const PRESETS = [
  { id: '1h',  label: '1h'  },
  { id: '24h', label: '24h' },
  { id: '7d',  label: '7d'  },
  { id: '30d', label: '30d' },
  { id: 'all', label: 'Todo'},
];

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60_000)         return `${Math.floor(diff / 1_000)}s`;
  if (diff < 3_600_000)      return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000)     return `${Math.floor(diff / 3_600_000)}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
}

function MetaBadge({ k, v }: { k: string; v: unknown }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: 'var(--g02)', borderRadius: 4,
      padding: '2px 6px', fontSize: 11, color: 'var(--g06)',
      fontFamily: 'var(--f-mono)',
    }}>
      <span style={{ color: 'var(--g05)' }}>{k}</span>
      <span style={{ color: 'var(--g07)' }}>{String(v)}</span>
    </span>
  );
}

export default function OpsPage() {
  const [items, setItems]           = useState<OpLog[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [pages, setPages]           = useState(1);
  const [loading, setLoading]       = useState(true);
  const [preset, setPreset]         = useState('24h');
  const [level, setLevel]           = useState('');
  const [category, setCategory]     = useState('');
  const [q, setQ]                   = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [stats, setStats]           = useState<{ byLevel: Record<string, number>; byCategory: Record<string, number> }>({ byLevel: {}, byCategory: {} });
  const [autoRefresh, setAutoRefresh] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: '50', preset });
      if (level)    params.set('level', level);
      if (category) params.set('category', category);
      if (q)        params.set('q', q);
      const r = await fetch(`/api/ops-logs?${params}`);
      const data = await r.json();
      if (data.ok) {
        setItems(data.items);
        setTotal(data.total);
        setPages(data.pages);
        setStats(data.stats);
      }
    } catch {}
    setLoading(false);
  }, [page, preset, level, category, q]);

  useEffect(() => { setPage(1); }, [preset, level, category, q]);
  useEffect(() => { void load(page); }, [page, load]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoRefresh) {
      timerRef.current = setInterval(() => void load(page), 15_000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [autoRefresh, load, page]);

  function pill(active: boolean, label: string, onClick: () => void, color?: string) {
    return (
      <button
        onClick={onClick}
        style={{
          padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer',
          border: `1px solid ${active ? (color ?? 'var(--acc)') : 'var(--g03)'}`,
          background: active ? `color-mix(in srgb, ${color ?? 'var(--acc)'} 14%, var(--g01))` : 'transparent',
          color: active ? (color ?? 'var(--acc)') : 'var(--g05)',
          transition: 'all .12s',
        }}
      >{label}</button>
    );
  }

  const errorCount = (stats.byLevel['error'] ?? 0);
  const warnCount  = (stats.byLevel['warn']  ?? 0);
  const infoCount  = (stats.byLevel['info']  ?? 0);

  return (
    <div style={{ maxWidth: 1100 }}>

      {/* Sub-header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 12, color: 'var(--g05)' }}>
          Flujo en tiempo real — mensajes, skills, LLM, canales, inactividad
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--g05)', cursor: 'pointer' }}>
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />
            Auto (15s)
          </label>
          <button className="btn btn-ghost btn-sm" onClick={() => void load(page)}>
            {loading ? '…' : '↻ Actualizar'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 18 }}>
        {[
          { label: 'Total',  value: total,      color: 'var(--g06)' },
          { label: 'Errores', value: errorCount, color: 'var(--red)' },
          { label: 'Avisos',  value: warnCount,  color: '#f59e0b'    },
          { label: 'Info',    value: infoCount,  color: 'var(--acc)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '12px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: 'var(--f-disp)' }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--g05)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '12px 14px', marginBottom: 14 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <input
            className="input"
            placeholder="Buscar mensaje o acción…"
            value={q}
            onChange={e => setQ(e.target.value)}
            style={{ flex: '1 1 180px', maxWidth: 240, fontSize: 13 }}
          />
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {PRESETS.map(p => pill(preset === p.id, p.label, () => setPreset(p.id)))}
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {(['error', 'warn', 'info'] as OpLevel[]).map(l =>
              pill(level === l, LEVEL_COLORS[l].label, () => setLevel(level === l ? '' : l), LEVEL_COLORS[l].color)
            )}
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {(Object.keys(CATEGORY_LABELS) as OpCategory[]).map(c =>
              pill(category === c, CATEGORY_LABELS[c], () => setCategory(category === c ? '' : c))
            )}
          </div>
          {(level || category || q) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setLevel(''); setCategory(''); setQ(''); }}>
              × Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--g05)', fontSize: 13 }}>Cargando…</div>
        ) : items.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--g05)', fontSize: 13 }}>
            No hay eventos para los filtros seleccionados.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--g03)', background: 'var(--g01)' }}>
                {['Tiempo', 'Nivel', 'Categoría', 'Acción', 'Mensaje'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: 'var(--g05)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const lc = LEVEL_COLORS[item.level] ?? LEVEL_COLORS.info;
                const expanded = expandedId === item._id;
                const hasMeta = Object.keys(item.metadata ?? {}).length > 0;
                return (
                  <>
                    <tr
                      key={item._id}
                      onClick={() => hasMeta && setExpandedId(expanded ? null : item._id)}
                      style={{
                        borderBottom: expanded ? 'none' : '1px solid var(--g02)',
                        cursor: hasMeta ? 'pointer' : 'default',
                        background: expanded ? 'color-mix(in srgb, var(--acc) 4%, var(--g00))' : 'transparent',
                        transition: 'background .1s',
                      }}
                    >
                      <td style={{ padding: '8px 12px', color: 'var(--g04)', whiteSpace: 'nowrap', fontFamily: 'var(--f-mono)', fontSize: 11 }}>
                        {timeAgo(item.ts)}
                        <span style={{ display: 'block', fontSize: 10, color: 'var(--g03)' }}>
                          {new Date(item.ts).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{
                          display: 'inline-block', padding: '2px 7px', borderRadius: 4,
                          background: lc.bg, color: lc.color,
                          fontWeight: 600, fontSize: 11, fontFamily: 'var(--f-mono)',
                        }}>{lc.label}</span>
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--g06)', whiteSpace: 'nowrap' }}>
                        {CATEGORY_LABELS[item.category] ?? item.category}
                      </td>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--g05)', whiteSpace: 'nowrap' }}>
                        {item.action}
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--g07)' }}>
                        {item.message}
                        {hasMeta && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--g03)' }}>{expanded ? '▲' : '▼'}</span>}
                      </td>
                    </tr>
                    {expanded && hasMeta && (
                      <tr key={`${item._id}-exp`} style={{ borderBottom: '1px solid var(--g02)', background: 'color-mix(in srgb, var(--acc) 4%, var(--g00))' }}>
                        <td colSpan={5} style={{ padding: '6px 12px 10px 40px' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {Object.entries(item.metadata).map(([k, v]) => (
                              <MetaBadge key={k} k={k} v={v} />
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 14, fontSize: 13, color: 'var(--g05)' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>← Ant</button>
          <span>Página {page} de {pages}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages}>Sig →</button>
        </div>
      )}
    </div>
  );
}
