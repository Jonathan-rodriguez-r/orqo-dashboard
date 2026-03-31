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
  feedback: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 1.5a6 6 0 1 1 0 12 6 6 0 0 1 0-12ZM8 5.5v3M8 10.5h.01" strokeLinecap="round"/></svg>,
  collapse: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 3L6 8l4 5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  expand:   <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 3l4 5-4 5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

const NAV_MAIN = [
  { href: '/dashboard',               label: 'Vista General',  icon: I.home,     exact: true,  permission: 'dashboard.view'      },
  { href: '/dashboard/conversations', label: 'Conversaciones', icon: I.conv,     exact: false, permission: 'conversations.view'  },
  { href: '/dashboard/agents',        label: 'Agentes',        icon: I.agent,    exact: false, permission: 'agents.view'         },
  { href: '/dashboard/reports',       label: 'Informes',       icon: I.report,   exact: false, permission: 'reports.view'        },
] as const;

const NAV_SYSTEM = [
  { href: '/dashboard/settings',  label: 'Configuración',    icon: I.settings, permission: 'settings.widget' },
  { href: '/dashboard/logs',      label: 'Logs & Auditoría', icon: I.logs,     permission: 'admin.logs'      },
  { href: '/dashboard/feedback',  label: 'Feedback',         icon: I.feedback, permission: null              },
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

  const [collapsed, setCollapsed]     = useState(false);
  const [customLogo, setCustomLogo]   = useState('');
  const [sidebarName, setSidebarName] = useState('');

  // Init theme (Topbar owns the toggle; Sidebar just sets it on mount)
  useEffect(() => {
    const saved = (localStorage.getItem('orqo_theme') as 'dark' | 'light') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  // Init collapse state
  useEffect(() => {
    const saved = localStorage.getItem('orqo_sidebar') === 'collapsed';
    setCollapsed(saved);
    document.documentElement.setAttribute('data-sidebar', saved ? 'collapsed' : 'expanded');
  }, []);

  // Load branding
  useEffect(() => {
    fetch('/api/account').then(r => r.json()).then(d => {
      if (d && !d.error) {
        if (d.logo_url) setCustomLogo(d.logo_url);
        if (d.sidebar_name || d.business_name) setSidebarName(d.sidebar_name || d.business_name);
      }
    }).catch(() => {});
  }, []);

  function toggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('orqo_sidebar', next ? 'collapsed' : 'expanded');
    document.documentElement.setAttribute('data-sidebar', next ? 'collapsed' : 'expanded');
  }

  function isActive(href: string, exact = false) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  function navigate(href: string) {
    router.push(href);
    onClose?.();
  }

  function canSee(permission: string | null) {
    if (isLoading) return true;
    if (!permission) return true;
    return perms.includes(permission);
  }

  return (
    <aside className={`sidebar${isOpen ? ' sidebar-mobile-open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        {customLogo ? (
          <img src={customLogo} alt={sidebarName || 'Logo'} style={{ height: 26, maxWidth: 100, objectFit: 'contain', flexShrink: 0 }} />
        ) : (
          <svg width="26" height="26" viewBox="0 0 72 72" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="36" cy="36" r="30" stroke="#2E4038" strokeWidth="2"/>
            <path d="M52 59.5 A30 30 0 1 1 59.5 52" stroke="#E9EDE9" strokeWidth="3" fill="none" strokeLinecap="round"/>
            <line x1="59.5" y1="52" x2="66" y2="58" stroke="#E9EDE9" strokeWidth="3" strokeLinecap="round"/>
            <circle cx="66" cy="58" r="3.5" fill="#2CB978"/>
          </svg>
        )}
        {(!customLogo || sidebarName) && (
          <span className="sidebar-logo-text sidebar-label">
            {sidebarName ? sidebarName : <>OR<span>QO</span></>}
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-section-label sidebar-label">Principal</div>
        {NAV_MAIN.filter(item => canSee(item.permission)).map(item => (
          <button
            key={item.href}
            className={`sidebar-item${isActive(item.href, item.exact) ? ' active' : ''}`}
            onClick={() => navigate(item.href)}
            title={item.label}
          >
            {item.icon}
            <span className="sidebar-label">{item.label}</span>
          </button>
        ))}

        <div className="nav-section-label sidebar-label" style={{ marginTop: 12 }}>Sistema</div>
        {NAV_SYSTEM.filter(item => canSee(item.permission)).map(item => (
          <button
            key={item.href}
            className={`sidebar-item${isActive(item.href) ? ' active' : ''}`}
            onClick={() => navigate(item.href)}
            title={item.label}
          >
            {item.icon}
            <span className="sidebar-label">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Collapse toggle — icon only */}
      <button
        className="sidebar-collapse-btn"
        onClick={toggleCollapse}
        title={collapsed ? 'Expandir menú' : 'Contraer menú'}
      >
        <span style={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {collapsed ? I.expand : I.collapse}
        </span>
      </button>
    </aside>
  );
}
