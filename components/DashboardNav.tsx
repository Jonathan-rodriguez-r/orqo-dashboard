'use client';

import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';

type Props = { userEmail?: string; userName?: string };

export default function DashboardNav({ userEmail, userName }: Props) {
  const [open, setOpen] = useState(false);

  // Close on route change (pathname change)
  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener('popstate', close);
    return () => window.removeEventListener('popstate', close);
  }, []);

  // Prevent body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      {/* Mobile top bar */}
      <header className="mobile-topbar">
        <button
          className="hamburger-btn"
          aria-label="Abrir menú"
          onClick={() => setOpen(o => !o)}
        >
          <span className={`ham-line ${open ? 'open' : ''}`} />
          <span className={`ham-line ${open ? 'open' : ''}`} />
          <span className={`ham-line ${open ? 'open' : ''}`} />
        </button>

        <div className="mobile-logo">
          <svg width="22" height="22" viewBox="0 0 72 72" fill="none">
            <circle cx="36" cy="36" r="30" stroke="#2E4038" strokeWidth="2"/>
            <path d="M52 59.5 A30 30 0 1 1 59.5 52" stroke="#E9EDE9" strokeWidth="3" fill="none" strokeLinecap="round"/>
            <line x1="59.5" y1="52" x2="66" y2="58" stroke="#E9EDE9" strokeWidth="3" strokeLinecap="round"/>
            <circle cx="66" cy="58" r="3.5" fill="#2CB978"/>
          </svg>
          <span className="mobile-logo-text">OR<span>QO</span></span>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />
      </header>

      {/* Overlay */}
      {open && (
        <div
          className="sidebar-overlay"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — isOpen controls mobile drawer */}
      <Sidebar
        userEmail={userEmail}
        userName={userName}
        isOpen={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
