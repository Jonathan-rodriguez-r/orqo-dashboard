'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import HomeCharts from './HomeCharts';
import LiveConversationMap from './LiveConversationMap';
import MarketingFlyerSlider from './MarketingFlyerSlider';

type ChannelStat = {
  channel: string;
  count: number;
  color: string;
  label: string;
};

type ProviderStat = {
  name: string;
  count: number;
};

type UsageItem = {
  provider: string;
  model: string;
  ts: number;
};

type ConversationItem = {
  id: string;
  userName: string;
  lastMessage: string;
  channel: string;
  updatedAt: number;
};

type Props = {
  activeAgents: number;
  interactionsUsed: number;
  planLimit: number;
  usagePct: number;
  usagePeriodKey: string;
  recentConversations: ConversationItem[];
  channelStats: ChannelStat[];
  providerStats: ProviderStat[];
  recentUsage: UsageItem[];
};

type BoardCardId = 'analytics' | 'world' | 'recent' | 'system' | 'marketing';

const STORAGE_KEY = 'orqo_overview_layout_v2';

const DEFAULT_ORDER: BoardCardId[] = ['analytics', 'world', 'recent', 'system', 'marketing'];

const CH_COLORS: Record<string, string> = {
  whatsapp: '#25D366',
  instagram: '#E1306C',
  facebook: '#1877F2',
  shopify: '#96BF48',
  woocommerce: '#7F54B3',
  widget: '#2CB978',
};

