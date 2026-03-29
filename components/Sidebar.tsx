'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const NAV = [
  { href: '/dashboard', label: 'Resumen', icon: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="1" width="6" height="6" rx="1.5"/>
      <rect x="9" y="1" width="6" height="6" rx="1.5"/>
      <rect x="1" y="9" width="6" height="6" rx="1.5"/>
      <rect x="9" y="9" width="6" height="6" rx="1.5"/>
    </svg>
  )},
  { href: '/dashboard/widget', label: 'Widget', icon: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="6.5"/>
      <path d="M5.5 9.5s.8 1.5 2.5 1.5 2.5-1.5 2.5-1.5"/>
      <circle cx="5.5" cy="6.5" r="0.75" fill="currentColor"/>
      <circle cx="10.5" cy="6.5" r="0.75" fill="currentColor"/>
    </svg>
  )},
  { href: '/dashboard/agents', label: 'Agentes', icon: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 1.5a3 3 0 0 1 3 3v1a3 3 0 0 1-6 0v-1a3 3 0 0 1 3-3Z"/>
      <path d="M2 14.5c0-3.31 2.686-6 6-6s6 2.69 6 6"/>
    </svg>
  )},
  { href: '/dashboard/conversations', label: 'Conversaciones', icon: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M1.5 3a1.5 1.5 0 0 1 1.5-1.5h10A1.5 1.5 0 0 1 14.5 3v7A1.5 1.5 0 0 1 13 11.5H9l-3 3v-3H3A1.5 1.5 0 0 1 1.5 10V3Z"/>
    </svg>
  )},
  { href: '/dashboard/integrations', label: 'Integraciones', icon: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="3.5" cy="8" r="2"/>
      <circle cx="12.5" cy="3.5" r="2"/>
      <circle cx="12.5" cy="12.5" r="2"/>
      <path d="M5.5 8h3l2-4.5M8.5 8l2 4.5"/>
    </svg>
  )},
  { href: '/dashboard/account', label: 'Cuenta', icon: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="4.5" r="2.5"/>
      <path d="M2 13.5c0-3 2.686-5 6-5s6 2 6 5"/>
    </svg>
  )},
  { href: '/dashboard/users', label: 'Accesos', icon: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="6" cy="4" r="2.5"/>
      <path d="M1 13.5c0-2.76 2.24-5 5-5s5 2.24 5 5"/>
      <path d="M11 2a2.5 2.5 0 0 1 0 5M15 13.5c0-2-1.343-3.716-3.194-4.378"/>
    </svg>
  )},
];

type Props = { userEmail?: string; userName?: string };

export default function Sidebar({ userEmail, userName }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  const [theme, setTheme] = useState<'dark'|'light'>('dark');
  useEffect(() => {
    const saved = (localStorage.getItem('orqo_theme') as 'dark'|'light') || 'dark';
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
  }, []);
  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('orqo_theme', next);
  }

  const initials = (userName ?? userEmail ?? 'U').slice(0, 1).toUpperCase();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <svg width="28" height="28" viewBox="0 0 72 72" fill="none">
          <circle cx="36" cy="36" r="30" stroke="#2E4038" strokeWidth="2"/>
          <path d="M52 59.5 A30 30 0 1 1 59.5 52" stroke="#E9EDE9" strokeWidth="3" fill="none" strokeLinecap="round"/>
          <line x1="59.5" y1="52" x2="66" y2="58" stroke="#E9EDE9" strokeWidth="3" strokeLinecap="round"/>
          <circle cx="66" cy="58" r="3.5" fill="#2CB978"/>
        </svg>
        <span className="sidebar-logo-text">OR<span>QO</span></span>
      </div>

      <nav className="sidebar-nav">
        {NAV.map(item => (
          <button
            key={item.href}
            className={`sidebar-item${isActive(item.href) ? ' active' : ''}`}
            onClick={() => router.push(item.href)}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user" style={{marginBottom:'10px'}}>
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{userName ?? userEmail ?? 'Usuario'}</div>
            <div className="sidebar-user-role">{userEmail}</div>
          </div>
          <button className="theme-btn" onClick={toggleTheme} title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}>
            {theme === 'dark' ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.8"/>
                <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        </div>
        <button
          className="sidebar-item"
          style={{width:'100%',color:'var(--g05)'}}
          onClick={logout}
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:14,height:14}}>
            <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3M10 11l3-3-3-3M13 8H6"/>
          </svg>
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
