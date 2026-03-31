'use client';

import { useEffect, useState } from 'react';
import { SYSTEM_MODULES } from '@/lib/rbac';
import OrchestrationPage from './orchestration/page';

// ── Tab types ──────────────────────────────────────────────────────────────────
type Tab = 'orchestration' | 'widget' | 'integrations' | 'access' | 'account';
type AccessSubTab = 'users' | 'roles';

// ── Types ──────────────────────────────────────────────────────────────────────
type User = {
  _id: string; email: string; name?: string; avatar?: string;
  role?: string; createdAt?: string | number; lastLogin?: string | number;
};
type Role = { _id: string; slug: string; label: string; description?: string; permissions: string[]; custom?: boolean };

// ── Integration catalog ────────────────────────────────────────────────────────
type IntegrationDef = { id: string; name: string; desc: string; icon: string; color: string; status: 'connected' | 'available' | 'coming_soon' };
const INTEGRATIONS: Record<string, IntegrationDef[]> = {
  'Meta': [
    { id: 'whatsapp',  name: 'WhatsApp Business',   desc: 'Recepciona y responde mensajes via API oficial de Meta',   icon: '💬', color: '#25D366', status: 'available' },
    { id: 'instagram', name: 'Instagram Business',  desc: 'DMs de Instagram gestionados por tu agente IA',           icon: '📸', color: '#E1306C', status: 'coming_soon' },
    { id: 'facebook',  name: 'Facebook Messenger',  desc: 'Chatbot en tu página de Facebook',                        icon: '📘', color: '#1877F2', status: 'coming_soon' },
  ],
  'Motores de Base de Datos (MCP)': [
    { id: 'postgresql', name: 'PostgreSQL',      desc: 'Consulta y escritura en tiempo real via MCP',   icon: '🐘', color: '#336791', status: 'available' },
    { id: 'mysql',      name: 'MySQL / MariaDB', desc: 'Integración MCP para bases relacionales',       icon: '🐬', color: '#4479A1', status: 'available' },
    { id: 'mongodb',    name: 'MongoDB',         desc: 'Atlas o instancia propia via MCP',              icon: '🍃', color: '#4DB33D', status: 'connected' },
    { id: 'oracle',     name: 'Oracle DB',       desc: 'Consultas SQL sobre Oracle Enterprise',         icon: '🔴', color: '#F80000', status: 'coming_soon' },
    { id: 'dynamodb',   name: 'DynamoDB',        desc: 'AWS DynamoDB via servidor MCP',                 icon: '☁️', color: '#FF9900', status: 'coming_soon' },
  ],
  'Fuentes de Datos': [
    { id: 'gsheets',  name: 'Google Sheets',   desc: 'Lee y escribe en hojas de cálculo como fuente de verdad', icon: '📊', color: '#0F9D58', status: 'available' },
    { id: 'excel',    name: 'Excel / OneDrive',desc: 'Integración con archivos Excel en SharePoint',            icon: '📗', color: '#217346', status: 'coming_soon' },
    { id: 'airtable', name: 'Airtable',        desc: 'Bases de datos no-code como contexto para tu agente',    icon: '🗂️', color: '#18BFFF', status: 'coming_soon' },
  ],
  'Sistemas Core': [
    { id: 'shopify',     name: 'Shopify',                desc: 'Pedidos, inventario y clientes desde Shopify',      icon: '🛍️', color: '#96BF48', status: 'available' },
    { id: 'woocommerce', name: 'WordPress / WooCommerce',desc: 'Plugin ORQO para WP + WooCommerce nativo',          icon: '🛒', color: '#7F54B3', status: 'available' },
    { id: 'salesforce',  name: 'Salesforce CRM',         desc: 'Sincroniza leads y oportunidades en Salesforce',    icon: '☁️', color: '#00A1E0', status: 'coming_soon' },
    { id: 'hubspot',     name: 'HubSpot',                desc: 'CRM + marketing automation via MCP',                icon: '🟠', color: '#FF7A59', status: 'coming_soon' },
  ],
};

// ── Role colors ────────────────────────────────────────────────────────────────
const ROLE_COLOR: Record<string, string> = {
  owner: 'var(--acc)', admin: '#6C63FF', analyst: '#2196F3',
  agent_manager: '#FF9800', viewer: 'var(--g05)',
};
function roleColor(slug?: string) { return ROLE_COLOR[slug ?? ''] ?? '#7A9488'; }

