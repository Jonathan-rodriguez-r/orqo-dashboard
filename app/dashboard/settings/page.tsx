'use client';

import { useEffect, useState } from 'react';

// ── Tab types ─────────────────────────────────────────────────────────────────
type Tab = 'widget' | 'integrations' | 'access' | 'account';

// ── Integration catalog ───────────────────────────────────────────────────────
type IntegrationDef = {
  id: string;
  name: string;
  desc: string;
  icon: string;
  color: string;
  status: 'connected' | 'available' | 'coming_soon';
};

const INTEGRATIONS: Record<string, IntegrationDef[]> = {
  'Meta': [
    { id: 'whatsapp', name: 'WhatsApp Business', desc: 'Recepciona y responde mensajes via API oficial de Meta', icon: '💬', color: '#25D366', status: 'available' },
    { id: 'instagram', name: 'Instagram Business', desc: 'DMs de Instagram gestionados por tu agente IA', icon: '📸', color: '#E1306C', status: 'coming_soon' },
    { id: 'facebook', name: 'Facebook Messenger', desc: 'Chatbot en tu página de Facebook', icon: '📘', color: '#1877F2', status: 'coming_soon' },
  ],
  'Motores de Base de Datos (MCP)': [
    { id: 'postgresql', name: 'PostgreSQL', desc: 'Consulta y escritura en tiempo real via MCP', icon: '🐘', color: '#336791', status: 'available' },
    { id: 'mysql', name: 'MySQL / MariaDB', desc: 'Integración MCP para bases relacionales', icon: '🐬', color: '#4479A1', status: 'available' },
    { id: 'mongodb', name: 'MongoDB', desc: 'Atlas o instancia propia via MCP', icon: '🍃', color: '#4DB33D', status: 'connected' },
    { id: 'oracle', name: 'Oracle DB', desc: 'Consultas SQL sobre Oracle Enterprise', icon: '🔴', color: '#F80000', status: 'coming_soon' },
    { id: 'dynamodb', name: 'DynamoDB', desc: 'AWS DynamoDB via servidor MCP', icon: '☁️', color: '#FF9900', status: 'coming_soon' },
  ],
  'Fuentes de Datos': [
    { id: 'gsheets', name: 'Google Sheets', desc: 'Lee y escribe en hojas de cálculo como fuente de verdad', icon: '📊', color: '#0F9D58', status: 'available' },
    { id: 'excel', name: 'Excel / OneDrive', desc: 'Integración con archivos Excel en SharePoint', icon: '📗', color: '#217346', status: 'coming_soon' },
    { id: 'airtable', name: 'Airtable', desc: 'Bases de datos no-code como contexto para tu agente', icon: '🗂️', color: '#18BFFF', status: 'coming_soon' },
  ],
  'Sistemas Core': [
    { id: 'shopify', name: 'Shopify', desc: 'Pedidos, inventario y clientes desde Shopify', icon: '🛍️', color: '#96BF48', status: 'available' },
    { id: 'woocommerce', name: 'WordPress / WooCommerce', desc: 'Plugin ORQO para WP + WooCommerce nativo', icon: '🛒', color: '#7F54B3', status: 'available' },
    { id: 'salesforce', name: 'Salesforce CRM', desc: 'Sincroniza leads y oportunidades en Salesforce', icon: '☁️', color: '#00A1E0', status: 'coming_soon' },
    { id: 'hubspot', name: 'HubSpot', desc: 'CRM + marketing automation via MCP', icon: '🟠', color: '#FF7A59', status: 'coming_soon' },
  ],
};

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: IntegrationDef['status'] }) {
  if (status === 'connected') return <span className="badge badge-green">Conectado</span>;
  if (status === 'available') return <span className="badge badge-gray">Disponible</span>;
  return <span className="badge" style={{ background: 'var(--g02)', color: 'var(--g05)', fontSize: 10 }}>Próximamente</span>;
}

