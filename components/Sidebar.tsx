'use client';

import { usePathname, useRouter } from 'next/navigation';

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
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  }

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
        <div className="sidebar-user">
          <div className="sidebar-avatar">B</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">Bacata DM</div>
            <div className="sidebar-user-role">Admin</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