// ── Small shared components ────────────────────────────────────────────────────
function StatusBadge({ status }: { status: IntegrationDef['status'] }) {
  if (status === 'connected') return <span className="badge badge-green">Conectado</span>;
  if (status === 'available') return <span className="badge badge-gray">Disponible</span>;
  return <span className="badge" style={{ background: 'var(--g02)', color: 'var(--g05)', fontSize: 10 }}>Próximamente</span>;
}

function RoleBadge({ role }: { role?: string }) {
  const color = roleColor(role);
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: color + '18', color }}>
      {role ?? 'Sin rol'}
    </span>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}/>
      <div className="toggle-track"/><div className="toggle-thumb"/>
    </label>
  );
}

// ── Widget config types ────────────────────────────────────────────────────────
type WidgetCfg = {
  title: string; subtitle: string; placeholder: string; accentColor: string; position: string;
  darkBg: string; darkSurface: string; lightBg: string; lightSurface: string;
  windowOpacity: number; buttonOpacity: number; iconMode: string;
  showBranding: boolean; soundEnabled: boolean; interactionLimit: number;
};
const DEFAULTS: WidgetCfg = {
  title: 'Hola soy ORQO', subtitle: 'Tu Asistente de Orquestación',
  placeholder: '¿En qué te puedo ayudar?',
  accentColor: '#2CB978', position: 'bottom-right',
  darkBg: '#0B100D', darkSurface: '#111812', lightBg: '#F4F7F4', lightSurface: '#FFFFFF',
  windowOpacity: 1.0, buttonOpacity: 1.0, iconMode: 'orqo',
  showBranding: true, soundEnabled: true, interactionLimit: 20,
};
const POSITIONS = ['bottom-right','bottom-left','bottom-center','top-right','top-left','top-center'];
const SWATCHES  = ['#2CB978','#6C63FF','#E63946','#F4A261','#2196F3','#FF6B6B','#00BCD4','#FF9800'];

// ── Module groups (for permissions editor) ─────────────────────────────────────
const MODULE_GROUPS = Array.from(new Set(SYSTEM_MODULES.map(m => m.group)));

