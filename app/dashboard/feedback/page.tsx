'use client';

import { useEffect, useState } from 'react';
import { useSession } from '@/hooks/usePermissions';

type FeedbackItem = {
  _id: string;
  title: string;
  description: string;
  category: string;
  status: 'open' | 'planned' | 'in_progress' | 'closed';
  votes: number;
  votedBy: string[];
  author: { email: string; name?: string; role?: string };
  createdAt: string;
};

const CATEGORIES = [
  { value: 'feature',     label: 'Nueva función',    color: '#6366F1' },
  { value: 'improvement', label: 'Mejora',            color: '#2CB978' },
  { value: 'bug',         label: 'Bug / Error',       color: '#DC4848' },
  { value: 'question',    label: 'Pregunta',          color: '#F5B43C' },
];

const STATUSES: Record<string, { label: string; color: string; bg: string }> = {
  open:        { label: 'Abierto',    color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  planned:     { label: 'Planeado',   color: '#6366F1', bg: 'rgba(99,102,241,0.12)' },
  in_progress: { label: 'En curso',   color: '#F5B43C', bg: 'rgba(245,180,60,0.12)' },
  closed:      { label: 'Resuelto',   color: '#2CB978', bg: 'rgba(44,185,120,0.12)' },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function FeedbackPage() {
  const session = useSession();
  const [items, setItems]         = useState<FeedbackItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filterCat, setFilterCat] = useState('');
  const [filterSt, setFilterSt]   = useState('');
  const [sortBy, setSortBy]       = useState<'votes'|'newest'>('votes');
  const [showForm, setShowForm]   = useState(false);

  // Form state
  const [fTitle, setFTitle]   = useState('');
  const [fDesc, setFDesc]     = useState('');
  const [fCat, setFCat]       = useState('feature');
  const [saving, setSaving]   = useState(false);
  const [fError, setFError]   = useState('');

  function load() {
    setLoading(true);
    const params = new URLSearchParams({ sort: sortBy });
    if (filterCat) params.set('category', filterCat);
    if (filterSt)  params.set('status', filterSt);
    fetch(`/api/feedback?${params}`)
      .then(r => r.json())
      .then(d => { if (d.ok) setItems(d.items ?? []); })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [filterCat, filterSt, sortBy]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!fTitle.trim() || !fDesc.trim()) { setFError('Completa título y descripción.'); return; }
    setSaving(true); setFError('');
    const r = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: fTitle, description: fDesc, category: fCat }),
    });
    const d = await r.json();
    if (d.ok) {
      setFTitle(''); setFDesc(''); setFCat('feature');
      setShowForm(false);
      load();
    } else {
      setFError(d.error ?? 'Error al enviar');
    }
    setSaving(false);
  }

  async function vote(id: string) {
    await fetch('/api/feedback', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'vote' }),
    });
    load();
  }

  const isAdmin = session?.role === 'owner' || session?.role === 'admin';

  async function changeStatus(id: string, status: string) {
    await fetch('/api/feedback', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'status', status }),
    });
    load();
  }

  const pillStyle = (active: boolean, color?: string) => ({
    display: 'inline-flex' as const, alignItems: 'center' as const, gap: 4,
    padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: active ? 700 : 500,
    cursor: 'pointer', border: `1px solid ${active ? (color ?? 'var(--acc)') : 'var(--g03)'}`,
    background: active ? (color ? color + '18' : 'var(--acc-g)') : 'transparent',
    color: active ? (color ?? 'var(--acc)') : 'var(--g05)',
    transition: 'all 0.12s',
  });

  return (
    <div className="dash-content">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Feedback &amp; Sugerencias</h1>
          <p className="page-sub">Comparte ideas, reporta problemas o vota por funciones que quieres ver</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Nueva sugerencia'}
        </button>
      </div>

      {/* New feedback form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-title">Nueva sugerencia</div>
          <form onSubmit={submit}>
            <div className="field">
              <label className="label">Categoría</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {CATEGORIES.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    style={pillStyle(fCat === c.value, c.color)}
                    onClick={() => setFCat(c.value)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label className="label">Título</label>
              <input
                className="input"
                placeholder="Resumen breve de tu idea o problema..."
                value={fTitle}
                onChange={e => setFTitle(e.target.value)}
                maxLength={200}
              />
            </div>
            <div className="field">
              <label className="label">Descripción</label>
              <textarea
                className="input"
                style={{ minHeight: 100 }}
                placeholder="Describe con detalle qué quieres, por qué sería útil, o cómo reproducir el problema..."
                value={fDesc}
                onChange={e => setFDesc(e.target.value)}
                maxLength={2000}
              />
            </div>
            {fError && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{fError}</p>}
            <div className="save-bar">
              <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Enviando...' : 'Enviar sugerencia'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20 }}>
        {/* Category filter */}
        <button style={pillStyle(filterCat === '')} onClick={() => setFilterCat('')}>Todas</button>
        {CATEGORIES.map(c => (
          <button key={c.value} style={pillStyle(filterCat === c.value, c.color)} onClick={() => setFilterCat(filterCat === c.value ? '' : c.value)}>
            {c.label}
          </button>
        ))}
        <span style={{ width: 1, height: 20, background: 'var(--g03)', margin: '0 4px' }}/>
        {/* Status filter */}
        <button style={pillStyle(filterSt === '')} onClick={() => setFilterSt('')}>Todo estado</button>
        {Object.entries(STATUSES).map(([k, v]) => (
          <button key={k} style={pillStyle(filterSt === k, v.color)} onClick={() => setFilterSt(filterSt === k ? '' : k)}>
            {v.label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          <button style={pillStyle(sortBy === 'votes')} onClick={() => setSortBy('votes')}>↑ Votos</button>
          <button style={pillStyle(sortBy === 'newest')} onClick={() => setSortBy('newest')}>Más recientes</button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="empty"><div className="empty-text">Cargando...</div></div>
      ) : items.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">💡</div>
          <div className="empty-text">Sé el primero en dejar una sugerencia</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map(item => {
            const cat = CATEGORIES.find(c => c.value === item.category);
            const st  = STATUSES[item.status] ?? STATUSES.open;
            const voted = (item.votedBy ?? []).includes(session?.email ?? '');

            return (
              <div key={item._id} className="card" style={{ padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                {/* Vote button */}
                <button
                  onClick={() => vote(item._id)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                    minWidth: 44, padding: '8px 6px', borderRadius: 'var(--radius-sm)',
                    border: `1px solid ${voted ? 'var(--acc)' : 'var(--g03)'}`,
                    background: voted ? 'var(--acc-g)' : 'var(--g02)',
                    color: voted ? 'var(--acc)' : 'var(--g05)',
                    cursor: 'pointer', transition: 'all 0.12s', flexShrink: 0,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M6 10V2M2 6l4-4 4 4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--f-disp)' }}>{item.votes}</span>
                </button>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--g08)' }}>{item.title}</span>
                    {cat && (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: cat.color + '18', color: cat.color }}>
                        {cat.label}
                      </span>
                    )}
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: st.bg, color: st.color }}>
                      {st.label}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--g06)', lineHeight: 1.6, marginBottom: 8 }}>{item.description}</p>
                  <div style={{ fontSize: 11, color: 'var(--g05)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span>{item.author.name ?? item.author.email}</span>
                    <span>{fmtDate(item.createdAt)}</span>
                  </div>

                  {/* Admin: change status */}
                  {isAdmin && (
                    <div style={{ marginTop: 10, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: 'var(--g05)', alignSelf: 'center' }}>Estado:</span>
                      {Object.entries(STATUSES).map(([k, v]) => (
                        <button
                          key={k}
                          onClick={() => changeStatus(item._id, k)}
                          style={{
                            padding: '2px 8px', borderRadius: 20, fontSize: 11, cursor: 'pointer',
                            border: `1px solid ${item.status === k ? v.color : 'var(--g03)'}`,
                            background: item.status === k ? v.bg : 'transparent',
                            color: item.status === k ? v.color : 'var(--g05)',
                          }}
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
