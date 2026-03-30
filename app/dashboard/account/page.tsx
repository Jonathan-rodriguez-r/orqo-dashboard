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
  logo_url: string;
  sidebar_name: string;
  support_email: string;
  phone: string;
  address: string;
  industry: string;
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
  logo_url: '',
  sidebar_name: '',
  support_email: '',
  phone: '',
  address: '',
  industry: '',
};

const INDUSTRIES = [
  '', 'E-commerce / Retail', 'Salud y Bienestar', 'Educación', 'Servicios Financieros',
  'Bienes Raíces', 'Hospitalidad y Turismo', 'Tecnología / SaaS', 'Logística y Transporte',
  'Manufactura', 'Consultoría y Servicios Profesionales', 'Entretenimiento y Medios', 'Otro',
];

export default function AccountPage() {
  const [cfg, setCfg] = useState<AccountCfg>(DEFAULTS);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoMode, setLogoMode] = useState<'url' | 'file'>('url');
  const [logoPreview, setLogoPreview] = useState('');
  const [logoError, setLogoError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/account').then(r => r.json()).then(d => {
      if (d && !d.error) {
        setCfg({ ...DEFAULTS, ...d });
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
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function copyKey() {
    navigator.clipboard.writeText(cfg.api_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const usagePct = cfg.interactions_limit > 0
    ? Math.min(100, Math.round((cfg.interactions_used / cfg.interactions_limit) * 100))
    : 0;

  return (
    <div className="dash-content">
      <div className="page-header">
        <h1 className="page-title">Cuenta</h1>
        <p className="page-sub">Administra tu plan, identidad del dashboard y configuración del negocio</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Plan ── */}
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

        {/* ── Identidad del dashboard ── */}
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
                  <circle cx="66" cy="58" r="3.5" fill="#2CB978"/>
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
        </div>

        {/* ── API Key ── */}
        <div className="card">
          <div className="card-title">API Key</div>
          <p style={{ fontSize: 12.5, color: 'var(--g05)', marginBottom: 12 }}>
            Usa esta clave para autenticar el widget en tu sitio web. No la compartas públicamente.
          </p>
          <div className="apikey-row">
            <div className="apikey-val">
              {showKey ? cfg.api_key || '—' : '●'.repeat(Math.min(32, (cfg.api_key || '').length || 32))}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowKey(p => !p)}>
              {showKey ? 'Ocultar' : 'Mostrar'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={copyKey}>
              {copied ? '✓ Copiado' : 'Copiar'}
            </button>
          </div>
        </div>

        {/* ── Información del negocio ── */}
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
              <label className="label">Dominio activo</label>
              <input className="input" value={cfg.active_domain} onChange={e => set('active_domain', e.target.value)} placeholder="miempresa.com"/>
            </div>
            <div className="field">
              <label className="label">Página donde aparece el widget</label>
              <input className="input" value={cfg.widget_page_url} onChange={e => set('widget_page_url', e.target.value)} placeholder="https://miempresa.com"/>
            </div>
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

        {/* ── Info útil ── */}
        <div className="card" style={{ background: 'rgba(44,185,120,0.04)', borderColor: 'rgba(44,185,120,0.15)' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>ℹ️</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--g07)', marginBottom: 4 }}>¿Cómo se usa esta información?</div>
              <ul style={{ fontSize: 12, color: 'var(--g05)', lineHeight: 1.8, paddingLeft: 16, margin: 0 }}>
                <li>El <strong style={{ color: 'var(--g06)' }}>logo</strong> reemplaza el isotipo ORQO en la barra lateral del dashboard.</li>
                <li>El <strong style={{ color: 'var(--g06)' }}>nombre en sidebar</strong> reemplaza "ORQO" en la barra lateral.</li>
                <li>La <strong style={{ color: 'var(--g06)' }}>zona horaria</strong> afecta la presentación de fechas y horas en los logs y conversaciones.</li>
                <li>El <strong style={{ color: 'var(--g06)' }}>dominio activo</strong> se usa para validar solicitudes del widget embebido.</li>
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
