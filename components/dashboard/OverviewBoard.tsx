'use client';

import { useEffect, useMemo, useState } from 'react';
import HomeCharts from './HomeCharts';
import LiveConversationMap from './LiveConversationMap';

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

type BoardCardId = 'analytics' | 'world' | 'recent' | 'system';

const STORAGE_KEY = 'orqo_overview_layout_v2';

const DEFAULT_ORDER: BoardCardId[] = ['analytics', 'world', 'recent', 'system'];

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

export default function OverviewBoard(props: Props) {
  const [order, setOrder] = useState<BoardCardId[]>(DEFAULT_ORDER);
  const [dragId, setDragId] = useState<BoardCardId | null>(null);

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
        wide: true,
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
    };
  }, [props]);

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className="overview-hint">
        Arrastra las tarjetas para ordenar la vista general segun la preferencia del cliente.
      </div>

      <div className="overview-grid">
        {order.map((cardId) => {
          const card = cards[cardId];
          const isDragging = dragId === cardId;
          return (
            <section
              key={cardId}
              className={`overview-panel${card.wide ? ' overview-panel-wide' : ''}${isDragging ? ' dragging' : ''}`}
              draggable
              onDragStart={(e) => {
                setDragId(cardId);
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', cardId);
              }}
              onDragEnd={() => setDragId(null)}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(e) => {
                e.preventDefault();
                const source = (e.dataTransfer.getData('text/plain') || dragId) as BoardCardId | null;
                if (!source) return;
                setOrder((prev) => moveCard(prev, source, cardId));
                setDragId(null);
              }}
            >
              <div className="overview-panel-head">
                <div>
                  <div className="overview-panel-title">{card.title}</div>
                  <div className="overview-panel-sub">{card.subtitle}</div>
                </div>
                <button className="drag-handle" type="button" aria-label="Arrastrar tarjeta" title="Arrastrar tarjeta">
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

              <div className="overview-panel-body">{card.body}</div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
