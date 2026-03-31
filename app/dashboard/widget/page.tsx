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
  themeMode: 'auto' | 'dark' | 'light';
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
  faviconPreset: string;
  faviconUrl: string;
  agentPhoto: string;
  fontFamily: string;
  widgetRadius: number;
  interactionLimit: number;
  showBranding: boolean;
  soundEnabled: boolean;
  homeArticles: string[];
  articles: Article[];
};

const DEFAULTS: WidgetCfg = {
  active: true,
  themeMode: 'auto',
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
  faviconPreset: '',
  faviconUrl: '',
  agentPhoto: '',
  fontFamily: 'default',
  widgetRadius: 14,
  interactionLimit: 20,
  showBranding: true,
  soundEnabled: true,
  homeArticles: ['orqo-que-es', 'wp-connect', 'plugin-install', 'modelos-fallback'],
  articles: [],
};

const POSITIONS = [
  { value: 'bottom-right',  label: 'Abajo — Derecha' },
  { value: 'bottom-left',   label: 'Abajo — Izquierda' },
  { value: 'bottom-center', label: 'Abajo — Centro' },
  { value: 'top-right',     label: 'Arriba — Derecha' },
  { value: 'top-left',      label: 'Arriba — Izquierda' },
  { value: 'top-center',    label: 'Arriba — Centro' },
];

// ── Real human agent portraits ─────────────────────────────────────────────
const AGENT_PHOTOS = [
  { id: 'w1', label: 'Laura',   url: 'https://randomuser.me/api/portraits/women/44.jpg' },
  { id: 'w2', label: 'Camila',  url: 'https://randomuser.me/api/portraits/women/65.jpg' },
  { id: 'w3', label: 'Sofía',   url: 'https://randomuser.me/api/portraits/women/90.jpg' },
  { id: 'w4', label: 'Valeria', url: 'https://randomuser.me/api/portraits/women/29.jpg' },
  { id: 'm1', label: 'Carlos',  url: 'https://randomuser.me/api/portraits/men/32.jpg' },
  { id: 'm2', label: 'Andrés',  url: 'https://randomuser.me/api/portraits/men/43.jpg' },
  { id: 'm3', label: 'Miguel',  url: 'https://randomuser.me/api/portraits/men/75.jpg' },
  { id: 'm4', label: 'Daniel',  url: 'https://randomuser.me/api/portraits/men/91.jpg' },
];

