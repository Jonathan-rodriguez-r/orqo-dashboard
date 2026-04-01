'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/usePermissions';

// ── Types ─────────────────────────────────────────────────────────────────────

type Notification = {
  _id: string;
  type: 'info' | 'warn' | 'error' | 'success' | 'warning' | 'critical';
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return 'ahora';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

const TYPE_COLOR: Record<string, string> = {
  error: 'var(--red)',
  critical: 'var(--red)',
  warn: 'var(--yellow)',
  warning: 'var(--yellow)',
  success: 'var(--acc)',
  info: 'var(--g05)',
};

// ── Icons ─────────────────────────────────────────────────────────────────────

const SunIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

const MoonIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ── Topbar button base style ──────────────────────────────────────────────────

const btnStyle: React.CSSProperties = {
  width: 34, height: 34, borderRadius: 8,
  background: 'none', border: '1px solid var(--g03)',
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: 'var(--g05)', flexShrink: 0, transition: 'background 0.15s, color 0.15s',
  padding: 0,
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function Topbar() {
  const router  = useRouter();
  const session = useSession();

  // Notifications
  const [bellOpen, setBellOpen] = useState(false);
  const [notifs, setNotifs]     = useState<Notification[]>([]);
  const bellRef = useRef<HTMLDivElement>(null);
  const unread  = notifs.filter(n => !n.read).length;

  // User dropdown
  const [userOpen, setUserOpen]     = useState(false);
  const [theme, setTheme]           = useState<'dark'|'light'>('dark');
  const userRef = useRef<HTMLDivElement>(null);

  // ── Init theme from localStorage ──
  useEffect(() => {
    const saved = (localStorage.getItem('orqo_theme') as 'dark'|'light') || 'dark';
    setTheme(saved);
  }, []);

  // ── Load notifications ──
  function loadNotifs() {
    fetch('/api/notifications').then(r => r.json()).then(d => {
      if (d.ok) setNotifs(d.items ?? []);
    }).catch(() => {});
  }

  useEffect(() => {
    loadNotifs();
    const id = setInterval(loadNotifs, 60_000);
    return () => clearInterval(id);
  }, []);

  // ── Close on outside click ──
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (bellOpen && bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
      if (userOpen && userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [bellOpen, userOpen]);

  function markAllRead() {
    fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markAllRead: true }) })
      .then(() => loadNotifs());
  }

  function markRead(id: string) {
    fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
      .then(() => setNotifs(prev => prev.map(n => n._id === id ? { ...n, read: true } : n)));
  }

  function removeNotif(id: string) {
    fetch('/api/notifications', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).then(() => setNotifs(prev => prev.filter(n => n._id !== id)));
  }

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('orqo_theme', next);
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  const displayName = session?.name ?? session?.email ?? '…';
  const initials    = displayName.slice(0, 1).toUpperCase();

  return (
    <div className="topbar" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
      <div className="topbar-left-chip" aria-hidden="true">
        <span className="topbar-left-dot" />
        <span>Control</span>
      </div>
      <div style={{ flex: 1 }} />

      {/* ── Help button ── */}
      <button
        style={btnStyle}
        title="Centro de ayuda"
        onClick={() => router.push('/dashboard/docs')}
      >
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="8" cy="8" r="6.5"/>
          <path d="M6.5 6.5a1.5 1.5 0 0 1 3 .5c0 1-1.5 1.5-1.5 2.5" strokeLinecap="round"/>
          <circle cx="8" cy="11.5" r=".75" fill="currentColor" stroke="none"/>
        </svg>
      </button>

      {/* ── Notification bell ── */}
      <div className="notif-wrap" ref={bellRef}>
        <button
          className={`notif-bell${bellOpen ? ' open' : ''}`}
          onClick={() => { setBellOpen(o => !o); if (!bellOpen) loadNotifs(); }}
          aria-label="Notificaciones"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M8 1.5a5 5 0 0 1 5 5v2.5l1 2H2l1-2V6.5a5 5 0 0 1 5-5Z"/>
            <path d="M6.5 13.5a1.5 1.5 0 0 0 3 0" strokeLinecap="round"/>
          </svg>
          {unread > 0 && <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>}
        </button>

        {bellOpen && (
          <div className="notif-dropdown">
            <div className="notif-dropdown-header">
              <span>Notificaciones {unread > 0 && <span style={{ color: 'var(--acc)' }}>({unread})</span>}</span>
              {unread > 0 && (
                <button onClick={markAllRead} style={{ fontSize: 11, color: 'var(--acc)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--f-body)', fontWeight: 600 }}>
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
                  onClick={() => { if (!n.read) markRead(n._id); }}
                  style={{ position: 'relative', paddingRight: 34 }}
                >
                  <button
                    aria-label="Eliminar alerta"
                    title="Eliminar alerta"
                    onClick={(e) => { e.stopPropagation(); removeNotif(n._id); }}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: 10,
                      width: 20,
                      height: 20,
                      border: '1px solid var(--g03)',
                      borderRadius: 99,
                      background: 'var(--g02)',
                      color: 'var(--g06)',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 700,
                      lineHeight: 1,
                      padding: 0,
                      zIndex: 2,
                    }}
                  >
                    ✕
                  </button>
                  <div className="notif-item-title" style={{ color: TYPE_COLOR[n.type] ?? 'var(--g07)' }}>{n.title}</div>
                  <div className="notif-item-body">{n.body}</div>
                  <div className="notif-item-time">{fmtTime(n.createdAt)}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: '10px 16px', borderTop: '1px solid var(--g03)' }}>
              <button
                style={{ fontSize: 12, color: 'var(--g05)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--f-body)' }}
                onClick={() => { router.push('/dashboard/settings?tab=access&sub=alerts'); setBellOpen(false); }}
              >
                Configurar alertas →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── User avatar + dropdown ── */}
      <div className="notif-wrap" ref={userRef}>
        <button
          onClick={() => setUserOpen(o => !o)}
          title={session?.email}
          style={{ ...btnStyle, width: 34, height: 34, borderRadius: '50%', overflow: 'hidden', padding: 0 }}
        >
          {session?.avatar ? (
            <img src={session.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontFamily: 'var(--f-disp)', fontWeight: 700, fontSize: 13, color: 'var(--acc)' }}>
              {initials}
            </span>
          )}
        </button>

        {userOpen && (
          <div className="notif-dropdown" style={{ width: 220 }}>
            {/* User info header */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--g03)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--g07)', marginBottom: 2 }}>{displayName}</div>
              <div style={{ fontSize: 11, color: 'var(--g05)' }}>{session?.email}</div>
            </div>

            {/* Theme toggle */}
            <button className="user-popover-item" onClick={toggleTheme}>
              <span style={{ color: 'var(--g05)' }}>{theme === 'dark' ? <SunIcon /> : <MoonIcon />}</span>
              {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            </button>

            {/* Feedback */}
            <button className="user-popover-item" onClick={() => { router.push('/dashboard/feedback'); setUserOpen(false); }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M8 1.5a6 6 0 1 1 0 12 6 6 0 0 1 0-12ZM8 5.5v3M8 10.5h.01" strokeLinecap="round"/>
              </svg>
              Enviar feedback
            </button>

            <hr className="user-popover-divider" />

            {/* Logout */}
            <button className="user-popover-item user-popover-item-danger" onClick={logout}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3M10 11l3-3-3-3M13 8H6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
