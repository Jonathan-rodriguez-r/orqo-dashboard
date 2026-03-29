'use client';

import { useEffect, useState } from 'react';

type AccountCfg = {
  plan: string;
  interactions_limit: number;
  interactions_used: number;
  business_name: string;
  email: string;
  website: string;
  timezone: string;
  language: string;
  api_key: string;
};

const DEFAULTS: AccountCfg = {
  plan: 'Starter',
  interactions_limit: 1000,
  interactions_used: 0,
  business_name: '',
  email: '',
  website: '',
  timezone: 'America/Bogota',
  language: 'es',
  api_key: '',
};

export default function AccountPage() {
  const [cfg, setCfg] = useState<AccountCfg>(DEFAULTS);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/account').then(r => r.json()).then(d => {
      if (d && !d.error) setCfg({ ...DEFAULTS, ...d });
    });
  }, []);

  function set(key: string, val: string | number) {
    setCfg(p => ({ ...p, [key]: val }));
  }

  async function save() {
    await fetch('/api/account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg),
    });
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
        <p className="page-sub">Administra tu plan y configuración</p>
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:'20px'}}>

        {/* Plan */}
        <div className="card">
          <div className="card-title">Plan actual</div>
          <div style={{display:'flex',alignItems:'center',gap:'16px',marginBottom:'16px'}}>
            <div style={{flex:1}}>
              <div style={{fontFamily:'var(--f-disp)',fontWeight:700,fontSize:'20px',color:'var(--g08)'}}>{cfg.plan}</div>
              <div style={{fontSize:'12.5px',color:'var(--g05)'}}>
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
                style={{width:`${usagePct}%`}}
              />
            </div>
          </div>
        </div>

        {/* API Key */}
        <div className="card">
          <div className="card-title">API Key</div>
          <p style={{fontSize:'12.5px',color:'var(--g05)',marginBottom:'12px'}}>
            Usa esta clave para autenticar el widget en tu sitio web.
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

        {/* Business info */}
        <div className="card">
          <div className="card-title">Información del negocio</div>
          <div className="field-row">
            <div className="field">
              <label className="label">Nombre del negocio</label>
              <input className="input" value={cfg.business_name} onChange={e => set('business_name', e.target.value)} placeholder="Mi empresa"/>
            </div>
            <div className="field">
              <label className="label">Email de contacto</label>
              <input className="input" type="email" value={cfg.email} onChange={e => set('email', e.target.value)} placeholder="hola@miempresa.com"/>
            </div>
          </div>
          <div className="field">
            <label className="label">Sitio web</label>
            <input className="input" value={cfg.website} onChange={e => set('website', e.target.value)} placeholder="https://miempresa.com"/>
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

      </div>

      <div className="save-bar">
        <button className="btn btn-primary" onClick={save}>
          {saved ? '✓ Guardado' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}
