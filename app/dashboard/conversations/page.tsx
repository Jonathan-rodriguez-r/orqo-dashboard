'use client';

import { useEffect, useState } from 'react';

function WhatsAppIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

function ShopifyIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M15.337 23.979l7.216-1.561s-2.604-17.613-2.625-17.73c-.019-.116-.116-.194-.213-.194-.097 0-1.89-.039-1.89-.039s-1.26-1.239-1.396-1.376v21.9zm-2.48.021L12.76.827c-.006-.09-.039-.174-.097-.236A.315.315 0 0012.43.5c-.118 0-2.104.6-2.104.6S8.658.038 8.52.038c-.136 0-4.354 13.615-4.354 13.615l4.967 1.376 2.71.664 1.014 8.307zm-3.96-8.713L6.84 14.21 9.37 5.78l2.528 1.252-3.001 8.255z"/>
    </svg>
  );
}

function WooIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.31 0H1.69A1.69 1.69 0 000 1.69v20.62A1.69 1.69 0 001.69 24h20.62A1.69 1.69 0 0024 22.31V1.69A1.69 1.69 0 0022.31 0zM12 18.75c-3.73 0-6.75-3.02-6.75-6.75S8.27 5.25 12 5.25s6.75 3.02 6.75 6.75-3.02 6.75-6.75 6.75z"/>
    </svg>
  );
}

function WidgetIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M6 6l1 14h10l1-14" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

const CHANNEL_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  whatsapp: { label: 'WhatsApp', color: '#25D366', icon: <WhatsAppIcon /> },
  instagram: { label: 'Instagram', color: '#E1306C', icon: <InstagramIcon /> },
  facebook: { label: 'Facebook', color: '#1877F2', icon: <FacebookIcon /> },
  shopify: { label: 'Shopify', color: '#96BF48', icon: <ShopifyIcon /> },
  woocommerce: { label: 'WooCommerce', color: '#7F54B3', icon: <WooIcon /> },
  widget: { label: 'Widget', color: '#2CB978', icon: <WidgetIcon /> },
};

function ChannelBadge({ channel }: { channel?: string }) {
  const cfg = CHANNEL_CONFIG[channel ?? 'widget'] ?? CHANNEL_CONFIG.widget;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: cfg.color }}>
      {cfg.icon}
      <span style={{ fontSize: 12, fontWeight: 500 }}>{cfg.label}</span>
    </span>
  );
}

const MODEL_COLORS: Record<string, string> = {
  anthropic: '#2CB978',
  openai: '#00A1E0',
  google: '#4285F4',
};

function ModelBadge({ model, provider, label }: { model?: string; provider?: string; label?: string }) {
  if (!model) return <span style={{ color: 'var(--g04)', fontSize: 12 }}>-</span>;
  const color = MODEL_COLORS[provider ?? 'anthropic'] ?? '#7A9488';
  const display = label ?? model;
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 11,
        fontWeight: 600,
        padding: '2px 7px',
        borderRadius: 20,
        background: `${color}18`,
        color,
        whiteSpace: 'nowrap',
      }}
    >
      {display}
    </span>
  );
}

function TokenCell({ tokens }: { tokens?: { input: number; output: number; total: number } }) {
  if (!tokens) return <span style={{ color: 'var(--g04)', fontSize: 12 }}>-</span>;
  const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));
  return (
    <div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--g07)' }}>{fmt(tokens.total)}</div>
      <div style={{ fontSize: 10.5, color: 'var(--g05)', marginTop: 1 }}>
        in {fmt(tokens.input)} | out {fmt(tokens.output)}
      </div>
    </div>
  );
}

