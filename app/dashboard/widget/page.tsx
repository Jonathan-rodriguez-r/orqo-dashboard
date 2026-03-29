'use client';

import { useEffect, useState } from 'react';

const COLORS = ['#2CB978','#3B82F6','#F5B43C','#DC4848','#9B59B6','#E9EDE9'];
const POSITIONS = ['bottom-right','bottom-left','top-right','top-left'];

export default function WidgetPage() {
  const [cfg, setCfg] = useState({
    color: '#2CB978',
    position: 'bottom-right',
    greeting: 'Hola 👋 ¿En qué te puedo ayudar?',
    welcome_title: 'Asistente ORQO',
    welcome_sub: 'Responde en menos de 1 minuto',
    interaction_limit: 20,
    show_branding: true,
    allow_file_upload: true,
    allow_voice: false,
    show_agent_avatar: true,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/config/widget').then(r => r.json()).then(d => {
      if (d && !d.error) setCfg(d);
    });
  }, []);

  async function save() {
    await fetch('/api/config/widget', {
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
        <h1 className="page-title">Widget</h1>
        <p className="page-sub">Personaliza la apariencia y comportamiento del chat</p>
      </div>

      <div className="grid-2" style={{alignItems:'start'}}>
        <div style={{display:'flex',flexDirection:'column',gap:'20px'}}>

          <div className="card">
            <div className="card-title">Apariencia</div>
            <div className="field">
              <label className="label">Color del widget</label>
              <div className="swatch-row">
                {COLORS.map(c => (
                  <div
                    key={c}
                    className={`swatch${cfg.color === c ? ' selected' : ''}`}
                    style={{background:c}}
                    onClick={() => setCfg(p => ({...p, color:c}))}
                  />
                ))}
              </div>
            </div>
            <div className="field">
              <label className="label">Posición</label>
              <div className="position-grid">
                {POSITIONS.map(p => (
                  <div
                    key={p}
                    className={`pos-opt${cfg.position === p ? ' selected' : ''}`}
                    onClick={() => setCfg(prev => ({...prev, position:p}))}
                  >
                    {p.replace('-',' ')}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Textos</div>
            <div className="field">
              <label className="label">Título del widget</label>
              <input
                className="input"
                value={cfg.welcome_title}
                onChange={e => setCfg(p => ({...p, welcome_title:e.target.value}))}
              />
            </div>
            <div className="field">
              <label className="label">Subtítulo</label>
              <input
                className="input"
                value={cfg.welcome_sub}
                onChange={e => setCfg(p => ({...p, welcome_sub:e.target.value}))}
              />
            </div>
            <div className="field">
              <label className="label">Mensaje de bienvenida</label>
              <textarea
                className="input"
                rows={3}
                value={cfg.greeting}
                onChange={e => setCfg(p => ({...p, greeting:e.target.value}))}
              />
            </div>
          </div>

          <div className="card">
            <div className="card-title">Comportamiento</div>
            <div className="field">
              <label className="label">Límite de interacciones por usuario</label>
              <input
                className="input"
                type="number"
                min={1}
                max={200}
                value={cfg.interaction_limit}
                onChange={e => setCfg(p => ({...p, interaction_limit:Number(e.target.value)}))}
                style={{maxWidth:'120px'}}
              />
            </div>
            {([
              ['show_branding','Mostrar "powered by ORQO"','Muestra el crédito en el footer del widget'],
              ['allow_file_upload','Permitir adjuntar archivos','El usuario puede enviar imágenes y documentos'],
              ['allow_voice','Mensajes de voz','Habilita el botón de grabación de audio'],
              ['show_agent_avatar','Mostrar avatar del agente','Icono ORQO junto a cada respuesta del bot'],
            ] as [keyof typeof cfg, string, string][]).map(([key, title, desc]) => (
              <div className="toggle-row" key={key}>
                <div className="toggle-info">
                  <div className="toggle-title">{title}</div>
                  <div className="toggle-desc">{desc}</div>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={cfg[key] as boolean}
                    onChange={e => setCfg(p => ({...p, [key]:e.target.checked}))}
                  />
                  <span className="toggle-track"/>
                  <span className="toggle-thumb"/>
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{position:'sticky',top:'28px'}}>
          <div className="card-title">Vista previa</div>
          <div className="widget-preview">
            <div
              className="widget-btn-preview"
              style={{background:cfg.color}}
            >
              <svg width="24" height="24" viewBox="0 0 72 72" fill="none">
                <path d="M52 59.5 A30 30 0 1 1 59.5 52" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round"/>
                <line x1="59.5" y1="52" x2="66" y2="58" stroke="#fff" strokeWidth="4" strokeLinecap="round"/>
                <circle cx="66" cy="58" r="4" fill="#fff"/>
              </svg>
            </div>
            <div style={{position:'absolute',bottom:'86px',right:'20px',background:'#111812',borderRadius:'10px',padding:'10px 14px',maxWidth:'200px',fontSize:'12px',color:'#E9EDE9',boxShadow:'0 4px 20px rgba(0,0,0,0.4)'}}>
              {cfg.greeting}
            </div>
          </div>
          <div style={{marginTop:'16px',fontSize:'12.5px',color:'var(--g05)',lineHeight:'1.8'}}>
            <div><strong style={{color:'var(--g07)'}}>Posición:</strong> {cfg.position}</div>
            <div><strong style={{color:'var(--g07)'}}>Límite:</strong> {cfg.interaction_limit} interacciones</div>
            <div><strong style={{color:'var(--g07)'}}>Archivos:</strong> {cfg.allow_file_upload ? 'sí' : 'no'}</div>
            <div><strong style={{color:'var(--g07)'}}>Voz:</strong> {cfg.allow_voice ? 'sí' : 'no'}</div>
          </div>
          <div className="save-bar">
            <button className="btn btn-primary" onClick={save}>
              {saved ? '✓ Guardado' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
