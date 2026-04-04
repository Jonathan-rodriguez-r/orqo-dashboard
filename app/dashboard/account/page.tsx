'use client';

import { useEffect, useRef, useState } from 'react';

type AccountCfg = {
  plan: string;
  interactions_limit: number;
  interactions_used: number;
  business_name: string;
  email: string;
  website: string;
  active_domain: string;
  widget_page_url: string;
  timezone: string;
  language: string;
  api_key: string;
  widget_last_seen_at: number;
  widget_seen_domains: string[];
  logo_url: string;
  sidebar_name: string;
  support_email: string;
  phone: string;
  address: string;
  industry: string;
  brand_primary_color: string;
  brand_secondary_color: string;
  operations_owner: string;
  report_recipients: string;
  sla_first_response_min: number;
  escalation_email: string;
  incident_whatsapp: string;
  report_footer_note: string;
  client_id: string;
  client_name: string;
};

const DEFAULTS: AccountCfg = {
  plan: 'Starter',
  interactions_limit: 1000,
  interactions_used: 0,
  business_name: '',
  email: '',
  website: '',
  active_domain: '',
  widget_page_url: '',
  timezone: 'America/Bogota',
  language: 'es',
  api_key: '',
  widget_last_seen_at: 0,
  widget_seen_domains: [],
  logo_url: '',
  sidebar_name: '',
  support_email: '',
  phone: '',
  address: '',
  industry: '',
  brand_primary_color: '#2CB978',
  brand_secondary_color: '#0B100D',
  operations_owner: '',
  report_recipients: '',
  sla_first_response_min: 15,
  escalation_email: '',
  incident_whatsapp: '',
  report_footer_note: '',
  client_id: '',
  client_name: '',
};

const INDUSTRIES = [
  '', 'E-commerce / Retail', 'Salud y Bienestar', 'Educación', 'Servicios Financieros',
  'Bienes Raíces', 'Hospitalidad y Turismo', 'Tecnología / SaaS', 'Logística y Transporte',
  'Manufactura', 'Consultoría y Servicios Profesionales', 'Entretenimiento y Medios', 'Otro',
];

const COLOR_PRESETS = [
  { name: 'ORQO', primary: '#2CB978', secondary: '#0B100D' },
  { name: 'Emerald', primary: '#10B981', secondary: '#0F172A' },
  { name: 'Ocean', primary: '#0EA5E9', secondary: '#082F49' },
  { name: 'Graphite', primary: '#22C55E', secondary: '#111827' },
  { name: 'Sunset', primary: '#F97316', secondary: '#1F2937' },
];
const BRAND_THEME_KEY = 'orqo_brand_theme_v1';

function normalizeHex(value: string, fallback: string) {
  const raw = String(value || '').trim();
  const withHash = raw.startsWith('#') ? raw : `#${raw}`;
  return /^#[0-9a-fA-F]{6}$/.test(withHash) ? withHash.toUpperCase() : fallback;
}