// ── Widget config ─────────────────────────────────────────────────────────────
type WidgetCfg = {
  title: string; subtitle: string; placeholder: string;
  accentColor: string; position: string;
  darkBg: string; darkSurface: string; lightBg: string; lightSurface: string;
  windowOpacity: number; buttonOpacity: number;
  iconMode: string; showBranding: boolean; soundEnabled: boolean;
  interactionLimit: number;
};

const DEFAULTS: WidgetCfg = {
  title: 'Hola soy ORQO', subtitle: 'Tu Asistente de Orquestación',
  placeholder: '¿En qué te puedo ayudar?',
  accentColor: '#2CB978', position: 'bottom-right',
  darkBg: '#0B100D', darkSurface: '#111812', lightBg: '#F4F7F4', lightSurface: '#FFFFFF',
  windowOpacity: 1.0, buttonOpacity: 1.0,
  iconMode: 'orqo', showBranding: true, soundEnabled: true, interactionLimit: 20,
};

const POSITIONS = ['bottom-right','bottom-left','bottom-center','top-right','top-left','top-center'];
const SWATCHES  = ['#2CB978','#6C63FF','#E63946','#F4A261','#2196F3','#FF6B6B','#00BCD4','#FF9800'];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}/>
      <div className="toggle-track"/><div className="toggle-thumb"/>
    </label>
  );
}

// ── Access / Users (mini) ─────────────────────────────────────────────────────
type User = {
  _id: string; email: string; name?: string; avatar?: string;
  role?: string; createdAt?: string | number; lastLogin?: string | number;
};

const ROLE_BADGE: Record<string, { label: string; color: string }> = {
  owner:         { label: 'Propietario', color: 'var(--acc)' },
  admin:         { label: 'Admin',       color: '#6C63FF' },
  analyst:       { label: 'Analista',    color: '#2196F3' },
  agent_manager: { label: 'Agentes',     color: '#FF9800' },
  viewer:        { label: 'Observador',  color: 'var(--g05)' },
};