// ── Main component ─────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [tab, setTab]               = useState<Tab>('orchestration');
  const [accessSub, setAccessSub]   = useState<AccessSubTab>('users');

  // Widget
  const [cfg, setCfg]     = useState<WidgetCfg>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  // Users
  const [users, setUsers]       = useState<User[]>([]);
  const [loadingUsers, setLU]   = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [invEmail, setInvEmail]   = useState('');
  const [invName, setInvName]     = useState('');
  const [invRole, setInvRole]     = useState('viewer');
  const [inviting, setInviting]   = useState(false);
  const [invErr, setInvErr]       = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUserName, setEditUserName]   = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserRole, setEditUserRole]   = useState('');
  const [editUserErr, setEditUserErr]     = useState('');

  // Roles
  const [roles, setRoles]             = useState<Role[]>([]);
  const [loadingRoles, setLR]         = useState(false);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [editPerms, setEditPerms]       = useState<string[]>([]);
  const [savingRole, setSavingRole]     = useState(false);
  const [showCreateRole, setShowCreate] = useState(false);
  const [newSlug, setNewSlug]     = useState('');
  const [newLabel, setNewLabel]   = useState('');
  const [newDesc, setNewDesc]     = useState('');
  const [creatingRole, setCreating] = useState(false);
  const [createErr, setCreateErr]   = useState('');

  // ── Loaders ────────────────────────────────────────────────────────────────
  function loadUsers() {
    setLU(true);
    fetch('/api/users').then(r => r.json())
      .then(d => setUsers(Array.isArray(d) ? d : (d.users ?? [])))
      .finally(() => setLU(false));
  }
  function loadRoles() {
    setLR(true);
    fetch('/api/roles').then(r => r.json())
      .then(d => setRoles(d.roles ?? []))
      .finally(() => setLR(false));
  }

  useEffect(() => {
    fetch('/api/config/widget').then(r => r.json()).then(d => { if (!d.error) setCfg({ ...DEFAULTS, ...d }); });
  }, []);

  useEffect(() => {
    if (tab === 'access') {
      loadUsers();
      loadRoles();
    }
  }, [tab]);

  // ── Widget save ────────────────────────────────────────────────────────────
  async function saveWidget() {
    setSaving(true);
    await fetch('/api/config/widget', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cfg) });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  }

  // ── Invite user ────────────────────────────────────────────────────────────
  async function inviteUser(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true); setInvErr(''); setInviteLink('');
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: invEmail.trim().toLowerCase(), name: invName.trim(), role: invRole }),
    });
    const d = await res.json();
    setInviting(false);
    if (!res.ok) { setInvErr(d.error ?? 'Error al invitar'); return; }
    setInviteLink(d.inviteLink ?? '');
    setInvEmail(''); setInvName(''); setInvRole('viewer');
    loadUsers();
  }

  // ── Edit user ──────────────────────────────────────────────────────────────
  function startEditUser(u: User) {
    setEditingUser(u);
    setEditUserName(u.name ?? '');
    setEditUserEmail(u.email);
    setEditUserRole(u.role ?? 'viewer');
    setEditUserErr('');
  }

  const [savingUser, setSavingUser] = useState(false);

  async function saveUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setEditUserErr('');
    setSavingUser(true);
    // Always send all fields — let API decide what changed
    const res = await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email:    editingUser.email,
        name:     editUserName.trim() || undefined,
        newEmail: editUserEmail.trim().toLowerCase() !== editingUser.email ? editUserEmail.trim().toLowerCase() : undefined,
        role:     editUserRole,
      }),
    });
    const d = await res.json();
    setSavingUser(false);
    if (!res.ok) { setEditUserErr(d.error ?? 'Error al guardar'); return; }
    setEditingUser(null);
    loadUsers();
  }

  // ── Delete user ────────────────────────────────────────────────────────────
  async function deleteUser(email: string, name?: string) {
    if (!confirm(`¿Eliminar acceso de ${name ?? email}? Esta acción no se puede deshacer.`)) return;
    await fetch('/api/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    loadUsers();
  }

  // ── Role permissions ───────────────────────────────────────────────────────
  function startEditRole(r: Role) {
    if (expandedRole === r.slug) { setExpandedRole(null); return; }
    setExpandedRole(r.slug);
    setEditPerms([...r.permissions]);
  }

  function togglePerm(slug: string) {
    setEditPerms(p => p.includes(slug) ? p.filter(x => x !== slug) : [...p, slug]);
  }

  async function saveRolePerms(roleSlug: string) {
    setSavingRole(true);
    const res = await fetch('/api/roles', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: roleSlug, permissions: editPerms }),
    });
    setSavingRole(false);
    if (res.ok) { setExpandedRole(null); loadRoles(); }
  }

  // ── Create role ────────────────────────────────────────────────────────────
  async function createRole(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true); setCreateErr('');
    const slug = newSlug.trim().toLowerCase().replace(/\s+/g, '_');
    const res = await fetch('/api/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, label: newLabel.trim(), description: newDesc.trim(), permissions: [] }),
    });
    const d = await res.json();
    setCreating(false);
    if (!res.ok) { setCreateErr(d.error ?? 'Error al crear'); return; }
    setShowCreate(false); setNewSlug(''); setNewLabel(''); setNewDesc('');
    loadRoles();
  }

  // ── Delete role ────────────────────────────────────────────────────────────
  async function deleteRole(slug: string, label: string) {
    if (!confirm(`¿Eliminar el rol "${label}"? Los usuarios con este rol quedarán sin permisos.`)) return;
    await fetch('/api/roles', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
    });
    loadRoles();
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'orchestration', label: 'Orquestación IA' },
    { id: 'widget',        label: 'Widget' },
    { id: 'integrations',  label: 'Integraciones' },
    { id: 'access',        label: 'Accesos' },
    { id: 'account',       label: 'Cuenta' },
  ];

  const tabBtnStyle = (active: boolean) => ({
    padding: '9px 18px', background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 13.5, fontWeight: active ? 700 : 500,
    color: active ? 'var(--acc)' : 'var(--g05)',
    borderBottom: active ? '2px solid var(--acc)' : '2px solid transparent',
    transition: 'all 0.15s', marginBottom: -1,
  });

  return (
    <div className="dash-content">
      <div className="page-header">
        <h1 className="page-title">Configuración</h1>
        <p className="page-sub">Orquestación IA, widget, integraciones, accesos y cuenta</p>
      </div>

      {/* Main tab nav */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--g03)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={tabBtnStyle(tab === t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Orchestration tab ─────────────────────────────────────────── */}
      {tab === 'orchestration' && <OrchestrationPage embedded />}

      {/* ── Widget tab ──────────────────────────────────────────────────────── */}
      {tab === 'widget' && (
        <div className="grid-2">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card">
              <div className="card-title">Textos</div>
              {[{ label: 'Título', key: 'title' },{ label: 'Subtítulo', key: 'subtitle' },{ label: 'Placeholder', key: 'placeholder' }].map(({ label, key }) => (
                <div key={key} className="field">
                  <label className="label">{label}</label>
                  <input className="input" value={(cfg as any)[key]} onChange={e => setCfg(p => ({ ...p, [key]: e.target.value }))}/>
                </div>
              ))}
            </div>
            <div className="card">
              <div className="card-title">Apariencia</div>
              <div className="field">
                <label className="label">Color de acento</label>
                <div className="swatch-row">
                  {SWATCHES.map(c => (
                    <div key={c} className={`swatch${cfg.accentColor === c ? ' selected' : ''}`} style={{ background: c }} onClick={() => setCfg(p => ({ ...p, accentColor: c }))}/>
                  ))}
                  <input type="color" value={cfg.accentColor} style={{ width: 32, height: 32, border: 'none', background: 'none', cursor: 'pointer' }} onChange={e => setCfg(p => ({ ...p, accentColor: e.target.value }))}/>
                </div>
              </div>
              <div className="field">
                <label className="label">Posición</label>
                <div className="position-grid" style={{ maxWidth: 260 }}>
                  {POSITIONS.map(pos => (
                    <div key={pos} className={`pos-opt${cfg.position === pos ? ' selected' : ''}`} onClick={() => setCfg(p => ({ ...p, position: pos }))}>
                      {pos.replace('-', ' ')}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-title">Comportamiento</div>
              {[
                { label: 'Mostrar branding ORQO', desc: 'Muestra "Powered by ORQO" en el widget', key: 'showBranding' },
                { label: 'Sonido de respuesta', desc: 'Chime al recibir respuesta del agente', key: 'soundEnabled' },
              ].map(({ label, desc, key }) => (
                <div key={key} className="toggle-row">
                  <div className="toggle-info"><div className="toggle-title">{label}</div><div className="toggle-desc">{desc}</div></div>
                  <Toggle checked={(cfg as any)[key]} onChange={v => setCfg(p => ({ ...p, [key]: v }))}/>
                </div>
              ))}
              <div className="field" style={{ marginTop: 12 }}>
                <label className="label">Límite de interacciones (demo)</label>
                <input type="number" className="input" style={{ maxWidth: 100 }} min={5} max={100} value={cfg.interactionLimit} onChange={e => setCfg(p => ({ ...p, interactionLimit: Number(e.target.value) }))}/>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card">
              <div className="card-title">Vista previa</div>
              <div className="widget-preview" style={{ background: 'var(--g02)' }}>
                <div className="widget-btn-preview" style={{
                  background: cfg.accentColor,
                  bottom: cfg.position.includes('bottom') ? 20 : 'auto',
                  top: cfg.position.includes('top') ? 20 : 'auto',
                  right: cfg.position.includes('right') ? 20 : cfg.position.includes('center') ? '50%' : 'auto',
                  left: cfg.position.includes('left') ? 20 : 'auto',
                  transform: cfg.position.includes('center') ? 'translateX(50%)' : 'none',
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
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
                <code style={{ fontSize: 11, color: 'var(--acc)', wordBreak: 'break-all' }}>{'<script src="https://dashboard.orqo.io/widget.js"></script>'}</code>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Integrations tab ────────────────────────────────────────────────── */}
      {tab === 'integrations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {Object.entries(INTEGRATIONS).map(([group, items]) => (
            <div key={group}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--g05)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>{group}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                {items.map(int => (
                  <div key={int.id} className="card card-sm" style={{ opacity: int.status === 'coming_soon' ? 0.7 : 1 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: int.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{int.icon}</div>
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
            <p style={{ fontSize: 13, color: 'var(--g05)', marginBottom: 14 }}>Cualquier sistema con API o servidor MCP puede conectarse a ORQO.</p>
            <a href="mailto:hello@orqo.io" className="btn btn-primary btn-sm">Solicitar integración</a>
          </div>
        </div>
      )}

      {/* ── Access tab ──────────────────────────────────────────────────────── */}
      {tab === 'access' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Sub-tab nav */}
          <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--g03)' }}>
            {(['users', 'roles'] as AccessSubTab[]).map(st => (
              <button key={st} onClick={() => setAccessSub(st)} style={tabBtnStyle(accessSub === st)}>
                {st === 'users' ? 'Usuarios' : 'Roles y Permisos'}
              </button>
            ))}
          </div>

          {/* ── Users sub-tab ────────────────────────────────────────────── */}
          {accessSub === 'users' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Invite form */}
              {!showInvite ? (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-primary btn-sm" onClick={() => { setShowInvite(true); setInvErr(''); }}>
                    + Invitar usuario
                  </button>
                </div>
              ) : (
                <div className="card" style={{ background: 'var(--g02)', border: '1px solid var(--g03)' }}>
                  <div className="card-title">Invitar nuevo usuario</div>
                  <form onSubmit={inviteUser}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                      <div className="field" style={{ marginBottom: 0 }}>
                        <label className="label">Email *</label>
                        <input className="input" type="email" placeholder="correo@empresa.com" value={invEmail} onChange={e => setInvEmail(e.target.value)} required autoFocus/>
                      </div>
                      <div className="field" style={{ marginBottom: 0 }}>
                        <label className="label">Nombre</label>
                        <input className="input" placeholder="Nombre del usuario" value={invName} onChange={e => setInvName(e.target.value)}/>
                      </div>
                    </div>
                    <div className="field" style={{ marginBottom: 12 }}>
                      <label className="label">Rol</label>
                      <select className="input" value={invRole} onChange={e => setInvRole(e.target.value)}>
                        {roles.map(r => <option key={r.slug} value={r.slug}>{r.label}</option>)}
                        {roles.length === 0 && ['owner','admin','analyst','agent_manager','viewer'].map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    {invErr && <p style={{ color: 'var(--red)', fontSize: 12, marginBottom: 10 }}>{invErr}</p>}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="submit" className="btn btn-primary btn-sm" disabled={inviting}>{inviting ? 'Invitando...' : 'Invitar'}</button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setShowInvite(false); setInvErr(''); setInviteLink(''); }}>Cancelar</button>
                    </div>
                  </form>

                  {inviteLink && (
                    <div style={{ marginTop: 16, padding: '12px 14px', background: 'rgba(44,185,120,0.08)', border: '1px solid rgba(44,185,120,0.25)', borderRadius: 8 }}>
                      <div style={{ fontSize: 12, color: 'var(--acc)', fontWeight: 600, marginBottom: 6 }}>
                        ✓ Invitación enviada. Comparte este link de activación (válido 72h):
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <code style={{ fontSize: 11, color: 'var(--g06)', wordBreak: 'break-all', flex: 1, background: 'var(--g02)', padding: '6px 8px', borderRadius: 6 }}>{inviteLink}</code>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ flexShrink: 0 }}
                          onClick={() => navigator.clipboard.writeText(inviteLink)}
                        >
                          Copiar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Users table */}
              <div className="card">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Usuario</th><th>Email</th><th>Rol</th><th>Último acceso</th><th>Desde</th><th>Acciones</th></tr>
                    </thead>
                    <tbody>
                      {loadingUsers ? (
                        <tr><td colSpan={6} style={{ textAlign: 'center', padding: 28, color: 'var(--g05)' }}>Cargando...</td></tr>
                      ) : users.length === 0 ? (
                        <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--g05)' }}>Sin usuarios</td></tr>
                      ) : users.map(u => (
                        <tr key={u._id} style={{ background: editingUser?._id === u._id ? 'var(--g02)' : undefined }}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {u.avatar
                                ? <img src={u.avatar} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }}/>
                                : <div className="sidebar-avatar" style={{ width: 28, height: 28, fontSize: 11 }}>{(u.name ?? u.email).slice(0,1).toUpperCase()}</div>
                              }
                              <span style={{ fontWeight: 500, fontSize: 13 }}>{u.name ?? u.email.split('@')[0]}</span>
                            </div>
                          </td>
                          <td style={{ color: 'var(--g05)', fontSize: 12.5 }}>{u.email}</td>
                          <td><RoleBadge role={u.role}/></td>
                          <td style={{ color: 'var(--g05)', fontSize: 12 }}>{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('es') : 'Nunca'}</td>
                          <td style={{ color: 'var(--g05)', fontSize: 12 }}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString('es') : '—'}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '3px 10px' }}
                                onClick={() => editingUser?._id === u._id ? setEditingUser(null) : startEditUser(u)}>
                                {editingUser?._id === u._id ? 'Cancelar' : 'Editar'}
                              </button>
                              <button className="btn btn-sm" style={{ fontSize: 11, padding: '3px 10px', background: 'rgba(239,68,68,0.08)', color: 'var(--red)', border: '1px solid rgba(239,68,68,0.2)' }}
                                onClick={() => deleteUser(u.email, u.name)}>
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Edit user panel — outside table so no overflow clipping */}
              {editingUser && (
                <div className="card" style={{ background: 'var(--g02)', border: '1px solid var(--acc)', borderRadius: 'var(--radius-lg)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--acc)' }}/>
                    <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--g07)' }}>
                      Editando: {editingUser.name ?? editingUser.email}
                    </span>
                  </div>
                  <form onSubmit={saveUser}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 12 }}>
                      <div className="field" style={{ marginBottom: 0 }}>
                        <label className="label">Nombre</label>
                        <input className="input" placeholder="Nombre del usuario" value={editUserName} onChange={e => setEditUserName(e.target.value)}/>
                      </div>
                      <div className="field" style={{ marginBottom: 0 }}>
                        <label className="label">Email</label>
                        <input className="input" type="email" value={editUserEmail} onChange={e => setEditUserEmail(e.target.value)} required/>
                      </div>
                      <div className="field" style={{ marginBottom: 0 }}>
                        <label className="label">Rol</label>
                        <select className="input" value={editUserRole} onChange={e => setEditUserRole(e.target.value)}>
                          {roles.map(r => <option key={r.slug} value={r.slug}>{r.label}</option>)}
                        </select>
                      </div>
                    </div>
                    {editUserErr && <p style={{ color: 'var(--red)', fontSize: 12, marginBottom: 10 }}>{editUserErr}</p>}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button type="submit" className="btn btn-primary btn-sm" disabled={savingUser}>
                        {savingUser ? 'Guardando...' : 'Guardar cambios'}
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditingUser(null)}>Cancelar</button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* ── Roles sub-tab ────────────────────────────────────────────── */}
          {accessSub === 'roles' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Create role form */}
              {!showCreateRole ? (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-primary btn-sm" onClick={() => { setShowCreate(true); setCreateErr(''); }}>
                    + Crear rol
                  </button>
                </div>
              ) : (
                <div className="card" style={{ background: 'var(--g02)', border: '1px solid var(--g03)' }}>
                  <div className="card-title">Nuevo rol personalizado</div>
                  <form onSubmit={createRole}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                      <div className="field" style={{ marginBottom: 0 }}>
                        <label className="label">ID del rol *</label>
                        <input className="input" placeholder="ej: supervisor" value={newSlug} onChange={e => setNewSlug(e.target.value)} required autoFocus/>
                        <div style={{ fontSize: 11, color: 'var(--g05)', marginTop: 4 }}>Solo minúsculas y guiones bajos</div>
                      </div>
                      <div className="field" style={{ marginBottom: 0 }}>
                        <label className="label">Nombre visible *</label>
                        <input className="input" placeholder="ej: Supervisor" value={newLabel} onChange={e => setNewLabel(e.target.value)} required/>
                      </div>
                    </div>
                    <div className="field" style={{ marginBottom: 12 }}>
                      <label className="label">Descripción</label>
                      <input className="input" placeholder="¿Qué puede hacer este rol?" value={newDesc} onChange={e => setNewDesc(e.target.value)}/>
                    </div>
                    {createErr && <p style={{ color: 'var(--red)', fontSize: 12, marginBottom: 10 }}>{createErr}</p>}
                    <p style={{ fontSize: 12, color: 'var(--g05)', marginBottom: 12 }}>El rol se creará sin permisos. Edítalo para asignarlos.</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="submit" className="btn btn-primary btn-sm" disabled={creatingRole}>{creatingRole ? 'Creando...' : 'Crear rol'}</button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setShowCreate(false); setCreateErr(''); }}>Cancelar</button>
                    </div>
                  </form>
                </div>
              )}

              {/* Roles list */}
              {loadingRoles ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--g05)' }}>Cargando roles...</div>
              ) : roles.map(r => (
                <div key={r.slug} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  {/* Role header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: roleColor(r.slug) + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: roleColor(r.slug) }}>{r.label.slice(0,1)}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--g07)' }}>{r.label}</span>
                        {r.custom && <span style={{ fontSize: 10, background: 'var(--g03)', color: 'var(--g05)', padding: '1px 6px', borderRadius: 10, fontWeight: 600 }}>Custom</span>}
                        <span style={{ fontSize: 11, color: 'var(--g05)', marginLeft: 4 }}>{r.permissions.length} permisos</span>
                      </div>
                      {r.description && <div style={{ fontSize: 12, color: 'var(--g05)', marginTop: 2 }}>{r.description}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }} onClick={() => startEditRole(r)}>
                        {expandedRole === r.slug ? 'Cerrar' : 'Editar permisos'}
                      </button>
                      {r.custom && (
                        <button className="btn btn-sm" style={{ fontSize: 11, background: 'rgba(239,68,68,0.08)', color: 'var(--red)', border: '1px solid rgba(239,68,68,0.2)' }}
                          onClick={() => deleteRole(r.slug, r.label)}>
                          Eliminar
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Permissions editor */}
                  {expandedRole === r.slug && (
                    <div style={{ borderTop: '1px solid var(--g03)', padding: '18px 18px 14px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20, marginBottom: 16 }}>
                        {MODULE_GROUPS.map(group => (
                          <div key={group}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--g05)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                              {group}
                            </div>
                            {SYSTEM_MODULES.filter(m => m.group === group).map(m => (
                              <label key={m.slug} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6, cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={editPerms.includes(m.slug)}
                                  onChange={() => togglePerm(m.slug)}
                                  style={{ marginTop: 2, accentColor: 'var(--acc)', flexShrink: 0 }}
                                />
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--g07)' }}>{m.label}</div>
                                  <div style={{ fontSize: 11, color: 'var(--g05)' }}>{m.description}</div>
                                </div>
                              </label>
                            ))}
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <button className="btn btn-primary btn-sm" disabled={savingRole} onClick={() => saveRolePerms(r.slug)}>
                          {savingRole ? 'Guardando...' : 'Guardar permisos'}
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setExpandedRole(null)}>Cancelar</button>
                        <span style={{ fontSize: 11, color: 'var(--g05)' }}>
                          {editPerms.length}/{SYSTEM_MODULES.length} permisos
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--yellow)', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', padding: '2px 8px', borderRadius: 6 }}>
                          ⚠ Los cambios aplican en el próximo inicio de sesión
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {!loadingRoles && roles.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--g05)' }}>
                  Sin roles. Ejecuta <code style={{ color: 'var(--acc)' }}>POST /api/seed/rbac</code> para inicializar.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Account tab ─────────────────────────────────────────────────────── */}
      {tab === 'account' && (
        <div className="grid-2">
          <div className="card">
            <div className="card-title">Datos del negocio</div>
            <div className="field"><label className="label">Nombre del negocio</label><input className="input" placeholder="Mi Negocio S.A.S"/></div>
            <div className="field"><label className="label">Email de contacto</label><input className="input" type="email" placeholder="hello@minegocio.com"/></div>
            <div className="field"><label className="label">Sitio web</label><input className="input" type="url" placeholder="https://minegocio.com"/></div>
            <div className="save-bar"><button className="btn btn-primary">Guardar cambios</button></div>
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
              <a href="https://orqo.io/#pricing" target="_blank" rel="noopener" className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center' }}>Ver planes →</a>
            </div>
            <div className="card">
              <div className="card-title">Soporte</div>
              <p style={{ fontSize: 13, color: 'var(--g05)', marginBottom: 12 }}>¿Tienes dudas o problemas? El equipo de ORQO está disponible para ayudarte.</p>
              <a href="mailto:hello@orqo.io" className="btn btn-ghost btn-sm">✉ hello@orqo.io</a>
              <a href="https://wa.me/573013211669" target="_blank" rel="noopener" className="btn btn-ghost btn-sm" style={{ marginLeft: 8 }}>💬 WhatsApp</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