function fmtDuration(s?: number) {
  if (!s || s < 0) return '-';
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

function relTime(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function fmtTs(ts: number) {
  return new Date(ts).toLocaleString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type Tokens = { input: number; output: number; total: number };
type Conv = {
  _id: string;
  conv_id?: string;
  user_name?: string;
  user_email?: string;
  phone?: string;
  last_message?: string;
  message_count?: number;
  status?: string;
  updatedAt?: number;
  agent?: string;
  channel?: string;
  model?: string;
  model_label?: string;
  model_provider?: string;
  tokens?: Tokens;
  duration_s?: number;
};

type ConvMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  ts: number;
};

const PAGE_SIZE = 20;
const ALL_CHANNELS = ['', 'whatsapp', 'instagram', 'facebook', 'shopify', 'woocommerce', 'widget'];
const CH_LABELS: Record<string, string> = {
  '': 'Todos',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  facebook: 'Facebook',
  shopify: 'Shopify',
  woocommerce: 'WooCommerce',
  widget: 'Widget',
};

export default function ConversationsPage() {
  const [convs, setConvs] = useState<Conv[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [channel, setChannel] = useState('');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState('');
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState('');

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [detailSource, setDetailSource] = useState<'conversation' | 'widget_runtime' | 'summary' | ''>('');
  const [detailConv, setDetailConv] = useState<Conv | null>(null);
  const [detailMessages, setDetailMessages] = useState<ConvMessage[]>([]);

  function load(p = page, q = search, ch = channel) {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(p),
      limit: String(PAGE_SIZE),
      q,
      ...(ch ? { channel: ch } : {}),
    });

    fetch(`/api/conversations?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setConvs(d.items ?? []);
        setTotal(d.total ?? 0);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load(page, search, channel);
  }, [page, search, channel]);

  useEffect(() => {
    if (!detailOpen) return;
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setDetailOpen(false);
      }
    }
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [detailOpen]);

  async function seedDemo() {
    setSeeding(true);
    setSeedMsg('');
    const res = await fetch('/api/seed', { method: 'POST' });
    const d = await res.json();
    setSeeding(false);

    if (d.ok) {
      const n = d.inserted?.conversations ?? 60;
      setSeedMsg(d.skipped ? 'Demo ya estaba cargado' : `${n} conversaciones demo insertadas`);
      setPage(1);
      load(1, '', '');
    } else {
      setSeedMsg('Error al insertar datos demo');
    }
  }

  async function openConversation(conv: Conv) {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError('');
    setDetailSource('');
    setDetailConv(conv);
    setDetailMessages([]);

    try {
      const res = await fetch(`/api/conversations/${conv._id}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No fue posible cargar el detalle');

      setDetailConv((data?.conversation ?? conv) as Conv);
      setDetailMessages(Array.isArray(data?.messages) ? (data.messages as ConvMessage[]) : []);
      setDetailSource((data?.source ?? '') as any);
    } catch (e: any) {
      setDetailError(e?.message ?? 'Error cargando detalle');
    } finally {
      setDetailLoading(false);
    }
  }

  async function deleteConversation(conv: Conv) {
    const label = conv.conv_id || conv.user_name || 'esta conversación';
    const ok = window.confirm(`¿Seguro que quieres borrar ${label}? Esta acción no se puede deshacer.`);
    if (!ok) return;

    setDeletingId(conv._id);
    try {
      const res = await fetch(`/api/conversations/${conv._id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'No fue posible borrar la conversación');

      if (detailConv?._id === conv._id) {
        setDetailOpen(false);
        setDetailConv(null);
        setDetailMessages([]);
      }

      const nextPage = convs.length === 1 && page > 1 ? page - 1 : page;
      if (nextPage !== page) {
        setPage(nextPage);
      } else {
        load(nextPage, search, channel);
      }
    } catch (e: any) {
      window.alert(e?.message || 'Error al borrar conversación');
    } finally {
      setDeletingId('');
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="dash-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Conversaciones</h1>
          <p className="page-sub">{total.toLocaleString('es')} conversaciones registradas</p>
        </div>
        {total === 0 && !loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {seedMsg && <span style={{ fontSize: 12, color: 'var(--acc)' }}>{seedMsg}</span>}
            <button className="btn btn-ghost btn-sm" onClick={seedDemo} disabled={seeding}>
              {seeding ? 'Insertando...' : '+ Cargar demo'}
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <div className="search-row" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div className="search-wrap">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="6.5" cy="6.5" r="5" />
              <path d="M10.5 10.5 14 14" />
            </svg>
            <input
              className="search-input"
              placeholder="Buscar nombre, mensaje, ID..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {ALL_CHANNELS.map((ch) => {
              const cfg = ch ? CHANNEL_CONFIG[ch] : null;
              const active = channel === ch;
              return (
                <button
                  key={ch || 'all'}
                  onClick={() => {
                    setChannel(ch);
                    setPage(1);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '5px 10px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                    border: `1px solid ${active && cfg ? cfg.color : 'var(--g03)'}`,
                    background: active ? (cfg ? `${cfg.color}18` : 'var(--acc-g)') : 'transparent',
                    color: active && cfg ? cfg.color : active ? 'var(--acc)' : 'var(--g05)',
                    transition: 'all 0.15s',
                  }}
                >
                  {cfg && <span style={{ color: cfg.color }}>{cfg.icon}</span>}
                  {CH_LABELS[ch]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th className="hide-md" style={{ width: 96 }}>ID</th>
                <th>Usuario</th>
                <th className="hide-sm">Canal</th>
                <th className="hide-md">Modelo</th>
                <th className="hide-md">Tokens</th>
                <th className="hide-md">Ultimo mensaje</th>
                <th className="hide-md">Agente</th>
                <th className="hide-md" style={{ width: 64 }}>Msgs</th>
                <th>Estado</th>
                <th style={{ width: 60 }}>Hace</th>
                <th style={{ width: 90 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', color: 'var(--g05)', padding: 40 }}>
                    Cargando...
                  </td>
                </tr>
              ) : convs.length === 0 ? (
                <tr>
                  <td colSpan={11}>
                    <div className="empty">
                      <div className="empty-icon">Chat</div>
                      <div className="empty-text">Sin conversaciones para estos filtros</div>
                    </div>
                  </td>
                </tr>
              ) : (
                convs.map((c) => (
                  <tr key={c._id} onClick={() => openConversation(c)} style={{ cursor: 'pointer' }}>
                    <td className="hide-md">
                      {c.conv_id ? (
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: 11,
                            color: 'var(--g05)',
                            letterSpacing: '0.03em',
                          }}
                        >
                          {c.conv_id}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--g04)', fontSize: 11 }}>-</span>
                      )}
                    </td>

                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--g07)', fontSize: 13 }}>{c.user_name ?? 'Visitante'}</div>
                      {c.user_email && <div style={{ fontSize: 11, color: 'var(--g05)' }}>{c.user_email}</div>}
                      {c.phone && <div style={{ fontSize: 11, color: 'var(--g05)' }}>{c.phone}</div>}
                      {c.duration_s ? (
                        <div style={{ fontSize: 10.5, color: 'var(--g04)', marginTop: 1 }}>
                          duracion {fmtDuration(c.duration_s)}
                        </div>
                      ) : null}
                    </td>

                    <td className="hide-sm">
                      <ChannelBadge channel={c.channel} />
                    </td>

                    <td className="hide-md">
                      <ModelBadge model={c.model} provider={c.model_provider} label={c.model_label} />
                    </td>

                    <td className="hide-md">
                      <TokenCell tokens={c.tokens} />
                    </td>

                    <td
                      className="hide-md"
                      style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12.5 }}
                    >
                      {c.last_message ?? '-'}
                    </td>

                    <td className="hide-md" style={{ fontSize: 12, color: 'var(--g06)' }}>
                      {c.agent ?? '-'}
                    </td>

                    <td className="hide-md" style={{ fontSize: 12, color: 'var(--g05)', textAlign: 'center' }}>
                      {c.message_count ?? '-'}
                    </td>

                    <td>
                      <span
                        className={`badge ${
                          c.status === 'resolved'
                            ? 'badge-green'
                            : c.status === 'escalated'
                              ? 'badge-yellow'
                              : c.status === 'open'
                                ? 'badge-blue'
                                : 'badge-gray'
                        }`}
                      >
                        {c.status === 'resolved'
                          ? 'Resuelta'
                          : c.status === 'escalated'
                            ? 'Escalada'
                            : c.status === 'open'
                              ? 'Abierta'
                              : c.status ?? 'Cerrada'}
                      </span>
                    </td>

                    <td style={{ whiteSpace: 'nowrap', fontSize: 12, color: 'var(--g05)' }}>
                      {relTime(c.updatedAt ?? Date.now())}
                    </td>

                    <td onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => deleteConversation(c)}
                        disabled={deletingId === c._id}
                        title="Borrar conversación"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          color: 'var(--red)',
                          borderColor: 'rgba(255,107,107,0.25)',
                        }}
                      >
                        <TrashIcon />
                        {deletingId === c._id ? '...' : 'Borrar'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <span className="page-info">
            {total > 0 ? `${(page - 1) * PAGE_SIZE + 1}-${Math.min(page * PAGE_SIZE, total)} de ${total}` : '0 resultados'}
          </span>
          <button className="page-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </button>
          <button className="page-btn" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Siguiente
          </button>
        </div>
      </div>

      {detailOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.58)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
          onClick={() => setDetailOpen(false)}
        >
          <div
            style={{
              width: 'min(900px, 100%)',
              maxHeight: '90vh',
              overflow: 'hidden',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--g03)',
              background: 'var(--g00)',
              boxShadow: '0 18px 60px rgba(0,0,0,0.45)',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '14px 16px',
                borderBottom: '1px solid var(--g03)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
              }}
            >
              <div>
                <div style={{ fontFamily: 'var(--f-disp)', fontSize: 16, fontWeight: 700, color: 'var(--g08)' }}>
                  Conversacion {detailConv?.conv_id ? `- ${detailConv.conv_id}` : ''}
                </div>
                <div style={{ fontSize: 12, color: 'var(--g05)' }}>
                  {detailConv?.user_name ?? 'Visitante'} | {detailConv?.channel ?? 'widget'} |{' '}
                  {detailConv?.updatedAt ? fmtTs(detailConv.updatedAt) : '-'}
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setDetailOpen(false)}>
                Cerrar
              </button>
            </div>

            <div
              style={{
                padding: '8px 16px',
                borderBottom: '1px solid var(--g03)',
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
                fontSize: 11,
              }}
            >
              <span className="badge badge-gray">Fuente: {detailSource || '-'}</span>
              <span className="badge badge-gray">Mensajes: {detailMessages.length}</span>
              <span className="badge badge-gray">Tokens: {detailConv?.tokens?.total ?? 0}</span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {detailLoading ? (
                <div style={{ color: 'var(--g05)', fontSize: 13 }}>Cargando detalle...</div>
              ) : detailError ? (
                <div style={{ color: 'var(--red)', fontSize: 13 }}>{detailError}</div>
              ) : detailMessages.length === 0 ? (
                <div style={{ color: 'var(--g05)', fontSize: 13 }}>No hay mensajes almacenados para esta conversacion.</div>
              ) : (
                detailMessages.map((m, idx) => {
                  const isUser = m.role === 'user';
                  const isAssistant = m.role === 'assistant';
                  return (
                    <div
                      key={`${m.ts}-${idx}`}
                      style={{
                        display: 'flex',
                        justifyContent: isUser ? 'flex-end' : isAssistant ? 'flex-start' : 'center',
                      }}
                    >
                      <div
                        style={{
                          maxWidth: '86%',
                          padding: '10px 13px',
                          borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                          background: isUser ? 'var(--acc)' : 'var(--g02)',
                          color: isUser ? '#fff' : 'var(--g08)',
                          fontSize: 13,
                          lineHeight: 1.5,
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {m.content}
                        <div style={{ marginTop: 6, fontSize: 10.5, opacity: 0.7 }}>{fmtTs(m.ts)}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
