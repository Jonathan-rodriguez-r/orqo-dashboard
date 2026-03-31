'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type Notification = {
  _id: string;
  type: 'info' | 'warn' | 'error' | 'success';
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

function fmtTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return 'ahora';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

const TYPE_COLOR: Record<string, string> = {
  error: 'var(--red)', warn: 'var(--yellow)', success: 'var(--acc)', info: 'var(--g05)',
};

export default function Topbar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const dropRef = useRef<HTMLDivElement>(null);

  const unread = notifs.filter(n => !n.read).length;

  function load() {
    fetch('/api/notifications').then(r => r.json()).then(d => {
      if (d.ok) setNotifs(d.items ?? []);
    }).catch(() => {});
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  function markAllRead() {
    fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markAllRead: true }) })
      .then(() => load());
  }

  function markRead(id: string) {
    fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
      .then(() => setNotifs(prev => prev.map(n => n._id === id ? { ...n, read: true } : n)));
  }

  return (
    <div className="topbar" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
      <div style={{ flex: 1 }} />

      {/* Notification bell */}
      <div className="notif-wrap" ref={dropRef}>
        <button
          className={`notif-bell${open ? ' open' : ''}`}
          onClick={() => { setOpen(o => !o); if (!open) load(); }}
          aria-label="Notificaciones"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M8 1.5a5 5 0 0 1 5 5v2.5l1 2H2l1-2V6.5a5 5 0 0 1 5-5Z"/>
            <path d="M6.5 13.5a1.5 1.5 0 0 0 3 0" strokeLinecap="round"/>
          </svg>
          {unread > 0 && (
            <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>
          )}
        </button>

        {open && (
          <div className="notif-dropdown">
            <div className="notif-dropdown-header">
              <span>Notificaciones {unread > 0 && <span style={{ color: 'var(--acc)' }}>({unread})</span>}</span>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  style={{ fontSize: 11, color: 'var(--acc)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--f-body)', fontWeight: 600 }}
                >
                  Marcar todas leídas
                </button>
              )}
            </div>

            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
              {notifs.length === 0 ? (
                <div className="notif-empty">Sin notificaciones</div>
              ) : notifs.map(n => (
                <div
                  key={n._id}
                  className={`notif-item${n.read ? '' : ' unread'}`}
                  onClick={() => markRead(n._id)}
                >
                  <div className="notif-item-title" style={{ color: TYPE_COLOR[n.type] ?? 'var(--g07)' }}>
                    {n.title}
                  </div>
                  <div className="notif-item-body">{n.body}</div>
                  <div className="notif-item-time">{fmtTime(n.createdAt)}</div>
                </div>
              ))}
            </div>

            <div style={{ padding: '10px 16px', borderTop: '1px solid var(--g03)' }}>
              <button
                style={{ fontSize: 12, color: 'var(--g05)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--f-body)' }}
                onClick={() => { router.push('/dashboard/settings?tab=alerts'); setOpen(false); }}
              >
                Configurar alertas →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
