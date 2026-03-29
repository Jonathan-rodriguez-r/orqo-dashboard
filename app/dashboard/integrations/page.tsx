'use client';

import { useEffect, useState } from 'react';

type IntConfig = {
  wordpress: { url: string; api_key: string; wp_user: string; enabled: boolean };
  whatsapp: { phone: string; token: string; phone_number_id: string; webhook_token: string; enabled: boolean };
};

const DEFAULTS: IntConfig = {
  wordpress: { url: '', api_key: '', wp_user: '', enabled: false },
  whatsapp: { phone: '', token: '', phone_number_id: '', webhook_token: '', enabled: false },
};

export default function IntegrationsPage() {
  const [cfg, setCfg] = useState<IntConfig>(DEFAULTS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/integrations').then(r => r.json()).then(d => {
      if (d && !d.error) setCfg({ ...DEFAULTS, ...d });
    });
  }, []);

  function setWP(key: string, val: string | boolean) {
    setCfg(p => ({ ...p, wordpress: { ...p.wordpress, [key]: val } }));
  }
  function setWA(key: string, val: string | boolean) {
    setCfg(p => ({ ...p, whatsapp: { ...p.whatsapp, [key]: val } }));
  }

  async function save() {
    await fetch('/api/integrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="dash-content">
      <div className="page-header">
        <h1 className="page-title">Integraciones</h1>
        <p className="page-sub">Conecta ORQO con tus plataformas</p>
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:'20px'}}>

        {/* WordPress / WooCommerce */}
        <div className="int-card">
          <div className="int-header">
            <div className="int-icon">🔌</div>
            <div style={{flex:1}}>
              <div className="int-name">WordPress / WooCommerce</div>
              <div className="int-name-sub">Conecta tu tienda para consultas de pedidos e inventario</div>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={cfg.wordpress.enabled} onChange={e => setWP('enabled', e.target.checked)}/>
              <span className="toggle-track"/>
              <span className="toggle-thumb"/>
            </label>
          </div>
          <div className="field-row">
            <div className="field">
              <label className="label">URL del sitio</label>
              <input className="input" placeholder="https://tutienda.com" value={cfg.wordpress.url} onChange={e => setWP('url', e.target.value)}/>
            </div>
            <div className="field">
              <label className="label">Usuario WordPress</label>
              <input className="input" placeholder="admin" value={cfg.wordpress.wp_user} onChange={e => setWP('wp_user', e.target.value)}/>
            </div>
          </div>
          <div className="field">
            <label className="label">API Key (Application Password)</label>
            <input className="input input-mono" type="password" placeholder="xxxx xxxx xxxx xxxx xxxx xxxx" value={cfg.wordpress.api_key} onChange={e => setWP('api_key', e.target.value)}/>
          </div>
        </div>

        {/* WhatsApp Business */}
        <div className="int-card">
          <div className="int-header">
            <div className="int-icon">💬</div>
            <div style={{flex:1}}>
              <div className="int-name">WhatsApp Business</div>
              <div className="int-name-sub">Recibe y responde mensajes de WhatsApp con ORQO</div>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={cfg.whatsapp.enabled} onChange={e => setWA('enabled', e.target.checked)}/>
              <span className="toggle-track"/>
              <span className="toggle-thumb"/>
            </label>
          </div>
          <div className="field-row">
            <div className="field">
              <label className="label">Número de teléfono</label>
              <input className="input" placeholder="+57 300 000 0000" value={cfg.whatsapp.phone} onChange={e => setWA('phone', e.target.value)}/>
            </div>
            <div className="field">
              <label className="label">Phone Number ID</label>
              <input className="input input-mono" placeholder="1234567890" value={cfg.whatsapp.phone_number_id} onChange={e => setWA('phone_number_id', e.target.value)}/>
            </div>
          </div>
          <div className="field">
            <label className="label">Access Token</label>
            <input className="input input-mono" type="password" placeholder="EAAxxxxx..." value={cfg.whatsapp.token} onChange={e => setWA('token', e.target.value)}/>
          </div>
          <div className="field">
            <label className="label">Webhook Verify Token</label>
            <input className="input input-mono" placeholder="mi_token_secreto" value={cfg.whatsapp.webhook_token} onChange={e => setWA('webhook_token', e.target.value)}/>
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
