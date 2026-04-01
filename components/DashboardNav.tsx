'use client';

import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';

type Props = { userEmail?: string; userName?: string };
type BrandingState = { logoUrl: string; brandName: string };
const BRAND_THEME_KEY = 'orqo_brand_theme_v1';

function parseHexColor(value: string) {
  const hex = String(value || '').trim();
  const normalized = hex.startsWith('#') ? hex.slice(1) : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function toRgba(hex: string, alpha: number, fallback: string) {
  const rgb = parseHexColor(hex);
  if (!rgb) return fallback;
  const safeAlpha = Math.max(0, Math.min(1, alpha));
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${safeAlpha})`;
}

function normalizeHexColor(value: string, fallback: string) {
  const raw = String(value || '').trim();
  const withHash = raw.startsWith('#') ? raw : `#${raw}`;
  return /^[0-9a-fA-F]{6}$/.test(withHash.slice(1)) ? withHash.toUpperCase() : fallback;
}

function applyBrandTheme(accentRaw: string, secondaryRaw: string) {
  const accent = normalizeHexColor(accentRaw, '#2CB978');
  const secondary = normalizeHexColor(secondaryRaw, '#0B100D');
  const root = document.documentElement;
  root.style.setProperty('--acc', accent);
  root.style.setProperty('--acc-g', toRgba(accent, 0.12, 'rgba(44,185,120,0.12)'));
  root.style.setProperty('--acc-g2', toRgba(accent, 0.06, 'rgba(44,185,120,0.06)'));
  root.style.setProperty('--portal-brand-glow-1', toRgba(accent, 0.2, 'rgba(44,185,120,0.2)'));
  root.style.setProperty('--portal-brand-glow-2', toRgba(accent, 0.08, 'rgba(44,185,120,0.08)'));
  root.style.setProperty('--portal-brand-shadow', toRgba(accent, 0.18, 'rgba(44,185,120,0.18)'));
  root.style.setProperty('--portal-brand-gradient', `linear-gradient(135deg, ${toRgba(accent, 0.22, 'rgba(44,185,120,0.22)')}, ${toRgba(secondary, 0.2, 'rgba(11,16,13,0.2)')})`);
}

export default function DashboardNav({ userEmail, userName }: Props) {
  const [open, setOpen] = useState(false);
  const [branding, setBranding] = useState<BrandingState>({ logoUrl: '', brandName: 'ORQO' });

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

  useEffect(() => {
    try {
      const cached = localStorage.getItem(BRAND_THEME_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        applyBrandTheme(String(parsed?.primary ?? ''), String(parsed?.secondary ?? ''));
      }
    } catch {
      // ignore parse errors from stale cache
    }

    let cancelled = false;

    (async () => {
      try {
        const accountRes = await fetch('/api/account', { cache: 'no-store' });
        const account = await accountRes.json().catch(() => ({}));
        if (cancelled) return;

        const logoUrl = String(account?.logo_url || '').trim();
        const brandName = String(account?.sidebar_name || account?.business_name || 'ORQO').trim();
        setBranding({ logoUrl, brandName: brandName || 'ORQO' });

        const accent = String(account?.brand_primary_color || '#2CB978').trim();
        const secondary = String(account?.brand_secondary_color || '#0B100D').trim();
        applyBrandTheme(accent, secondary);
        localStorage.setItem(BRAND_THEME_KEY, JSON.stringify({
          primary: normalizeHexColor(accent, '#2CB978'),
          secondary: normalizeHexColor(secondary, '#0B100D'),
          updatedAt: Date.now(),
        }));
      } catch {
        // Ignore branding fetch errors; dashboard keeps defaults.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

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
          {branding.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt={branding.brandName || 'Logo'}
              style={{ width: 22, height: 22, objectFit: 'contain', borderRadius: 4, flexShrink: 0 }}
            />
          ) : (
            <svg width="22" height="22" viewBox="0 0 72 72" fill="none">
              <circle cx="36" cy="36" r="30" stroke="#2E4038" strokeWidth="2"/>
              <path d="M52 59.5 A30 30 0 1 1 59.5 52" stroke="#E9EDE9" strokeWidth="3" fill="none" strokeLinecap="round"/>
              <line x1="59.5" y1="52" x2="66" y2="58" stroke="#E9EDE9" strokeWidth="3" strokeLinecap="round"/>
              <circle cx="66" cy="58" r="3.5" fill="var(--acc)"/>
            </svg>
          )}
          <span className="mobile-logo-text">{branding.brandName || 'ORQO'}</span>
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
