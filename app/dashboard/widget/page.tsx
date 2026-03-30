'use client';

import { useEffect, useState } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────
type Article = {
  id: string;
  title: string;
  category: string;
  date: string;
  body: string;
};

type WidgetCfg = {
  active: boolean;
  title: string;
  subtitle: string;
  placeholder: string;
  accentColor: string;
  position: string;
  darkBg: string;
  darkSurface: string;
  lightBg: string;
  lightSurface: string;
  windowOpacity: number;
  buttonOpacity: number;
  iconMode: 'orqo' | 'favicon' | 'photo';
  faviconUrl: string;
  agentPhoto: string;
  interactionLimit: number;
  showBranding: boolean;
  homeArticles: string[];
  articles: Article[];
};

const DEFAULTS: WidgetCfg = {
  active: true,
  title: 'Hola soy ORQO',
  subtitle: 'Tu Asistente de Orquestación',
  placeholder: '¿En qué te puedo ayudar?',
  accentColor: '#2CB978',
  position: 'bottom-right',
  darkBg: '#0B100D',
  darkSurface: '#111812',
  lightBg: '#F4F7F4',
  lightSurface: '#FFFFFF',
  windowOpacity: 1.0,
  buttonOpacity: 1.0,
  iconMode: 'orqo',
  faviconUrl: '',
  agentPhoto: '',
  interactionLimit: 20,
  showBranding: true,
  homeArticles: ['wp-connect', 'plugin-install', 'whatsapp-setup', 'agents'],
  articles: [],
};

const POSITIONS = ['bottom-right', 'bottom-left', 'top-right', 'top-left'];

