'use client';

import { useEffect, useState } from 'react';

function relTime(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

type Conv = {
  _id: string;
  user_name?: string;
  user_email?: string;
  last_message?: string;
  message_count?: number;
  status?: string;
  updatedAt?: number;
  agent?: string;
};

const PAGE_SIZE = 20;

export default function ConversationsPage() {
  const [convs, setConvs] = useState<Conv[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), q: search });
    fetch(`/api/conversations?${params}`).then(r => r.json()).then(d => {
      setConvs(d.items ?? []);
      setTotal(d.total ?? 0);
      setLoading(false);
    });
  }, [page, search]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="dash-content">
      <div className="page-header">
        <h1 className="page-title">Conversaciones</h1>
        <p className="page-sub">{total} conversaciones en total</p>
      </div>

      <div className="card">
        <div className="search-row">
          <div className="search-wrap">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="6.5" cy="6.5" r="5"/>
              <path d="M10.5 10.5 14 14"/>
            </svg>
            <input
              className="search-input"
              placeholder="Buscar por nombre o mensaje..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Último mensaje</th>
                <th>Agente</th>
                <th>Mensajes</th>
                <th>Estado</th>
                <th>Hace</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{textAlign:'center',color:'var(--g05)',padding:'32px'}}>Cargando…</td></tr>
              ) : convs.length === 0 ? (
                <tr><td colSpan={6} style={{textAlign:'center',color:'var(--g05)',padding:'32px'}}>Sin conversaciones</td></tr>
              ) : convs.map(c => (
                <tr key={c._id}>
                  <td>
                    <div style={{fontWeight:600,color:'var(--g07)'}}>{c.user_name ?? 'Visitante'}</div>
                    {c.user_email && <div style={{fontSize:'11.5px',color:'var(--g05)'}}>{c.user_email}</div>}
                  </td>
                  <td style={{maxWidth:'280px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {c.last_message ?? '—'}
                  </td>
                  <td>{c.agent ?? '—'}</td>
                  <td>{c.message_count ?? 0}</td>
                  <td>
                    <span className={`badge ${c.status === 'open' ? 'badge-green' : c.status === 'escalated' ? 'badge-yellow' : 'badge-gray'}`}>
                      {c.status ?? 'closed'}
                    </span>
                  </td>
                  <td>{relTime(c.updatedAt ?? Date.now())}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <span className="page-info">Pág. {page} de {totalPages}</span>
          <button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Anterior</button>
          <button className="page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Siguiente →</button>
        </div>
      </div>
    </div>
  );
}
