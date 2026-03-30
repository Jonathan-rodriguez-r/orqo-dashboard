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
  const [apiKey, setApiKey] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);

  useEffect(() => {
    fetch('/api/integrations').then(r => r.json()).then(d => {
      if (d && !d.error) setCfg({ ...DEFAULTS, ...d });
    });
    fetch('/api/account').then(r => r.json()).then(d => {
      if (d && d.api_key) setApiKey(d.api_key);
    });
  }, []);

  function setWP(key: string, val: string | boolean) {
    setCfg(p => ({ ...p, wordpress: { ...p.wordpress, [key]: val } }));
  }
  function setWA(key: string, val: string | boolean) {
    setCfg(p => ({ ...p, whatsapp: { ...p.whatsapp, [key]: val } }));
  }

  function copyCode() {
    if (!apiKey) return;
    navigator.clipboard.writeText(embedSnippet);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2500);
  }

  const embedSnippet = apiKey
    ? `<!-- ORQO Chat Widget -->\n<script src="https://dashboard.orqo.io/widget.js" data-key="${apiKey}" async><\/script>`
    : '';

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

        {/* Embed del widget */}
        <div className="card">
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
            <div style={{width:36,height:36,borderRadius:'var(--radius-sm)',background:'var(--acc-g)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><polyline points="16 18 22 12 16 6" stroke="var(--acc)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><polyline points="8 6 2 12 8 18" stroke="var(--acc)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div>
              <div style={{fontWeight:700,fontSize:14,color:'var(--g08)'}}>Código de integración</div>
              <div style={{fontSize:12,color:'var(--g05)'}}>Pega este código antes del <code style={{background:'var(--g03)',padding:'1px 5px',borderRadius:4,fontSize:11}}>&lt;/body&gt;</code> de cualquier página</div>
            </div>
          </div>

          {apiKey ? (
            <>
              <div style={{position:'relative'}}>
                <pre style={{background:'var(--g00)',border:'1px solid var(--g03)',borderRadius:'var(--radius-sm)',padding:'14px 16px',fontSize:12,fontFamily:'var(--f-mono)',color:'var(--g06)',overflowX:'auto',lineHeight:1.65,userSelect:'all',whiteSpace:'pre-wrap',wordBreak:'break-all'}}>
                  {embedSnippet}
                </pre>
                <button className="btn btn-ghost btn-sm" onClick={copyCode}
                  style={{position:'absolute',top:8,right:8,fontSize:11}}>
                  {codeCopied ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
              <div style={{marginTop:10,fontSize:12,color:'var(--g05)',lineHeight:1.6}}>
                El widget solo aparecerá si tu cuenta está activa y el widget está habilitado en <strong style={{color:'var(--g06)'}}>Widget → General</strong>.
              </div>
            </>
          ) : (
            <div style={{padding:'16px',background:'var(--g02)',borderRadius:'var(--radius-sm)',fontSize:13,color:'var(--g05)',textAlign:'center'}}>
              Cargando API key…
            </div>
          )}
        </div>

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