const AGENT_PHOTOS = [
  { id: 'g1', label: 'Agente A', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=orqo-a1&backgroundColor=2CB978&radius=50' },
  { id: 'g2', label: 'Agente B', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=orqo-a2&backgroundColor=3B82F6&radius=50' },
  { id: 'g3', label: 'Agente C', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=orqo-a3&backgroundColor=9B59B6&radius=50' },
  { id: 'g4', label: 'Agente D', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=orqo-a4&backgroundColor=F5B43C&radius=50' },
];

const CATEGORIES = ['Primeros pasos', 'Integraciones', 'Agentes', 'Planes', 'Seguridad', 'Otro'];

function newArtId() { return 'art-' + Math.random().toString(36).slice(2, 9); }

// ── Sub-components ────────────────────────────────────────────────────────────
function ToggleRow({ title, desc, checked, onChange }: {
  title: string; desc?: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="toggle-row">
      <div className="toggle-info">
        <div className="toggle-title">{title}</div>
        {desc && <div className="toggle-desc">{desc}</div>}
      </div>
      <label className="toggle">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
        <span className="toggle-track" /><span className="toggle-thumb" />
      </label>
    </div>
  );
}

function STitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: 'var(--f-disp)', fontWeight: 700, fontSize: 15, color: 'var(--g08)', marginBottom: 14 }}>
      {children}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="field" style={{ marginBottom: 0 }}>
      <label className="label">{label}</label>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ width: 30, height: 30, borderRadius: 'var(--radius-sm)', background: value, border: '2px solid var(--g03)', flexShrink: 0, cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
          <input type="color" value={value} onChange={e => onChange(e.target.value)}
            style={{ opacity: 0, position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
        </div>
        <input className="input input-mono" value={value} onChange={e => onChange(e.target.value)} style={{ maxWidth: 104, fontSize: 12 }} />
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function WidgetPage() {
  const [cfg, setCfg] = useState<WidgetCfg>(DEFAULTS);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newArt, setNewArt] = useState<Article>({ id: '', title: '', category: 'Primeros pasos', date: '', body: '' });

  useEffect(() => {
    fetch('/api/config/widget').then(r => r.json()).then(d => {
      if (d && !d.error) setCfg({ ...DEFAULTS, ...d });
    });
  }, []);

  function set<K extends keyof WidgetCfg>(key: K, value: WidgetCfg[K]) {
    setCfg(prev => ({ ...prev, [key]: value }));
  }

  async function doSave() {
    setSaving(true);
    await fetch('/api/config/widget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg),
    });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function saveAndPreview() {
    await doSave();
    window.open('https://orqo.io?preview=1', '_blank');
  }

  // Article CRUD
  function deleteArt(id: string) {
    setCfg(prev => ({
      ...prev,
      articles: prev.articles.filter(a => a.id !== id),
      homeArticles: prev.homeArticles.filter(h => h !== id),
    }));
  }

  function updateArt(id: string, field: keyof Article, value: string) {
    setCfg(prev => ({ ...prev, articles: prev.articles.map(a => a.id === id ? { ...a, [field]: value } : a) }));
  }

  function addArt() {
    if (!newArt.title.trim()) return;
    const art: Article = {
      ...newArt,
      id: newArt.id.trim() || newArtId(),
      date: newArt.date || new Date().toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' }),
    };
    setCfg(prev => ({ ...prev, articles: [...prev.articles, art] }));
    setNewArt({ id: '', title: '', category: 'Primeros pasos', date: '', body: '' });
    setShowAdd(false);
  }

  function toggleHomeArt(id: string) {
    setCfg(prev => {
      const has = prev.homeArticles.includes(id);
      return {
        ...prev,
        homeArticles: has ? prev.homeArticles.filter(h => h !== id) : [...prev.homeArticles, id].slice(0, 6),
      };
    });
  }

  const resolvedPhoto = cfg.iconMode === 'photo'
    ? (AGENT_PHOTOS.find(p => p.id === cfg.agentPhoto)?.url ?? cfg.agentPhoto)
    : cfg.iconMode === 'favicon' ? cfg.faviconUrl : '';

  return (
    <div className="dash-content">
      <div className="page-header">
        <h1 className="page-title">Widget</h1>
        <p className="page-sub">Configura la apariencia, textos y artículos del chat embebido en tu sitio</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 22, alignItems: 'start' }}>

        {/* ── Left: Settings ───────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* 1. General */}
          <div className="card">
            <STitle>General</STitle>
            <ToggleRow title="Widget activo" desc="Cuando está inactivo el chat no aparece en tu sitio" checked={cfg.active} onChange={v => set('active', v)} />
            <div style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label className="label">Título principal</label>
                <input className="input" value={cfg.title} placeholder="Hola soy ORQO" onChange={e => set('title', e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label className="label">Subtítulo / label</label>
                <input className="input" value={cfg.subtitle} placeholder="Tu Asistente de Orquestación" onChange={e => set('subtitle', e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label className="label">Placeholder del input de chat</label>
                <input className="input" value={cfg.placeholder} placeholder="¿En qué te puedo ayudar?" onChange={e => set('placeholder', e.target.value)} />
              </div>
            </div>
          </div>

          {/* 2. Icono / Avatar */}
          <div className="card">
            <STitle>Icono del asistente</STitle>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {(['orqo', 'favicon', 'photo'] as const).map(m => (
                <button key={m} className={`btn btn-sm ${cfg.iconMode === m ? 'btn-primary' : 'btn-ghost'}`} onClick={() => set('iconMode', m)}>
                  {m === 'orqo' ? 'ORQO default' : m === 'favicon' ? 'Favicon / URL' : 'Foto de agente'}
                </button>
              ))}
            </div>
            {cfg.iconMode === 'favicon' && (
              <div className="field" style={{ marginBottom: 0 }}>
                <label className="label">URL del ícono (PNG/SVG/ICO — 48×48 recomendado)</label>
                <input className="input" type="url" placeholder="https://midominio.com/favicon.png" value={cfg.faviconUrl} onChange={e => set('faviconUrl', e.target.value)} />
              </div>
            )}
            {cfg.iconMode === 'photo' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
                  {AGENT_PHOTOS.map(p => (
                    <button key={p.id} onClick={() => set('agentPhoto', p.id)}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '10px 4px', borderRadius: 'var(--radius-sm)', border: `1px solid ${cfg.agentPhoto === p.id ? 'var(--acc)' : 'var(--g03)'}`, background: cfg.agentPhoto === p.id ? 'var(--acc-g)' : 'var(--g02)', cursor: 'pointer' }}>
                      <img src={p.url} alt={p.label} width={40} height={40} style={{ borderRadius: '50%' }} />
                      <span style={{ fontSize: 11, color: 'var(--g05)' }}>{p.label}</span>
                    </button>
                  ))}
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label className="label">O URL personalizada</label>
                  <input className="input" type="url" placeholder="https://midominio.com/foto.jpg" value={AGENT_PHOTOS.some(p => p.id === cfg.agentPhoto) ? '' : cfg.agentPhoto} onChange={e => set('agentPhoto', e.target.value)} />
                </div>
              </div>
            )}
          </div>

          {/* 3. Colores & Transparencia */}
          <div className="card">
            <STitle>Colores & transparencia</STitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              <ColorField label="Color de acento" value={cfg.accentColor} onChange={v => set('accentColor', v)} />
              <div />
              <ColorField label="Fondo modo oscuro" value={cfg.darkBg} onChange={v => set('darkBg', v)} />
              <ColorField label="Superficie oscura" value={cfg.darkSurface} onChange={v => set('darkSurface', v)} />
              <ColorField label="Fondo modo claro" value={cfg.lightBg} onChange={v => set('lightBg', v)} />
              <ColorField label="Superficie clara" value={cfg.lightSurface} onChange={v => set('lightSurface', v)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label className="label">Ventana — {Math.round(cfg.windowOpacity * 100)}%</label>
                <input type="range" min={0.5} max={1} step={0.05} value={cfg.windowOpacity} onChange={e => set('windowOpacity', Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--acc)' }} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label className="label">Botón — {Math.round(cfg.buttonOpacity * 100)}%</label>
                <input type="range" min={0.5} max={1} step={0.05} value={cfg.buttonOpacity} onChange={e => set('buttonOpacity', Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--acc)' }} />
              </div>
            </div>
          </div>

          {/* 4. Posición */}
          <div className="card">
            <STitle>Posición</STitle>
            <div className="position-grid">
              {POSITIONS.map(p => (
                <div key={p} className={`pos-opt ${cfg.position === p ? 'selected' : ''}`} onClick={() => set('position', p)}>
                  {p.replace('-', ' ')}
                </div>
              ))}
            </div>
          </div>

          {/* 5. Artículos */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <STitle>Artículos de ayuda</STitle>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(v => !v)}>
                {showAdd ? '✕ Cancelar' : '+ Agregar'}
              </button>
            </div>

            <div style={{ fontSize: 12, color: 'var(--g05)', background: 'var(--g02)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', marginBottom: 14, lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--g06)' }}>Estructura:</strong> id · título · categoría · fecha · cuerpo HTML.{' '}
              Marca con <strong>★ Inicio</strong> los que aparecen en la pantalla principal (máx. 6).
            </div>

            {/* Add form */}
            {showAdd && (
              <div style={{ background: 'var(--g02)', borderRadius: 'var(--radius-sm)', padding: 14, marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label className="label">ID (slug)</label>
                    <input className="input" placeholder="mi-articulo" value={newArt.id} onChange={e => setNewArt(p => ({ ...p, id: e.target.value }))} />
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label className="label">Categoría</label>
                    <select className="input" value={newArt.category} onChange={e => setNewArt(p => ({ ...p, category: e.target.value }))}>
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label className="label">Título</label>
                  <input className="input" placeholder="Título del artículo" value={newArt.title} onChange={e => setNewArt(p => ({ ...p, title: e.target.value }))} />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label className="label">Fecha</label>
                  <input className="input" placeholder="Actualizado hace 2 días" value={newArt.date} onChange={e => setNewArt(p => ({ ...p, date: e.target.value }))} />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label className="label">Cuerpo (HTML)</label>
                  <textarea className="input input-mono" rows={5} placeholder="<p>Contenido…</p>" value={newArt.body} onChange={e => setNewArt(p => ({ ...p, body: e.target.value }))} style={{ fontSize: 12 }} />
                </div>
                <button className="btn btn-primary btn-sm" onClick={addArt} style={{ alignSelf: 'flex-end' }}>Agregar artículo</button>
              </div>
            )}

            {/* List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {cfg.articles.map(art => (
                <div key={art.id} style={{ background: 'var(--g02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--g03)', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--g07)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{art.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--g05)' }}>{art.category} · {art.date}</div>
                    </div>
                    <button className={`btn btn-sm ${cfg.homeArticles.includes(art.id) ? 'btn-primary' : 'btn-ghost'}`} onClick={() => toggleHomeArt(art.id)} style={{ fontSize: 11, padding: '4px 8px' }}>
                      {cfg.homeArticles.includes(art.id) ? '★' : '☆'} Inicio
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(editingId === art.id ? null : art.id)}>
                      {editingId === art.id ? 'Cerrar' : 'Editar'}
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteArt(art.id)} style={{ padding: '5px 9px' }}>✕</button>
                  </div>
                  {editingId === art.id && (
                    <div style={{ padding: '0 12px 12px', borderTop: '1px solid var(--g03)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ paddingTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div className="field" style={{ marginBottom: 0 }}>
                          <label className="label">Título</label>
                          <input className="input" value={art.title} onChange={e => updateArt(art.id, 'title', e.target.value)} />
                        </div>
                        <div className="field" style={{ marginBottom: 0 }}>
                          <label className="label">Categoría</label>
                          <select className="input" value={art.category} onChange={e => updateArt(art.id, 'category', e.target.value)}>
                            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="field" style={{ marginBottom: 0 }}>
                        <label className="label">Fecha</label>
                        <input className="input" value={art.date} onChange={e => updateArt(art.id, 'date', e.target.value)} />
                      </div>
                      <div className="field" style={{ marginBottom: 0 }}>
                        <label className="label">Cuerpo (HTML)</label>
                        <textarea className="input input-mono" rows={8} value={art.body} onChange={e => updateArt(art.id, 'body', e.target.value)} style={{ fontSize: 12 }} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {cfg.articles.length === 0 && (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--g05)', fontSize: 13 }}>
                  Sin artículos. Guarda para cargar los predeterminados.
                </div>
              )}
            </div>
          </div>

          {/* 6. Comportamiento */}
          <div className="card">
            <STitle>Comportamiento</STitle>
            <div className="field">
              <label className="label">Límite de interacciones por usuario</label>
              <input className="input" type="number" min={1} max={500} value={cfg.interactionLimit} onChange={e => set('interactionLimit', Number(e.target.value))} style={{ maxWidth: 120 }} />
            </div>
            <ToggleRow title='Mostrar "powered by ORQO"' desc="Muestra el crédito en el footer del widget" checked={cfg.showBranding} onChange={v => set('showBranding', v)} />
          </div>

        </div>

        {/* ── Right: Preview ───────────────────────────────────────── */}
        <div style={{ position: 'sticky', top: 28 }}>
          <div className="card">
            <STitle>Vista previa</STitle>

            {/* Mini mock */}
            <div style={{ background: 'linear-gradient(135deg, #1a2e22 0%, #0B100D 100%)', borderRadius: 10, height: 240, position: 'relative', overflow: 'hidden', marginBottom: 14 }}>
              {cfg.active && (
                <div style={{ position: 'absolute', bottom: 62, right: cfg.position.includes('left') ? 'auto' : 12, left: cfg.position.includes('left') ? 12 : 'auto', width: 180, background: cfg.darkSurface, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9, padding: 10, opacity: cfg.windowOpacity }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
                    {resolvedPhoto
                      ? <img src={resolvedPhoto} width={22} height={22} style={{ borderRadius: '50%' }} alt="" />
                      : <div style={{ width: 22, height: 22, borderRadius: '50%', background: cfg.accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff', fontWeight: 700 }}>O</div>
                    }
                    <div>
                      <div style={{ fontSize: 9.5, fontWeight: 700, color: '#F5F5F2' }}>{cfg.title || 'Hola soy ORQO'}</div>
                      <div style={{ fontSize: 7.5, color: 'rgba(233,237,233,0.5)' }}>{cfg.subtitle || 'Tu Asistente'}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 8.5, color: 'rgba(233,237,233,0.4)', background: 'rgba(255,255,255,0.04)', borderRadius: 4, padding: '4px 6px' }}>
                    {cfg.placeholder || '¿En qué te puedo ayudar?'}
                  </div>
                </div>
              )}
              <div style={{ position: 'absolute', bottom: cfg.position.includes('top') ? 'auto' : 12, top: cfg.position.includes('top') ? 12 : 'auto', right: cfg.position.includes('left') ? 'auto' : 12, left: cfg.position.includes('left') ? 12 : 'auto', width: 42, height: 42, borderRadius: '50%', background: cfg.accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: cfg.buttonOpacity, boxShadow: '0 4px 14px rgba(0,0,0,0.4)' }}>
                {resolvedPhoto
                  ? <img src={resolvedPhoto} width={42} height={42} style={{ borderRadius: '50%' }} alt="" />
                  : <svg width="20" height="20" viewBox="0 0 72 72" fill="none"><path d="M52 59.5 A30 30 0 1 1 59.5 52" stroke="#fff" strokeWidth="4.5" fill="none" strokeLinecap="round"/><line x1="59.5" y1="52" x2="66" y2="58" stroke="#fff" strokeWidth="4.5" strokeLinecap="round"/><circle cx="66" cy="58" r="5" fill="#fff"/></svg>
                }
              </div>
              {!cfg.active && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)', borderRadius: 10 }}>
                  <span style={{ color: 'rgba(233,237,233,0.6)', fontSize: 12, fontWeight: 600 }}>Widget inactivo</span>
                </div>
              )}
            </div>

            {/* Summary */}
            <div style={{ fontSize: 12, color: 'var(--g05)', lineHeight: 2, marginBottom: 14 }}>
              <div><strong style={{ color: 'var(--g07)' }}>Acento:</strong> <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: cfg.accentColor, marginRight: 4, verticalAlign: 'middle' }} />{cfg.accentColor}</div>
              <div><strong style={{ color: 'var(--g07)' }}>Posición:</strong> {cfg.position}</div>
              <div><strong style={{ color: 'var(--g07)' }}>Artículos:</strong> {cfg.articles.length} ({cfg.homeArticles.length} en inicio)</div>
              <div><strong style={{ color: 'var(--g07)' }}>Estado:</strong> <span style={{ color: cfg.active ? 'var(--acc)' : 'var(--red)' }}>{cfg.active ? 'Activo' : 'Inactivo'}</span></div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button className="btn btn-primary" onClick={doSave} style={{ justifyContent: 'center' }} disabled={saving}>
                {saving ? 'Guardando…' : saved ? '✓ Guardado' : 'Guardar cambios'}
              </button>
              <button className="btn btn-ghost" onClick={saveAndPreview} style={{ justifyContent: 'center' }}>
                Guardar y abrir vista previa →
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