// ── 10 icon presets for favicon mode ──────────────────────────────────────
const ICON_PRESETS = [
  { id: 'chat',     label: 'Chat',     svg: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linejoin="round"/>' },
  { id: 'support',  label: 'Soporte',  svg: '<path d="M3 11a9 9 0 1 1 18 0" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M21 11v4a2 2 0 0 1-2 2h-1M3 11v4a2 2 0 0 0 2 2h1" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M12 18v3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' },
  { id: 'robot',    label: 'IA',       svg: '<rect x="3" y="9" width="18" height="12" rx="2" stroke="currentColor" stroke-width="1.8" fill="none"/><circle cx="9" cy="14" r="1.5" fill="currentColor"/><circle cx="15" cy="14" r="1.5" fill="currentColor"/><path d="M9 18h6M12 9V6m-3 0h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' },
  { id: 'spark',    label: 'Magia',    svg: '<path d="M12 2l1.5 4H18l-3.5 2.5 1.5 4L12 10l-4 2.5 1.5-4L6 6h4.5z" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/><path d="M19 15l1 2-2 1 2 1-1 2-1-2-2 1 1-2-2-1 2-1z" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linejoin="round"/>' },
  { id: 'bolt',     label: 'Rápido',   svg: '<path d="M13 2L4.5 13H12l-1 9L21 11H14z" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linejoin="round"/>' },
  { id: 'heart',    label: 'Cercano',  svg: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linejoin="round"/>' },
  { id: 'star',     label: 'Calidad',  svg: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linejoin="round"/>' },
  { id: 'phone',    label: 'Llamada',  svg: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12a19.79 19.79 0 0 1-3-8.59A2 2 0 0 1 3.12 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linejoin="round"/>' },
  { id: 'store',    label: 'Tienda',   svg: '<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linejoin="round"/><line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" stroke-width="1.8"/><path d="M16 10a4 4 0 0 1-8 0" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/>' },
  { id: 'question', label: 'Ayuda',    svg: '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.8" fill="none"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/><circle cx="12" cy="17" r="0.8" fill="currentColor"/>' },
];

const FONT_OPTIONS = [
  { id: 'default',  label: 'ORQO (Syne + Figtree)' },
  { id: 'inter',    label: 'Inter — Moderno' },
  { id: 'jakarta',  label: 'Plus Jakarta Sans — Amigable' },
  { id: 'dm-sans',  label: 'DM Sans — Minimalista' },
  { id: 'poppins',  label: 'Poppins — Redondeado' },
];

const RADIUS_OPTIONS = [
  { value: 8,  label: 'Compacto' },
  { value: 14, label: 'Estándar' },
  { value: 20, label: 'Redondeado' },
  { value: 28, label: 'Pill' },
];

const CATEGORIES = ['Ayuda', 'FAQ', 'Integraciones', 'Planes'];

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
type WidgetPageProps = { embedded?: boolean };

export default function WidgetPage({ embedded = false }: WidgetPageProps) {
  const [cfg, setCfg] = useState<WidgetCfg>(DEFAULTS);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newArt, setNewArt] = useState<Article>({ id: '', title: '', category: 'Primeros pasos', date: '', body: '' });
  const [previewTheme, setPreviewTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    fetch('/api/config/widget').then(r => r.json()).then(d => {
      if (d && !d.error) setCfg({ ...DEFAULTS, ...d });
    });
  }, []);

  useEffect(() => {
    if (cfg.themeMode === 'dark' || cfg.themeMode === 'light') {
      setPreviewTheme(cfg.themeMode);
    }
  }, [cfg.themeMode]);

  function set<K extends keyof WidgetCfg>(key: K, value: WidgetCfg[K]) {
    setCfg(prev => ({ ...prev, [key]: value }));
  }

  async function doSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/config/widget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert('Error al guardar: ' + (d.error ?? res.status));
        return;
      }
    } catch (e: any) {
      alert('Error de red: ' + e.message);
      return;
    } finally {
      setSaving(false);
    }
    setSaved(true);
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

  // Resolved icon for preview
  const resolvedPhoto = cfg.iconMode === 'photo'
    ? (AGENT_PHOTOS.find(p => p.id === cfg.agentPhoto)?.url ?? cfg.agentPhoto)
    : '';

  const previewBg      = previewTheme === 'dark'
    ? cfg.darkBg
    : `linear-gradient(180deg, #0D1A12 0%, #152018 58%, ${cfg.lightSurface || '#FFFFFF'} 78%, ${cfg.lightSurface || '#FFFFFF'} 100%)`;
  const previewSurface = previewTheme === 'dark' ? cfg.darkSurface  : cfg.lightSurface;
  const previewText    = previewTheme === 'dark' ? '#F5F5F2'        : '#090F0A';
  const previewSub     = previewTheme === 'dark' ? 'rgba(233,237,233,0.5)' : 'rgba(9,15,10,0.45)';

  return (
    <div className={embedded ? '' : 'dash-content'}>
      {!embedded && (
        <div className="page-header">
          <h1 className="page-title">Widget</h1>
          <p className="page-sub">Configura la apariencia, textos y articulos del chat embebido en tu sitio</p>
        </div>
      )}

      <div className="widget-layout" style={{ display: 'grid', gap: 22, alignItems: 'start' }}>

        {/* ── Left: Settings ───────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* 1. General */}
          <div className="card">
            <STitle>General</STitle>
            <ToggleRow title="Widget activo" desc="Cuando está inactivo el chat no aparece en tu sitio" checked={cfg.active} onChange={v => set('active', v)} />
            <div className="field" style={{ marginTop: 12 }}>
              <label className="label">Tema del widget</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                  { id: 'auto', label: 'Auto' },
                  { id: 'dark', label: 'Dark' },
                  { id: 'light', label: 'Light' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`btn btn-sm ${cfg.themeMode === opt.id ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => set('themeMode', opt.id as WidgetCfg['themeMode'])}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
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
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(88px, 1fr))', gap: 8, marginBottom: 14 }}>
                  {ICON_PRESETS.map(icon => (
                    <button key={icon.id} onClick={() => { set('faviconPreset', icon.id); set('faviconUrl', ''); }}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '10px 4px', borderRadius: 'var(--radius-sm)', border: `1px solid ${cfg.faviconPreset === icon.id ? 'var(--acc)' : 'var(--g03)'}`, background: cfg.faviconPreset === icon.id ? 'var(--acc-g)' : 'var(--g02)', cursor: 'pointer', color: cfg.faviconPreset === icon.id ? 'var(--acc)' : 'var(--g06)' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: icon.svg }} />
                      <span style={{ fontSize: 10, color: 'var(--g05)' }}>{icon.label}</span>
                    </button>
                  ))}
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label className="label">O URL personalizada (PNG/SVG/ICO — 48×48 recomendado)</label>
                  <input className="input" type="url" placeholder="https://midominio.com/favicon.png" value={cfg.faviconUrl}
                    onChange={e => { set('faviconUrl', e.target.value); set('faviconPreset', ''); }} />
                </div>
              </div>
            )}
            {cfg.iconMode === 'photo' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))', gap: 8, marginBottom: 14 }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 16 }}>
              <ColorField label="Color de acento" value={cfg.accentColor} onChange={v => set('accentColor', v)} />
              <div />
              <ColorField label="Fondo modo oscuro" value={cfg.darkBg} onChange={v => set('darkBg', v)} />
              <ColorField label="Superficie oscura" value={cfg.darkSurface} onChange={v => set('darkSurface', v)} />
              <ColorField label="Fondo modo claro" value={cfg.lightBg} onChange={v => set('lightBg', v)} />
              <ColorField label="Superficie clara" value={cfg.lightSurface} onChange={v => set('lightSurface', v)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 16 }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label className="label">Ventana — {Math.round(cfg.windowOpacity * 100)}%</label>
                <input type="range" min={0.5} max={1} step={0.05} value={cfg.windowOpacity} onChange={e => set('windowOpacity', Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--acc)' }} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label className="label">Botón — {Math.round(cfg.buttonOpacity * 100)}%</label>
                <input type="range" min={0.5} max={1} step={0.05} value={cfg.buttonOpacity} onChange={e => set('buttonOpacity', Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--acc)' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label className="label">Tipografía</label>
                <select className="input" value={cfg.fontFamily} onChange={e => set('fontFamily', e.target.value)}>
                  {FONT_OPTIONS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label className="label">Bordes</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {RADIUS_OPTIONS.map(r => (
                    <button key={r.value} onClick={() => set('widgetRadius', r.value)}
                      className={`btn btn-sm ${cfg.widgetRadius === r.value ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ flex: 1, justifyContent: 'center', fontSize: 11 }}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 4. Posición */}
          <div className="card">
            <STitle>Posición</STitle>
            <select className="input" value={cfg.position} onChange={e => set('position', e.target.value)}>
              {POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
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
                      <div style={{ paddingTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
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
            <ToggleRow title="Sonido de respuesta" desc="Reproduce un tono suave cada vez que el agente envía un mensaje" checked={cfg.soundEnabled} onChange={v => set('soundEnabled', v)} />
          </div>

        </div>

        {/* ── Right: Preview ───────────────────────────────────────── */}
        <div className="widget-preview-col" style={{ position: 'sticky', top: 28 }}>
          <div className="card">
            <STitle>Vista previa</STitle>

            {/* Dark / light toggle */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {(['dark', 'light'] as const).map(t => (
                <button key={t} onClick={() => setPreviewTheme(t)}
                  className={`btn btn-sm ${previewTheme === t ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ flex: 1, justifyContent: 'center', fontSize: 11 }}>
                  {t === 'dark' ? '🌙 Oscuro' : '☀️ Claro'}
                </button>
              ))}
            </div>

            {/* Mini mock */}
            {(() => {
              const isTop    = cfg.position.includes('top');
              const isLeft   = cfg.position.includes('left');
              const isCenter = cfg.position.includes('center');
              const hSide: React.CSSProperties = isCenter ? { left: '50%', transform: 'translateX(-50%)' }
                : isLeft ? { left: 12 } : { right: 12 };
              const btnV: React.CSSProperties = isTop ? { top: 12, ...hSide } : { bottom: 12, ...hSide };
              const winV: React.CSSProperties = isTop ? { top: 62, ...hSide } : { bottom: 62, ...hSide };
              return (
                <div style={{ background: previewBg, borderRadius: 10, height: 240, position: 'relative', overflow: 'hidden', marginBottom: 14, transition: 'background 0.25s' }}>
                  {cfg.active && (
                    <div style={{ position: 'absolute', width: 180, background: previewSurface, border: `1px solid ${previewTheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`, borderRadius: 9, padding: 10, opacity: cfg.windowOpacity, ...winV }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
                        {resolvedPhoto
                          ? <img src={resolvedPhoto} width={22} height={22} style={{ borderRadius: '50%' }} alt="" />
                          : <div style={{ width: 22, height: 22, borderRadius: '50%', background: cfg.accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff', fontWeight: 700 }}>O</div>
                        }
                        <div>
                          <div style={{ fontSize: 9.5, fontWeight: 700, color: previewText }}>{cfg.title || 'Hola soy ORQO'}</div>
                          <div style={{ fontSize: 7.5, color: previewSub }}>{cfg.subtitle || 'Tu Asistente'}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 8.5, color: previewSub, background: previewTheme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)', borderRadius: 4, padding: '4px 6px' }}>
                        {cfg.placeholder || '¿En qué te puedo ayudar?'}
                      </div>
                    </div>
                  )}
                  <div style={{ position: 'absolute', width: 42, height: 42, borderRadius: '50%', background: cfg.accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: cfg.buttonOpacity, boxShadow: '0 4px 14px rgba(0,0,0,0.4)', ...btnV }}>
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
              );
            })()}

            {/* Summary */}
            <div style={{ fontSize: 12, color: 'var(--g05)', lineHeight: 2, marginBottom: 14 }}>
              <div><strong style={{ color: 'var(--g07)' }}>Acento:</strong> <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: cfg.accentColor, marginRight: 4, verticalAlign: 'middle' }} />{cfg.accentColor}</div>
              <div><strong style={{ color: 'var(--g07)' }}>Posición:</strong> {cfg.position}</div>
              <div><strong style={{ color: 'var(--g07)' }}>Tema:</strong> {cfg.themeMode}</div>
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
              <a
                href="https://dashboard.orqo.io/api/public/widget"
                target="_blank"
                rel="noopener"
                className="btn btn-ghost"
                style={{ justifyContent: 'center', fontSize: 11, color: 'var(--g04)' }}
              >
                Ver respuesta API →
              </a>
            </div>
          </div>
        </div>

      </div>
      <style jsx>{`
        .widget-layout {
          grid-template-columns: 1fr 320px;
        }
        @media (max-width: 1024px) {
          .widget-layout {
            grid-template-columns: 1fr;
          }
          .widget-preview-col {
            position: static !important;
            top: auto !important;
          }
        }
      `}</style>
    </div>
  );
}