function RoleBadge({ role }: { role?: string }) {
  const def = ROLE_BADGE[role ?? ''] ?? { label: role ?? 'Usuario', color: 'var(--g05)' };
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
      background: def.color + '18', color: def.color,
    }}>
      {def.label}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('widget');

  // Widget state
  const [cfg, setCfg] = useState<WidgetCfg>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Access state
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    fetch('/api/config/widget').then(r => r.json()).then(d => {
      if (!d.error) setCfg({ ...DEFAULTS, ...d });
    });
  }, []);

  useEffect(() => {
    if (tab === 'access') {
      fetch('/api/users').then(r => r.json()).then(d => setUsers(Array.isArray(d) ? d : (d.users ?? [])));
    }
  }, [tab]);

  async function saveWidget() {
    setSaving(true);
    await fetch('/api/config/widget', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cfg) });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'widget', label: 'Widget' },
    { id: 'integrations', label: 'Integraciones' },
    { id: 'access', label: 'Accesos' },
    { id: 'account', label: 'Cuenta' },
  ];

  return (
    <div className="dash-content">
      <div className="page-header">
        <h1 className="page-title">Configuración</h1>
        <p className="page-sub">Widget, integraciones, accesos y configuración de cuenta</p>
      </div>

      {/* Tab nav */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--g03)', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '9px 18px', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13.5, fontWeight: tab === t.id ? 700 : 500,
              color: tab === t.id ? 'var(--acc)' : 'var(--g05)',
              borderBottom: tab === t.id ? '2px solid var(--acc)' : '2px solid transparent',
              transition: 'all 0.15s', marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Widget tab ───────────────────────────────────────────────────── */}
      {tab === 'widget' && (
        <div className="grid-2">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Texts */}
            <div className="card">
              <div className="card-title">Textos</div>
              {[
                { label: 'Título', key: 'title' },
                { label: 'Subtítulo', key: 'subtitle' },
                { label: 'Placeholder', key: 'placeholder' },
              ].map(({ label, key }) => (
                <div key={key} className="field">
                  <label className="label">{label}</label>
                  <input className="input" value={(cfg as any)[key]} onChange={e => setCfg(p => ({ ...p, [key]: e.target.value }))}/>
                </div>
              ))}
            </div>

            {/* Appearance */}
            <div className="card">
              <div className="card-title">Apariencia</div>
              <div className="field">
                <label className="label">Color de acento</label>
                <div className="swatch-row">
                  {SWATCHES.map(c => (
                    <div key={c} className={`swatch${cfg.accentColor === c ? ' selected' : ''}`}
                      style={{ background: c }} onClick={() => setCfg(p => ({ ...p, accentColor: c }))}/>
                  ))}
                  <input type="color" value={cfg.accentColor} style={{ width: 32, height: 32, border: 'none', background: 'none', cursor: 'pointer' }}
                    onChange={e => setCfg(p => ({ ...p, accentColor: e.target.value }))}/>
                </div>
              </div>

              <div className="field">
                <label className="label">Posición</label>
                <div className="position-grid" style={{ maxWidth: 260 }}>
                  {POSITIONS.map(pos => (
                    <div key={pos} className={`pos-opt${cfg.position === pos ? ' selected' : ''}`}
                      onClick={() => setCfg(p => ({ ...p, position: pos }))}>
                      {pos.replace('-', ' ')}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Behavior */}
            <div className="card">
              <div className="card-title">Comportamiento</div>
              {[
                { label: 'Mostrar branding ORQO', desc: 'Muestra "Powered by ORQO" en el widget', key: 'showBranding' },
                { label: 'Sonido de respuesta', desc: 'Chime al recibir respuesta del agente', key: 'soundEnabled' },
              ].map(({ label, desc, key }) => (
                <div key={key} className="toggle-row">
                  <div className="toggle-info">
                    <div className="toggle-title">{label}</div>
                    <div className="toggle-desc">{desc}</div>
                  </div>
                  <Toggle checked={(cfg as any)[key]} onChange={v => setCfg(p => ({ ...p, [key]: v }))}/>
                </div>
              ))}
              <div className="field" style={{ marginTop: 12 }}>
                <label className="label">Límite de interacciones (demo)</label>
                <input type="number" className="input" style={{ maxWidth: 100 }} min={5} max={100}
                  value={cfg.interactionLimit} onChange={e => setCfg(p => ({ ...p, interactionLimit: Number(e.target.value) }))}/>
              </div>
            </div>
          </div>

          {/* Preview + save */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card">
              <div className="card-title">Vista previa</div>
              <div className="widget-preview" style={{ background: 'var(--g02)' }}>
                <div className="widget-btn-preview"
                  style={{
                    background: cfg.accentColor,
                    bottom: cfg.position.includes('bottom') ? 20 : 'auto',
                    top: cfg.position.includes('top') ? 20 : 'auto',
                    right: cfg.position.includes('right') ? 20 : cfg.position.includes('center') ? '50%' : 'auto',
                    left: cfg.position.includes('left') ? 20 : 'auto',
                    transform: cfg.position.includes('center') ? 'translateX(50%)' : 'none',
                  }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
              </div>
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--g02)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: cfg.accentColor }}>{cfg.title}</div>
                <div style={{ fontSize: 12, color: 'var(--g05)', marginTop: 2 }}>{cfg.subtitle}</div>
              </div>
            </div>

            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} onClick={saveWidget} disabled={saving}>
              {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar configuración'}
            </button>

            <div className="card card-sm">
              <div style={{ fontSize: 12, color: 'var(--g05)' }}>
                <p style={{ marginBottom: 6 }}><strong style={{ color: 'var(--g07)' }}>Embed en tu sitio:</strong></p>
                <code style={{ fontSize: 11, color: 'var(--acc)', wordBreak: 'break-all' }}>
                  {'<script src="https://dashboard.orqo.io/widget.js"></script>'}
                </code>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Integrations tab ─────────────────────────────────────────────── */}
      {tab === 'integrations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {Object.entries(INTEGRATIONS).map(([group, items]) => (
            <div key={group}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: 'var(--g05)',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                marginBottom: 14, padding: '0 2px',
              }}>
                {group}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                {items.map(int => (
                  <div key={int.id} className="card card-sm" style={{
                    opacity: int.status === 'coming_soon' ? 0.7 : 1,
                    transition: 'opacity 0.15s',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 'var(--radius-sm)',
                        background: int.color + '18', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 20, flexShrink: 0,
                      }}>
                        {int.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--g07)', marginBottom: 2 }}>{int.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--g05)', lineHeight: 1.4 }}>{int.desc}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <StatusBadge status={int.status}/>
                      {int.status !== 'coming_soon' && (
                        <button className={`btn btn-sm ${int.status === 'connected' ? 'btn-danger' : 'btn-ghost'}`}>
                          {int.status === 'connected' ? 'Desconectar' : 'Conectar'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="card" style={{ textAlign: 'center', padding: '28px', borderStyle: 'dashed' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>🔌</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--g07)', marginBottom: 6 }}>¿Necesitas otra integración?</div>
            <p style={{ fontSize: 13, color: 'var(--g05)', marginBottom: 14 }}>
              Cualquier sistema con API o servidor MCP puede conectarse a ORQO. Escríbenos.
            </p>
            <a href="mailto:hello@orqo.io" className="btn btn-primary btn-sm">Solicitar integración</a>
          </div>
        </div>
      )}

      {/* ── Access tab ───────────────────────────────────────────────────── */}
      {tab === 'access' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div className="card-title" style={{ marginBottom: 0 }}>Usuarios con acceso</div>
              <button className="btn btn-primary btn-sm">+ Invitar usuario</button>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Usuario</th><th>Email</th><th>Rol</th><th>Último acceso</th><th>Desde</th></tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--g05)' }}>Sin usuarios</td></tr>
                  ) : users.map(u => (
                    <tr key={u._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {u.avatar
                            ? <img src={u.avatar} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }}/>
                            : <div className="sidebar-avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
                                {(u.name ?? u.email).slice(0, 1).toUpperCase()}
                              </div>
                          }
                          <span style={{ fontWeight: 500, fontSize: 13 }}>{u.name ?? u.email.split('@')[0]}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--g05)', fontSize: 12.5 }}>{u.email}</td>
                      <td><RoleBadge role={u.role}/></td>
                      <td style={{ color: 'var(--g05)', fontSize: 12 }}>
                        {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('es') : 'Nunca'}
                      </td>
                      <td style={{ color: 'var(--g05)', fontSize: 12 }}>
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('es') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Account tab ──────────────────────────────────────────────────── */}
      {tab === 'account' && (
        <div className="grid-2">
          <div className="card">
            <div className="card-title">Datos del negocio</div>
            <div className="field"><label className="label">Nombre del negocio</label><input className="input" placeholder="Mi Negocio S.A.S"/></div>
            <div className="field"><label className="label">Email de contacto</label><input className="input" type="email" placeholder="hello@minegocio.com"/></div>
            <div className="field"><label className="label">Sitio web</label><input className="input" type="url" placeholder="https://minegocio.com"/></div>
            <div className="save-bar">
              <button className="btn btn-primary">Guardar cambios</button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card">
              <div className="card-title">Plan actual</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-sm)', background: 'var(--acc-g)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>⚡</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--g07)' }}>Starter</div>
                  <div style={{ fontSize: 12, color: 'var(--g05)' }}>1.000 interacciones / mes</div>
                </div>
                <span className="badge badge-green" style={{ marginLeft: 'auto' }}>Activo</span>
              </div>
              <a href="https://orqo.io/#pricing" target="_blank" rel="noopener" className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                Ver planes →
              </a>
            </div>

            <div className="card">
              <div className="card-title">Soporte</div>
              <p style={{ fontSize: 13, color: 'var(--g05)', marginBottom: 12 }}>
                ¿Tienes dudas o problemas? El equipo de ORQO está disponible para ayudarte.
              </p>
              <a href="mailto:hello@orqo.io" className="btn btn-ghost btn-sm">✉ hello@orqo.io</a>
              <a href="https://wa.me/573013211669" target="_blank" rel="noopener" className="btn btn-ghost btn-sm" style={{ marginLeft: 8 }}>
                💬 WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
