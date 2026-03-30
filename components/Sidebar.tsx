'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSession } from '@/hooks/usePermissions';

// ── Icons ─────────────────────────────────────────────────────────────────────
const I = {
  home:     <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1.5 6.5 8 1.5l6.5 5V14a.5.5 0 0 1-.5.5H10v-4H6v4H2a.5.5 0 0 1-.5-.5V6.5Z" strokeLinejoin="round"/></svg>,
  logs:     <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4h12M2 7.5h9M2 11h6" strokeLinecap="round"/></svg>,
  conv:     <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1.5 3A1.5 1.5 0 0 1 3 1.5h10A1.5 1.5 0 0 1 14.5 3v7A1.5 1.5 0 0 1 13 11.5H9l-3 3v-3H3A1.5 1.5 0 0 1 1.5 10V3Z"/></svg>,
  agent:    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 1.5a3 3 0 0 1 3 3v1a3 3 0 0 1-6 0v-1a3 3 0 0 1 3-3Z"/><path d="M2 14.5c0-3.31 2.686-6 6-6s6 2.69 6 6"/></svg>,
  report:   <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1.5" y="1.5" width="13" height="13" rx="1.5"/><path d="M4.5 10.5V8M7.5 10.5V6M10.5 10.5V4" strokeLinecap="round"/></svg>,
  settings: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="2.5"/><path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M11.89 3.05l-1.06 1.06M4.11 11.89l-1.06 1.06" strokeLinecap="round"/></svg>,
  docs:     <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 2h8l4 4v8H2z" strokeLinejoin="round"/><path d="M10 2v4h4" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 8h6M5 11h4" strokeLinecap="round"/></svg>,
  logout:   <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3M10 11l3-3-3-3M13 8H6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  external: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:14,height:14,flexShrink:0}}><path d="M7 3H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-4M9 1h5m0 0v5m0-5L7 9" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  sun:      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.8"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  moon:     <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

// permission required to see each nav item (null = always visible)
const NAV_MAIN = [
  { href: '/dashboard',               label: 'Vista General',  icon: I.home,   exact: true,  permission: 'dashboard.view' },
  { href: '/dashboard/conversations', label: 'Conversaciones', icon: I.conv,   exact: false, permission: 'conversations.view' },
  { href: '/dashboard/agents',        label: 'Agentes',        icon: I.agent,  exact: false, permission: 'agents.view' },
  { href: '/dashboard/reports',       label: 'Informes',       icon: I.report, exact: false, permission: 'reports.view' },
] as const;

const NAV_SYSTEM = [
  { href: '/dashboard/settings', label: 'Configuración',   icon: I.settings, permission: 'settings.widget' },
  { href: '/dashboard/logs',     label: 'Logs & Auditoría', icon: I.logs,    permission: 'admin.logs'      },
  { href: '/dashboard/docs',     label: 'Centro de ayuda', icon: I.docs,     permission: null              },
] as const;

type Props = {
  userEmail?: string;
  userName?: string;
  isOpen?: boolean;
  onClose?: () => void;
};

export default function Sidebar({ userEmail, userName, isOpen = false, onClose }: Props) {
  const pathname  = usePathname();
  const router    = useRouter();
  const session   = useSession();
  const perms     = session?.permissions ?? [];
  const isLoading = session === undefined;

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [customLogo, setCustomLogo] = useState('');
  const [sidebarName, setSidebarName] = useState('');

  useEffect(() => {
    const saved = (localStorage.getItem('orqo_theme') as 'dark' | 'light') || 'dark';
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  useEffect(() => {
    fetch('/api/account').then(r => r.json()).then(d => {
      if (d && !d.error) {
        if (d.logo_url) setCustomLogo(d.logo_url);
        if (d.sidebar_name || d.business_name) setSidebarName(d.sidebar_name || d.business_name);
      }
    }).catch(() => {});
  }, []);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('orqo_theme', next);
  }

  function isActive(href: string, exact = false) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  function navigate(href: string) {
    router.push(href);
    onClose?.();
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  function canSee(permission: string | null) {
    if (isLoading) return true;      // show all while loading (no flicker)
    if (!permission) return true;    // no permission required
    return perms.includes(permission);
  }

  const displayName = session?.name ?? userName ?? userEmail ?? 'Usuario';
  const displayEmail = session?.email ?? userEmail ?? '';
  const displayRole = session?.role ?? '';
  const avatar = session?.avatar;
  const initials = displayName.slice(0, 1).toUpperCase();

  const ROLE_LABEL: Record<string, string> = {
    owner: 'Propietario', admin: 'Administrador', operations: 'Operaciones',
    analyst: 'Analista', agent_manager: 'Gestor Agentes', viewer: 'Observador',
  };

  return (
    <aside className={`sidebar${isOpen ? ' sidebar-mobile-open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        {customLogo ? (
          <img
            src={customLogo}
            alt={sidebarName || 'Logo'}
            style={{ height: 26, maxWidth: 100, objectFit: 'contain', flexShrink: 0 }}
          />
        ) : (
          <svg width="26" height="26" viewBox="0 0 72 72" fill="none">
            <circle cx="36" cy="36" r="30" stroke="#2E4038" strokeWidth="2"/>
            <path d="M52 59.5 A30 30 0 1 1 59.5 52" stroke="#E9EDE9" strokeWidth="3" fill="none" strokeLinecap="round"/>
            <line x1="59.5" y1="52" x2="66" y2="58" stroke="#E9EDE9" strokeWidth="3" strokeLinecap="round"/>
            <circle cx="66" cy="58" r="3.5" fill="#2CB978"/>
          </svg>
        )}
        {(!customLogo || sidebarName) && (
          <span className="sidebar-logo-text">
            {sidebarName ? sidebarName : <>OR<span>QO</span></>}
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-section-label">Principal</div>
        {NAV_MAIN.filter(item => canSee(item.permission)).map(item => (
          <button
            key={item.href}
            className={`sidebar-item${isActive(item.href, item.exact) ? ' active' : ''}`}
            onClick={() => navigate(item.href)}
          >
            {item.icon}
            {item.label}
          </button>
        ))}

        <div className="nav-section-label" style={{ marginTop: 12 }}>Sistema</div>
        {NAV_SYSTEM.filter(item => canSee(item.permission)).map(item => (
          <button
            key={item.href}
            className={`sidebar-item${isActive(item.href) ? ' active' : ''}`}
            onClick={() => navigate(item.href)}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user" style={{ marginBottom: 8 }}>
          {avatar
            ? <img src={avatar} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}/>
            : <div className="sidebar-avatar">{initials}</div>
          }
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{displayName}</div>
            <div className="sidebar-user-role">{ROLE_LABEL[displayRole] ?? displayEmail}</div>
          </div>
          <button className="theme-btn" onClick={toggleTheme} title="Cambiar tema">
            {theme === 'dark' ? I.sun : I.moon}
          </button>
        </div>

        <a
          href="https://orqo.io"
          target="_blank"
          rel="noopener"
          className="sidebar-item"
          style={{ color: 'var(--g05)', textDecoration: 'none' }}
          onClick={onClose}
        >
          {I.external}
          orqo.io
        </a>
        <button
          className="sidebar-item"
          style={{ width: '100%', color: 'var(--g05)' }}
          onClick={logout}
        >
          {I.logout}
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