function hexToRgb(value: string) {
  const hex = normalizeHex(value, '#000000').slice(1);
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

function luminance(value: string) {
  const { r, g, b } = hexToRgb(value);
  const map = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * map[0] + 0.7152 * map[1] + 0.0722 * map[2];
}

function contrastRatio(foreground: string, background: string) {
  const l1 = luminance(foreground);
  const l2 = luminance(background);
  const bright = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return (bright + 0.05) / (dark + 0.05);
}

type Props = { embedded?: boolean };

export default function AccountPage({ embedded = false }: Props) {
  const [cfg, setCfg] = useState<AccountCfg>(() => {
    if (typeof window === 'undefined') return DEFAULTS;
    try {
      const raw = localStorage.getItem(BRAND_THEME_KEY);
      if (!raw) return DEFAULTS;
      const cached = JSON.parse(raw);
      return {
        ...DEFAULTS,
        brand_primary_color: normalizeHex(String(cached?.primary ?? ''), '#2CB978'),
        brand_secondary_color: normalizeHex(String(cached?.secondary ?? ''), '#0B100D'),
      };
    } catch {
      return DEFAULTS;
    }
  });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoMode, setLogoMode] = useState<'url' | 'file'>('url');
  const [logoPreview, setLogoPreview] = useState('');
  const [logoError, setLogoError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/account').then(r => r.json()).then(d => {
      if (d && !d.error) {
        const primary = normalizeHex(String(d.brand_primary_color ?? ''), '#2CB978');
        const secondary = normalizeHex(String(d.brand_secondary_color ?? ''), '#0B100D');
        setCfg({ ...DEFAULTS, ...d, brand_primary_color: primary, brand_secondary_color: secondary });
        localStorage.setItem(BRAND_THEME_KEY, JSON.stringify({ primary, secondary, updatedAt: Date.now() }));
        if (d.logo_url) setLogoPreview(d.logo_url);
      }
    });
  }, []);

  function set(key: string, val: string | number) {
    setCfg(p => ({ ...p, [key]: val }));
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 512 * 1024) {
      setLogoError('El archivo no puede superar 512 KB. Usa una imagen comprimida o una URL externa.');
      return;
    }
    setLogoError('');
    const reader = new FileReader();
    reader.onload = ev => {
      const result = ev.target?.result as string;
      setLogoPreview(result);
      set('logo_url', result);
    };
    reader.readAsDataURL(file);
  }

  function handleLogoUrlChange(url: string) {
    set('logo_url', url);
    setLogoPreview(url);
    setLogoError('');
  }

  function clearLogo() {
    set('logo_url', '');
    setLogoPreview('');
    if (fileRef.current) fileRef.current.value = '';
  }

  async function save() {
    setSaving(true);
    await fetch('/api/account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg),
    });
    const primary = normalizeHex(cfg.brand_primary_color, '#2CB978');
    const secondary = normalizeHex(cfg.brand_secondary_color, '#0B100D');
    localStorage.setItem(BRAND_THEME_KEY, JSON.stringify({ primary, secondary, updatedAt: Date.now() }));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const usagePct = cfg.interactions_limit > 0
    ? Math.min(100, Math.round((cfg.interactions_used / cfg.interactions_limit) * 100))
    : 0;
  const primary = normalizeHex(cfg.brand_primary_color, '#2CB978');
  const secondary = normalizeHex(cfg.brand_secondary_color, '#0B100D');
  const contrast = contrastRatio(primary, secondary);
  const contrastState = contrast >= 4.5 ? 'OK' : contrast >= 3 ? 'WARN' : 'LOW';
  useEffect(() => {
    const p = hexToRgb(primary);
    const s = hexToRgb(secondary);
    const root = document.documentElement;
    root.style.setProperty('--acc', primary);
    root.style.setProperty('--acc-g', `rgba(${p.r}, ${p.g}, ${p.b}, 0.12)`);
    root.style.setProperty('--acc-g2', `rgba(${p.r}, ${p.g}, ${p.b}, 0.06)`);
    root.style.setProperty('--portal-brand-glow-1', `rgba(${p.r}, ${p.g}, ${p.b}, 0.22)`);
    root.style.setProperty('--portal-brand-glow-2', `rgba(${p.r}, ${p.g}, ${p.b}, 0.1)`);
    root.style.setProperty('--portal-brand-shadow', `rgba(${p.r}, ${p.g}, ${p.b}, 0.18)`);
    root.style.setProperty(
      '--portal-brand-gradient',
      `linear-gradient(135deg, rgba(${p.r}, ${p.g}, ${p.b}, 0.22), rgba(${s.r}, ${s.g}, ${s.b}, 0.2))`
    );
  }, [primary, secondary]);

  return (
    <div className={embedded ? '' : 'dash-content'}>
      {!embedded && (
        <div className="page-header">
          <h1 className="page-title">Cuenta</h1>
          <p className="page-sub">Administra tu plan, identidad del dashboard y configuración del negocio</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* â”€â”€ Plan â”€â”€ */}
        <div className="card">
          <div className="card-title">Plan actual</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--f-disp)', fontWeight: 700, fontSize: 20, color: 'var(--g08)' }}>{cfg.plan}</div>
              <div style={{ fontSize: 12.5, color: 'var(--g05)' }}>
                {cfg.interactions_used.toLocaleString()} / {cfg.interactions_limit.toLocaleString()} interacciones usadas este mes
              </div>
            </div>
            <span className="badge badge-green">{cfg.plan}</span>
          </div>
          <div className="progress-wrap">
            <div className="progress-labels">
              <span>{usagePct}% utilizado</span>
              <span>{(cfg.interactions_limit - cfg.interactions_used).toLocaleString()} disponibles</span>
            </div>
            <div className="progress-bar">
              <div
                className={`progress-fill${usagePct > 85 ? ' danger' : usagePct > 65 ? ' warn' : ''}`}
                style={{ width: `${usagePct}%` }}
              />
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <button className="btn btn-ghost btn-sm" style={{ opacity: 0.5, cursor: 'not-allowed' }} disabled>
              Actualizar plan — próximamente
            </button>
          </div>
        </div>

        {/* â”€â”€ Identidad del dashboard â”€â”€ */}
        <div className="card">
          <div className="card-title">Identidad del dashboard</div>
          <p style={{ fontSize: 12.5, color: 'var(--g05)', marginBottom: 16 }}>
            Personaliza el dashboard con el logo y nombre de tu empresa. El logo aparece en la barra lateral en lugar del isotipo ORQO.
          </p>

          {/* Logo preview + controls */}
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 16 }}>
            {/* Preview box */}
            <div style={{ width: 100, height: 100, borderRadius: 12, border: '1px solid var(--g03)', background: 'var(--g02)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} onError={() => setLogoError('No se pudo cargar la imagen. Verifica la URL.')} />
              ) : (
                <svg width="32" height="32" viewBox="0 0 72 72" fill="none" opacity={0.3}>
                  <path d="M52 59.5 A30 30 0 1 1 59.5 52" stroke="var(--g07)" strokeWidth="3" fill="none" strokeLinecap="round"/>
                  <line x1="59.5" y1="52" x2="66" y2="58" stroke="var(--g07)" strokeWidth="3" strokeLinecap="round"/>
                  <circle cx="66" cy="58" r="3.5" fill="var(--acc)"/>
                </svg>
              )}
            </div>

            {/* Controls */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                <button
                  type="button"
                  className={`btn btn-sm ${logoMode === 'url' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setLogoMode('url')}
                >
                  Por URL
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${logoMode === 'file' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setLogoMode('file')}
                >
                  Subir archivo
                </button>
                {logoPreview && (
                  <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={clearLogo}>
                    Quitar
                  </button>
                )}
              </div>

              {logoMode === 'url' ? (
                <input
                  className="input"
                  placeholder="https://miempresa.com/logo.png"
                  value={cfg.logo_url.startsWith('data:') ? '' : cfg.logo_url}
                  onChange={e => handleLogoUrlChange(e.target.value)}
                />
              ) : (
                <>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                  />
                  <button type="button" className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
                    Elegir imagen…
                  </button>
                  <div style={{ fontSize: 11, color: 'var(--g04)', marginTop: 6 }}>PNG, SVG, JPEG o WebP · máx. 512 KB</div>
                </>
              )}

              {logoError && (
                <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 6 }}>{logoError}</div>
              )}
              <div style={{ fontSize: 11, color: 'var(--g04)', marginTop: 6 }}>
                Recomendado: imagen cuadrada o horizontal, fondo transparente (PNG/SVG).
              </div>
            </div>
          </div>

          <div className="field">
            <label className="label">Nombre en la barra lateral</label>
            <input
              className="input"
              value={cfg.sidebar_name}
              onChange={e => set('sidebar_name', e.target.value)}
              placeholder={cfg.business_name || 'Mi empresa'}
              maxLength={32}
            />
            <div style={{ fontSize: 11, color: 'var(--g04)', marginTop: 4 }}>
              Si está vacío, se usa el nombre del negocio (o "ORQO" si tampoco está definido).
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label className="label">Color primario del portal</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="color"
                  value={cfg.brand_primary_color || '#2CB978'}
                  onChange={e => set('brand_primary_color', e.target.value)}
                  style={{ width: 44, height: 34, border: '1px solid var(--g03)', borderRadius: 8, background: 'transparent', cursor: 'pointer' }}
                />
                <input
                  className="input input-mono"
                  value={cfg.brand_primary_color}
                  onChange={e => set('brand_primary_color', e.target.value)}
                  placeholder="#2CB978"
                  style={{ maxWidth: 130 }}
                />
              </div>
            </div>
            <div className="field">
              <label className="label">Color secundario del portal</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="color"
                  value={cfg.brand_secondary_color || '#0B100D'}
                  onChange={e => set('brand_secondary_color', e.target.value)}
                  style={{ width: 44, height: 34, border: '1px solid var(--g03)', borderRadius: 8, background: 'transparent', cursor: 'pointer' }}
                />
                <input
                  className="input input-mono"
                  value={cfg.brand_secondary_color}
                  onChange={e => set('brand_secondary_color', e.target.value)}
                  placeholder="#0B100D"
                  style={{ maxWidth: 130 }}
                />
              </div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--g04)', marginTop: -4 }}>
            Estos colores aplican para el portal y para la exportacion de informes. No modifican la configuracion del widget.
          </div>

          <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ padding: '6px 10px' }}
                onClick={() => {
                  set('brand_primary_color', preset.primary);
                  set('brand_secondary_color', preset.secondary);
                }}
              >
                <span style={{ width: 11, height: 11, borderRadius: '50%', background: preset.primary, border: `1px solid ${preset.secondary}` }} />
                {preset.name}
              </button>
            ))}
            <button
              type="button"
              className="btn btn-sm"
              style={{ background: 'color-mix(in srgb, var(--acc) 14%, transparent)', color: 'var(--acc)', border: '1px solid color-mix(in srgb, var(--acc) 45%, var(--g03) 55%)' }}
              onClick={() => {
                set('brand_primary_color', '#2CB978');
                set('brand_secondary_color', '#0B100D');
              }}
            >
              Restablecer ORQO
            </button>
          </div>

          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className={`badge ${contrastState === 'OK' ? 'badge-green' : contrastState === 'WARN' ? 'badge-yellow' : 'badge-red'}`}>
              Contraste {contrastState}
            </span>
            <span style={{ fontSize: 11.5, color: 'var(--g05)' }}>
              Ratio actual: {contrast.toFixed(2)}:1 (recomendado {'>='} 4.5:1 para texto pequeno).
            </span>
          </div>

          <div style={{ marginTop: 14, border: '1px solid var(--g03)', borderRadius: 12, background: 'var(--g00)', overflow: 'hidden' }}>
            <div
              style={{
                background: `linear-gradient(135deg, ${primary}33, ${secondary}CC)`,
                borderBottom: '1px solid var(--g03)',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
              }}
            >
              <div style={{ fontFamily: 'var(--f-disp)', fontWeight: 700, color: 'var(--g08)', fontSize: 13 }}>
                Vista previa del portal
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: primary }} />
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: secondary }} />
              </div>
            </div>
            <div style={{ padding: 12, display: 'grid', gridTemplateColumns: '110px 1fr', gap: 10 }}>
              <div style={{ border: '1px solid var(--g03)', borderRadius: 10, background: secondary, minHeight: 100, padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ height: 12, borderRadius: 6, background: `${primary}AA` }} />
                <div style={{ height: 9, borderRadius: 6, background: 'rgba(255,255,255,0.18)' }} />
                <div style={{ height: 9, borderRadius: 6, width: '80%', background: 'rgba(255,255,255,0.15)' }} />
                <div style={{ marginTop: 'auto', height: 24, borderRadius: 7, background: `${primary}CC` }} />
              </div>
              <div style={{ border: '1px solid var(--g03)', borderRadius: 10, background: 'var(--g01)', padding: 8, display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div style={{ height: 12, borderRadius: 6, background: `${primary}44`, border: `1px solid ${primary}66` }} />
                <div style={{ height: 8, borderRadius: 6, width: '68%', background: 'var(--g03)' }} />
                <div style={{ marginTop: 'auto', display: 'flex', gap: 7 }}>
                  <div style={{ flex: 1, height: 26, borderRadius: 8, background: primary }} />
                  <div style={{ flex: 1, height: 26, borderRadius: 8, border: `1px solid ${primary}66`, background: `${primary}22` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* â”€â”€ Información del negocio â”€â”€ */}
        <div className="card">
          <div className="card-title">Información del negocio</div>
          <div className="field-row">
            <div className="field">
              <label className="label">Nombre del negocio</label>
              <input className="input" value={cfg.business_name} onChange={e => set('business_name', e.target.value)} placeholder="Mi empresa"/>
            </div>
            <div className="field">
              <label className="label">Industria</label>
              <select className="input" value={cfg.industry} onChange={e => set('industry', e.target.value)}>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i || '— Seleccionar —'}</option>)}
              </select>
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label className="label">Email de contacto</label>
              <input className="input" type="email" value={cfg.email} onChange={e => set('email', e.target.value)} placeholder="hola@miempresa.com"/>
            </div>
            <div className="field">
              <label className="label">Email de soporte</label>
              <input className="input" type="email" value={cfg.support_email} onChange={e => set('support_email', e.target.value)} placeholder="soporte@miempresa.com"/>
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label className="label">Sitio web</label>
              <input className="input" value={cfg.website} onChange={e => set('website', e.target.value)} placeholder="https://miempresa.com"/>
            </div>
            <div className="field">
              <label className="label">Teléfono</label>
              <input className="input" value={cfg.phone} onChange={e => set('phone', e.target.value)} placeholder="+57 300 000 0000"/>
            </div>
          </div>
          <div className="field">
            <label className="label">Dirección</label>
            <input className="input" value={cfg.address} onChange={e => set('address', e.target.value)} placeholder="Calle 123 #45-67, Bogotá, Colombia"/>
          </div>
          <div className="field-row">
            <div className="field">
              <label className="label">Cliente asociado</label>
              <input className="input" value={cfg.client_name || cfg.client_id || 'Sin asignar'} disabled readOnly />
            </div>
            <div className="field">
              <label className="label">ID cliente</label>
              <input className="input input-mono" value={cfg.client_id || '-'} disabled readOnly />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label className="label">Dominio activo</label>
              <input className="input" value={cfg.active_domain} disabled readOnly placeholder="Se detecta automáticamente"/>
            </div>
            <div className="field">
              <label className="label">Página donde aparece el widget</label>
              <input className="input" value={cfg.widget_page_url} disabled readOnly placeholder="Se detecta automáticamente"/>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--g04)', marginTop: -4 }}>
            Estos campos se actualizan cuando el widget embebido carga o recibe mensajes desde el sitio del cliente.
          </div>
          <div className="field-row">
            <div className="field">
              <label className="label">Zona horaria</label>
              <select className="input" value={cfg.timezone} onChange={e => set('timezone', e.target.value)}>
                <option value="America/Bogota">América/Bogotá (COT)</option>
                <option value="America/Mexico_City">América/Ciudad de México (CST)</option>
                <option value="America/Argentina/Buenos_Aires">América/Buenos Aires (ART)</option>
                <option value="America/Santiago">América/Santiago (CLT)</option>
                <option value="America/Lima">América/Lima (PET)</option>
                <option value="America/New_York">América/Nueva York (EST)</option>
                <option value="Europe/Madrid">Europa/Madrid (CET)</option>
              </select>
            </div>
            <div className="field">
              <label className="label">Idioma del widget</label>
              <select className="input" value={cfg.language} onChange={e => set('language', e.target.value)}>
                <option value="es">Español</option>
                <option value="en">English</option>
                <option value="pt">Português</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Operacion y reportes</div>
          <p style={{ fontSize: 12.5, color: 'var(--g05)', marginBottom: 14 }}>
            Estos datos se usan para personalizar informes gerenciales, alertas y seguimiento operativo por cliente.
          </p>
          <div className="field-row">
            <div className="field">
              <label className="label">Responsable de operaciones</label>
              <input
                className="input"
                value={cfg.operations_owner}
                onChange={e => set('operations_owner', e.target.value)}
                placeholder="Nombre del responsable"
              />
            </div>
            <div className="field">
              <label className="label">SLA primera respuesta (min)</label>
              <input
                className="input"
                type="number"
                min={1}
                max={180}
                value={cfg.sla_first_response_min}
                onChange={e => set('sla_first_response_min', Number(e.target.value || 0))}
              />
            </div>
          </div>
          <div className="field">
            <label className="label">Destinatarios de informes (emails separados por coma)</label>
            <input
              className="input"
              value={cfg.report_recipients}
              onChange={e => set('report_recipients', e.target.value)}
              placeholder="ops@cliente.com, gerencia@cliente.com"
            />
          </div>
          <div className="field-row">
            <div className="field">
              <label className="label">Email de escalamiento critico</label>
              <input
                className="input"
                type="email"
                value={cfg.escalation_email}
                onChange={e => set('escalation_email', e.target.value)}
                placeholder="alertas@cliente.com"
              />
            </div>
            <div className="field">
              <label className="label">WhatsApp de incidentes</label>
              <input
                className="input"
                value={cfg.incident_whatsapp}
                onChange={e => set('incident_whatsapp', e.target.value)}
                placeholder="+57 300 000 0000"
              />
            </div>
          </div>
          <div className="field">
            <label className="label">Nota fija en reportes PDF</label>
            <textarea
              className="input"
              value={cfg.report_footer_note}
              onChange={e => set('report_footer_note', e.target.value)}
              placeholder="Ejemplo: Este reporte fue generado para revision gerencial y puede contener datos sensibles."
              maxLength={280}
            />
            <div style={{ fontSize: 11, color: 'var(--g04)', marginTop: 4 }}>
              {cfg.report_footer_note.length}/280 caracteres
            </div>
          </div>

          <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className="badge badge-green">SLA objetivo: {cfg.sla_first_response_min || 0} min</span>
            <span className="badge badge-gray">Owner ops: {cfg.operations_owner?.trim() || 'No definido'}</span>
            <span className="badge badge-gray">Escalamiento: {cfg.escalation_email?.trim() || 'Pendiente'}</span>
          </div>
        </div>

        {/* â”€â”€ Info útil â”€â”€ */}
        <div className="card" style={{ background: 'color-mix(in srgb, var(--acc) 5%, var(--g01) 95%)', borderColor: 'color-mix(in srgb, var(--acc) 20%, var(--g03) 80%)' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>ℹ️</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--g07)', marginBottom: 4 }}>¿Cómo se usa esta información?</div>
              <ul style={{ fontSize: 12, color: 'var(--g05)', lineHeight: 1.8, paddingLeft: 16, margin: 0 }}>
                <li>El <strong style={{ color: 'var(--g06)' }}>logo</strong> reemplaza el isotipo ORQO en la barra lateral del dashboard.</li>
                <li>El <strong style={{ color: 'var(--g06)' }}>nombre en sidebar</strong> reemplaza "ORQO" en la barra lateral.</li>
                <li>El <strong style={{ color: 'var(--g06)' }}>logo del cliente</strong> tambien se usa en exportaciones PDF gerenciales.</li>
                <li>La <strong style={{ color: 'var(--g06)' }}>zona horaria</strong> afecta la presentación de fechas y horas en los logs y conversaciones.</li>
                <li>El <strong style={{ color: 'var(--g06)' }}>dominio activo</strong> se usa para validar solicitudes del widget embebido.</li>
                <li>Los <strong style={{ color: 'var(--g06)' }}>datos operativos</strong> enriquecen el contexto para informes asistidos por AI.</li>
              </ul>
            </div>
          </div>
        </div>

      </div>

      <div className="save-bar">
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Guardando…' : saved ? '✓ Guardado' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}