function relTime(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

function moveCard(order: BoardCardId[], dragId: BoardCardId, targetId: BoardCardId) {
  if (dragId === targetId) return order;
  const next = [...order];
  const dragIndex = next.indexOf(dragId);
  const targetIndex = next.indexOf(targetId);
  if (dragIndex < 0 || targetIndex < 0) return order;
  next.splice(dragIndex, 1);
  next.splice(targetIndex, 0, dragId);
  return next;
}

function moveCardByOffset(order: BoardCardId[], cardId: BoardCardId, offset: number) {
  const from = order.indexOf(cardId);
  if (from < 0) return order;
  const to = Math.max(0, Math.min(order.length - 1, from + offset));
  if (from === to) return order;
  const next = [...order];
  next.splice(from, 1);
  next.splice(to, 0, cardId);
  return next;
}

export default function OverviewBoard(props: Props) {
  const [order, setOrder] = useState<BoardCardId[]>(DEFAULT_ORDER);
  const [dragId, setDragId] = useState<BoardCardId | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const scrollHostRef = useRef<HTMLElement | null>(null);
  const dragImageRef = useRef<HTMLImageElement | null>(null);

  const maybeAutoScroll = (clientY: number) => {
    const host = scrollHostRef.current;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const threshold = 94;
    if (clientY < rect.top + threshold) host.scrollBy({ top: -20, behavior: 'auto' });
    else if (clientY > rect.bottom - threshold) host.scrollBy({ top: 20, behavior: 'auto' });
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const valid = parsed.filter((id) => DEFAULT_ORDER.includes(id)) as BoardCardId[];
      if (valid.length === DEFAULT_ORDER.length) setOrder(valid);
    } catch {
      // ignore malformed local storage
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
  }, [order]);

  useEffect(() => {
    const img = new Image();
    img.src =
      'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxIiBoZWlnaHQ9IjEiLz4=';
    dragImageRef.current = img;
  }, []);

  const cards = useMemo(() => {
    const channelStats = props.channelStats.length > 0
      ? props.channelStats
      : [{ channel: 'widget', count: 36, color: '#2CB978', label: 'Widget Web' }];

    return {
      analytics: {
        title: 'Analitica central',
        subtitle: 'KPIs, tendencia diaria y rendimiento por canal',
        wide: true,
        body: <HomeCharts days={30} />,
      },
      world: {
        title: 'Vista global',
        subtitle: 'Distribucion geografica de conversaciones',
        wide: false,
        body: <LiveConversationMap channels={channelStats} />,
      },
      recent: {
        title: 'Conversaciones recientes',
        subtitle: 'Ultimos contactos activos',
        wide: false,
        body: (
          <>
            {props.recentConversations.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">💬</div>
                <div className="empty-text">Sin conversaciones aun</div>
              </div>
            ) : props.recentConversations.map((c) => (
              <div key={c.id} className="conv-row">
                <div className="conv-avatar" style={{ fontSize: 13, fontWeight: 700, color: 'var(--acc)' }}>
                  {(c.userName || 'V').slice(0, 1).toUpperCase()}
                </div>
                <div className="conv-info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div className="conv-name">{c.userName || 'Visitante'}</div>
                    {c.channel && (
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          background: CH_COLORS[c.channel] ?? '#888',
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </div>
                  <div className="conv-preview">{c.lastMessage || '-'}</div>
                </div>
                <div className="conv-meta">{relTime(c.updatedAt)}</div>
              </div>
            ))}
          </>
        ),
      },
      system: {
        title: 'Estado operativo',
        subtitle: 'Salud del stack y consumo actual',
        wide: false,
        body: (
          <>
            <div className="status-list">
              <div className="status-item">
                <span className="dot dot-green" />
                <span className="status-item-label">Widget activo</span>
                <span className="badge badge-green">OK</span>
              </div>
              <div className="status-item">
                <span className="dot dot-green" />
                <span className="status-item-label">API ORQO</span>
                <span className="badge badge-green">OK</span>
              </div>
              <div className="status-item">
                <span className="dot dot-green" />
                <span className="status-item-label">MongoDB Atlas</span>
                <span className="badge badge-green">Conectado</span>
              </div>
              <div className="status-item">
                <span className="dot dot-green" />
                <span className="status-item-label">Agentes activos</span>
                <span className="badge badge-green">{props.activeAgents} activos</span>
              </div>
            </div>

            <hr className="section-divider" />

            <div className="card-title" style={{ marginBottom: 10 }}>Uso del plan</div>
            <div className="progress-wrap">
              <div className="progress-labels">
                <span>{props.interactionsUsed.toLocaleString('es')} usadas</span>
                <span>{props.planLimit.toLocaleString('es')} limite</span>
              </div>
              <div className="progress-bar">
                <div
                  className={`progress-fill${props.usagePct > 85 ? ' danger' : props.usagePct > 65 ? ' warn' : ''}`}
                  style={{ width: `${props.usagePct}%` }}
                />
              </div>
              <p style={{ fontSize: 12, color: 'var(--g05)', marginTop: 8 }}>
                {props.usagePct}% del limite mensual utilizado
              </p>
            </div>

            <hr className="section-divider" />
            <div className="card-title" style={{ marginBottom: 10 }}>
              Detalle de interacciones ({props.usagePeriodKey})
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ fontSize: 12, color: 'var(--g05)' }}>Canales</div>
                {props.channelStats.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--g05)' }}>Sin registros en este periodo</div>
                ) : props.channelStats.map((item) => (
                  <div key={item.channel} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span>{item.label}</span>
                    <strong>{item.count.toLocaleString('es')}</strong>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ fontSize: 12, color: 'var(--g05)' }}>Proveedores</div>
                {props.providerStats.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--g05)' }}>Sin registros en este periodo</div>
                ) : props.providerStats.map((item) => (
                  <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span>{item.name}</span>
                    <strong>{item.count.toLocaleString('es')}</strong>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ fontSize: 12, color: 'var(--g05)' }}>Ultimas interacciones</div>
                {props.recentUsage.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--g05)' }}>Sin eventos recientes</div>
                ) : props.recentUsage.map((evt, index) => (
                  <div key={`${evt.provider}-${evt.model}-${evt.ts}-${index}`} style={{ fontSize: 12, color: 'var(--g06)' }}>
                    {relTime(evt.ts)} · {evt.provider} / {evt.model}
                  </div>
                ))}
              </div>
            </div>

            <hr className="section-divider" />
            <a href="/dashboard/settings" className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
              Ir a Configuracion
            </a>
          </>
        ),
      },
      marketing: {
        title: 'Orqo Marketing',
        subtitle: 'Flyers e imagenes para campañas en canales',
        wide: false,
        body: <MarketingFlyerSlider />,
      },
    };
  }, [props]);

  return (
    <div
      ref={boardRef}
      style={{ display: 'grid', gap: 14 }}
      onDragOver={(e) => maybeAutoScroll(e.clientY)}
    >
      <div className="overview-hint">
        Arrastra las tarjetas para ordenar la vista general segun la preferencia del cliente.
      </div>

      <div className="overview-grid">
        {order.map((cardId, index) => {
          const card = cards[cardId];
          const isDragging = dragId === cardId;
          const canMoveUp = index > 0;
          const canMoveDown = index < order.length - 1;
          return (
            <section
              key={cardId}
              className={`overview-panel${card.wide ? ' overview-panel-wide' : ''}${isDragging ? ' dragging' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                maybeAutoScroll(e.clientY);
              }}
              onDrop={(e) => {
                e.preventDefault();
                const source = (e.dataTransfer.getData('text/plain') || dragId) as BoardCardId | null;
                if (!source) return;
                setOrder((prev) => moveCard(prev, source, cardId));
                setDragId(null);
                scrollHostRef.current = null;
              }}
            >
              <div className="overview-panel-head">
                <div>
                  <div className="overview-panel-title">{card.title}</div>
                  <div className="overview-panel-sub">{card.subtitle}</div>
                </div>
                <div className="overview-panel-tools">
                  <button
                    className="drag-sort-btn"
                    type="button"
                    disabled={!canMoveUp}
                    onClick={() => setOrder((prev) => moveCardByOffset(prev, cardId, -1))}
                    aria-label="Mover tarjeta arriba"
                    title="Mover arriba"
                  >
                    Up
                  </button>
                  <button
                    className="drag-sort-btn"
                    type="button"
                    disabled={!canMoveDown}
                    onClick={() => setOrder((prev) => moveCardByOffset(prev, cardId, 1))}
                    aria-label="Mover tarjeta abajo"
                    title="Mover abajo"
                  >
                    Dn
                  </button>
                  <button
                    className="drag-handle"
                    type="button"
                    draggable
                    aria-label="Arrastrar tarjeta"
                    title="Arrastrar tarjeta"
                    onDragStart={(e) => {
                      scrollHostRef.current = boardRef.current?.closest('.dash-content') as HTMLElement | null;
                      setDragId(cardId);
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', cardId);
                      if (dragImageRef.current) e.dataTransfer.setDragImage(dragImageRef.current, 0, 0);
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      scrollHostRef.current = null;
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <circle cx="5" cy="4" r="1.1" fill="currentColor" />
                      <circle cx="11" cy="4" r="1.1" fill="currentColor" />
                      <circle cx="5" cy="8" r="1.1" fill="currentColor" />
                      <circle cx="11" cy="8" r="1.1" fill="currentColor" />
                      <circle cx="5" cy="12" r="1.1" fill="currentColor" />
                      <circle cx="11" cy="12" r="1.1" fill="currentColor" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="overview-panel-body">{card.body}</div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
