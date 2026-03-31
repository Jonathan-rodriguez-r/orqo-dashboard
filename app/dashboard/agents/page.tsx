'use client';

import { useState, useEffect, useCallback } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────
type Status = 'active' | 'inactive' | 'draft';
type Provider = 'google' | 'openai' | 'grok' | 'anthropic';

type AgentSummary = {
  _id: string;
  name: string;
  status: Status;
  avatar: string;
  channels: Record<string, boolean>;
  createdAt: string;
};

type AgentFull = AgentSummary & {
  aiProvider: { provider: Provider; model: string };
  profile: { systemPrompt: string; personality: string; language: string; responseLength: string };
  skills: string[];
  corporateContext: string;
  advanced: {
    timezone: string;
    scheduleEnabled: boolean;
    geofencingEnabled: boolean;
    escalationKeywords: string;
    humanHandoffMsg: string;
  };
};

type FormState = Omit<AgentFull, '_id' | 'createdAt'>;

// ── Constants ─────────────────────────────────────────────────────────────────
const PROVIDERS: { id: Provider; name: string; icon: string; models: string[] }[] = [
  { id: 'google',    name: 'Google Gemini', icon: '◉', models: ['gemini-2.0-flash', 'gemini-2.0-pro', 'gemini-1.5-pro', 'gemini-1.5-flash'] },
  { id: 'openai',    name: 'OpenAI',        icon: '◆', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
  { id: 'grok',      name: 'Grok (xAI)',    icon: '✕', models: ['grok-3', 'grok-3-mini', 'grok-2'] },
  { id: 'anthropic', name: 'Anthropic',     icon: '◭', models: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5'] },
];

const AVATARS = ['🤖', '💼', '🎧', '🏠', '📣', '📚', '🛒', '🌎', '🔬', '✨'];

const PERSONALITIES = [
  { id: 'young',        label: 'Joven' },
  { id: 'professional', label: 'Profesional' },
  { id: 'formal',       label: 'Formal' },
];

const LANGUAGES = [
  { id: 'es', label: 'Español' },
  { id: 'en', label: 'Inglés' },
  { id: 'fr', label: 'Francés' },
  { id: 'pt', label: 'Portugués' },
  { id: 'de', label: 'Alemán' },
];

const CHANNELS: { id: string; label: string; emoji: string; color: string }[] = [
  { id: 'whatsapp',   label: 'WhatsApp',   emoji: '💬', color: '#25D366' },
  { id: 'instagram',  label: 'Instagram',  emoji: '📸', color: '#E1306C' },
  { id: 'messenger',  label: 'Messenger',  emoji: '📘', color: '#0084FF' },
  { id: 'web',        label: 'Web Widget', emoji: '🌐', color: '#2CB978' },
  { id: 'woocommerce',label: 'WooCommerce',emoji: '🛒', color: '#7F54B3' },
  { id: 'shopify',    label: 'Shopify',    emoji: '🛍️', color: '#96BF48' },
];

const TIMEZONES = [
  'America/Bogota', 'America/Mexico_City', 'America/Lima', 'America/Santiago',
  'America/Buenos_Aires', 'America/Caracas', 'America/Guayaquil', 'Europe/Madrid',
];

const GEO_COUNTRIES = ['CO', 'MX', 'PE', 'CL', 'AR', 'VE', 'EC', 'ES', 'US'];

const SKILLS_GROUPS = [
  { id: 'ventas', name: 'Ventas', icon: '💼', skills: [
    { id: 'leads', label: 'Buscar leads' }, { id: 'convert', label: 'Convertir leads' },
    { id: 'escalate', label: 'Escalar a agente humano' }, { id: 'consult', label: 'Agendar consulta' },
    { id: 'appt', label: 'Agendar cita' }, { id: 'prices', label: 'Manejar precios' },
    { id: 'inventory', label: 'Manejar inventario' }, { id: 'star', label: 'Vendedor estrella' },
  ]},
  { id: 'soporte', name: 'Soporte', icon: '🎧', skills: [
    { id: 'advisor', label: 'Asesor de soporte' }, { id: 'solutions', label: 'Sugerir soluciones' },
    { id: 'technical', label: 'Respuestas técnicas' }, { id: 'trainer', label: 'Capacitador' },
  ]},
  { id: 'multiidioma', name: 'Multi-idioma', icon: '🌎', skills: [
    { id: 'multilang', label: 'Asesor multi-idioma' }, { id: 'translate', label: 'Traducción en tiempo real' },
    { id: 'locale', label: 'Adaptación cultural' },
  ]},
  { id: 'anfitrion', name: 'Anfitrión Digital', icon: '🏠', skills: [
    { id: 'reservas', label: 'Captura de reservas' }, { id: 'disponibilidad', label: 'Consultar disponibilidad' },
    { id: 'checkin', label: 'Guía de check-in' },
  ]},
  { id: 'ecommerce', name: 'E-commerce', icon: '🛒', skills: [
    { id: 'cart', label: 'Asistir carrito' }, { id: 'returns', label: 'Gestionar devoluciones' },
    { id: 'tracking', label: 'Rastrear pedidos' }, { id: 'upsell', label: 'Upsell & cross-sell' },
    { id: 'catalog', label: 'Catálogo de productos' },
  ]},
  { id: 'educacion', name: 'Educación', icon: '📚', skills: [
    { id: 'faq', label: 'Preguntas frecuentes' }, { id: 'quiz', label: 'Generar quizzes' },
    { id: 'summarize', label: 'Resumir documentos' }, { id: 'explain', label: 'Explicar conceptos' },
    { id: 'onboard', label: 'Onboarding de usuarios' },
  ]},
];

const DEFAULT_FORM: FormState = {
  name: '',
  status: 'draft',
  avatar: '🤖',
  aiProvider: { provider: 'google', model: 'gemini-2.0-flash' },
  channels: { whatsapp: false, instagram: false, messenger: false, web: true, woocommerce: false, shopify: false },
  profile: { systemPrompt: '', personality: 'professional', language: 'es', responseLength: 'standard' },
  skills: [],
  corporateContext: '',
  advanced: {
    timezone: 'America/Bogota', scheduleEnabled: false, geofencingEnabled: false,
    escalationKeywords: '', humanHandoffMsg: 'En un momento te atiendo un agente humano.',
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function statusBadge(status: Status) {
  if (status === 'active')   return <span className="badge badge-green">Activo</span>;
  if (status === 'draft')    return <span className="badge badge-yellow">Borrador</span>;
  return <span className="badge badge-gray">Inactivo</span>;
}

function channelCount(channels: Record<string, boolean>) {
  return Object.values(channels).filter(Boolean).length;
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: 'var(--f-disp)', fontWeight: 700, fontSize: 15,
      color: 'var(--g07)', marginBottom: 16, paddingBottom: 10,
      borderBottom: '1px solid var(--g03)',
    }}>
      {children}
    </div>
  );
}

// ── Preview Drawer ────────────────────────────────────────────────────────────
function PreviewDrawer({ agent, onClose }: { agent: FormState; onClose: () => void }) {
  const greeting = agent.profile.personality === 'young'
    ? `¡Hola! Soy ${agent.name || 'tu asistente'} 😊 ¿En qué te puedo ayudar hoy?`
    : agent.profile.personality === 'formal'
    ? `Buenos días. Soy ${agent.name || 'su asistente'}. ¿En qué le puedo asistir?`
    : `Hola, soy ${agent.name || 'tu asistente'}. ¿En qué puedo ayudarte?`;

  return (
    <div style={{
      width: 320, flexShrink: 0,
      borderLeft: '1px solid var(--g03)',
      display: 'flex', flexDirection: 'column',
      background: 'var(--g00)',
      animation: 'slideIn .2s ease',
    }}>
      {/* Drawer header */}
      <div style={{
        padding: '16px', borderBottom: '1px solid var(--g03)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'color-mix(in srgb, var(--acc) 15%, var(--g01))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
          }}>{agent.avatar}</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--g08)' }}>
              {agent.name || 'Mi agente'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--g05)' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2CB978', display: 'inline-block' }} />
              Activo
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--g05)', fontSize: 18, lineHeight: 1 }}
        >
          ✕
        </button>
      </div>

      {/* Chat messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* User */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{
            background: 'var(--acc)', color: '#fff',
            borderRadius: '16px 16px 4px 16px',
            padding: '8px 14px', fontSize: 13, maxWidth: '85%',
          }}>
            Hola, necesito información sobre sus productos
          </div>
        </div>
        {/* Agent */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <span style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'color-mix(in srgb, var(--acc) 15%, var(--g01))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0,
          }}>{agent.avatar}</span>
          <div style={{
            background: 'var(--g02)', color: 'var(--g08)',
            borderRadius: '16px 16px 16px 4px',
            padding: '8px 14px', fontSize: 13, maxWidth: '85%',
          }}>
            {greeting}
          </div>
        </div>
        {/* User */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{
            background: 'var(--acc)', color: '#fff',
            borderRadius: '16px 16px 4px 16px',
            padding: '8px 14px', fontSize: 13, maxWidth: '85%',
          }}>
            ¿Cuánto cuesta el servicio?
          </div>
        </div>
        {/* Agent */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <span style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'color-mix(in srgb, var(--acc) 15%, var(--g01))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0,
          }}>{agent.avatar}</span>
          <div style={{
            background: 'var(--g02)', color: 'var(--g08)',
            borderRadius: '16px 16px 16px 4px',
            padding: '8px 14px', fontSize: 13, maxWidth: '85%',
          }}>
            Con gusto te ayudo con esa información. Nuestros planes se adaptan a las necesidades de cada cliente. ¿Te gustaría conocer más detalles?
          </div>
        </div>
      </div>

      {/* Input bar */}
      <div style={{
        padding: '12px 16px', borderTop: '1px solid var(--g03)',
        display: 'flex', gap: 8, alignItems: 'center',
      }}>
        <input
          disabled
          placeholder="Simulación"
          style={{
            flex: 1, padding: '8px 14px',
            border: '1px solid var(--g03)', borderRadius: 20,
            background: 'var(--g01)', color: 'var(--g05)',
            fontSize: 13, cursor: 'not-allowed',
          }}
        />
        <button disabled style={{
          width: 34, height: 34, borderRadius: '50%',
          background: 'var(--g03)', border: 'none', cursor: 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
        }}>
          ➤
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  // Load agents list
  const loadAgents = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/agents');
      const data = await r.json();
      if (Array.isArray(data)) setAgents(data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadAgents(); }, [loadAgents]);

  // Load full agent on select
  async function selectAgent(id: string) {
    setSelectedId(id);
    setShowPreview(false);
    setDeleteConfirm(false);
    setDeleteErr(null);
    setSaveErr(null);
    setSaveOk(false);
    setFormLoading(true);
    try {
      const r = await fetch(`/api/agents/${id}`);
      const data = await r.json();
      if (!data.error) {
        const { _id, createdAt, ...rest } = data;
        setForm(rest);
      }
    } catch {}
    setFormLoading(false);
  }

  function newAgent() {
    setSelectedId('new');
    setForm({ ...DEFAULT_FORM });
    setShowPreview(false);
    setDeleteConfirm(false);
    setDeleteErr(null);
    setSaveErr(null);
    setSaveOk(false);
  }

  function setF<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setSaveErr(null);
    setSaveOk(false);
    try {
      let r: Response;
      if (selectedId === 'new') {
        r = await fetch('/api/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      } else {
        r = await fetch(`/api/agents/${selectedId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      }
      const data = await r.json();
      if (!r.ok || data.error) {
        setSaveErr(data.error ?? 'Error al guardar.');
      } else {
        setSaveOk(true);
        setTimeout(() => setSaveOk(false), 3000);
        await loadAgents();
        if (selectedId === 'new' && data._id) {
          setSelectedId(data._id);
        }
      }
    } catch {
      setSaveErr('Error de red.');
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!selectedId || selectedId === 'new') return;
    try {
      const r = await fetch(`/api/agents/${selectedId}`, { method: 'DELETE' });
      const data = await r.json();
      if (!r.ok || data.error) {
        setDeleteErr(data.error ?? 'Error al eliminar.');
        setDeleteConfirm(false);
      } else {
        setSelectedId(null);
        setDeleteConfirm(false);
        await loadAgents();
      }
    } catch {
      setDeleteErr('Error de red.');
      setDeleteConfirm(false);
    }
  }

  const activeCount = agents.filter(a => a.status === 'active').length;

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 60px)', overflow: 'hidden' }}>

      {/* ── Left Panel ───────────────────────────────────────────────────────── */}
      <div style={{
        width: 240, flexShrink: 0,
        borderRight: '1px solid var(--g03)',
        display: 'flex', flexDirection: 'column',
        background: 'var(--g00)',
      }}>
        {/* List header */}
        <div style={{
          padding: '16px 14px 12px',
          borderBottom: '1px solid var(--g03)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontFamily: 'var(--f-disp)', fontWeight: 700, fontSize: 15, color: 'var(--g08)' }}>
              Agentes
            </span>
            <button className="btn btn-primary btn-sm" onClick={newAgent}>+ Nuevo</button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--g05)' }}>
            {activeCount} activo{activeCount !== 1 ? 's' : ''} · {agents.length} total
          </div>
        </div>

        {/* Agent list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 6px' }}>
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--g05)', fontSize: 13 }}>
              Cargando…
            </div>
          ) : agents.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🤖</div>
              <div style={{ fontSize: 13, color: 'var(--g06)', fontWeight: 600, marginBottom: 8 }}>
                Crea tu primer agente
              </div>
              <button className="btn btn-primary btn-sm" onClick={newAgent}>+ Nuevo agente</button>
            </div>
          ) : (
            agents.map(agent => {
              const isActive = selectedId === agent._id;
              return (
                <button
                  key={agent._id}
                  onClick={() => selectAgent(agent._id)}
                  style={{
                    width: '100%', textAlign: 'left',
                    padding: '10px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: `1px solid ${isActive ? 'var(--acc)' : 'transparent'}`,
                    background: isActive ? 'color-mix(in srgb, var(--acc) 10%, var(--g01))' : 'transparent',
                    cursor: 'pointer', marginBottom: 2,
                    display: 'flex', alignItems: 'center', gap: 10,
                    transition: 'all .15s',
                  }}
                >
                  <span style={{
                    width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                    background: 'color-mix(in srgb, var(--acc) 15%, var(--g01))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                  }}>
                    {agent.avatar}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--g08)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {agent.name || 'Sin nombre'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      {statusBadge(agent.status)}
                      <span style={{ fontSize: 10, color: 'var(--g05)' }}>
                        {channelCount(agent.channels)} canal{channelCount(agent.channels) !== 1 ? 'es' : ''}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right Panel ──────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {selectedId === null ? (
          // Empty state
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <div style={{ fontSize: 64 }}>🤖</div>
            <div style={{ fontFamily: 'var(--f-disp)', fontWeight: 700, fontSize: 18, color: 'var(--g07)' }}>
              Selecciona un agente
            </div>
            <div style={{ fontSize: 14, color: 'var(--g05)' }}>
              o crea uno nuevo para empezar
            </div>
            <button className="btn btn-primary" onClick={newAgent}>+ Nuevo agente</button>
          </div>
        ) : (
          <>
            {/* Config panel */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {formLoading ? (
                <div style={{ padding: 48, textAlign: 'center', color: 'var(--g05)' }}>Cargando agente…</div>
              ) : (
                <>
                  {/* Config header */}
                  <div style={{
                    padding: '16px 24px', borderBottom: '1px solid var(--g03)',
                    display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                    background: 'var(--g00)', position: 'sticky', top: 0, zIndex: 10,
                  }}>
                    <div style={{ fontSize: 28 }}>{form.avatar}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--f-disp)', fontWeight: 700, fontSize: 16, color: 'var(--g08)' }}>
                        {form.name || 'Nuevo agente'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--g05)' }}>
                        {selectedId === 'new' ? 'Sin guardar' : `ID: ${selectedId}`}
                      </div>
                    </div>
                    {/* Status toggle */}
                    <select
                      className="input"
                      value={form.status}
                      onChange={e => setF('status', e.target.value as Status)}
                      style={{ width: 130, fontSize: 13 }}
                    >
                      <option value="active">Activo</option>
                      <option value="inactive">Inactivo</option>
                      <option value="draft">Borrador</option>
                    </select>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setShowPreview(v => !v)}
                    >
                      {showPreview ? 'Cerrar preview' : 'Vista previa'}
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={handleSave}
                      disabled={saving}
                    >
                      {saving ? 'Guardando…' : 'Guardar'}
                    </button>
                  </div>

                  {/* Feedback */}
                  {(saveErr || saveOk) && (
                    <div style={{
                      margin: '12px 24px 0', padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: saveErr ? 'color-mix(in srgb, var(--red) 10%, var(--g01))' : 'color-mix(in srgb, var(--acc) 10%, var(--g01))',
                      color: saveErr ? 'var(--red)' : 'var(--acc)',
                      fontSize: 13, fontWeight: 500,
                      border: `1px solid ${saveErr ? 'var(--red)' : 'var(--acc)'}`,
                    }}>
                      {saveErr ?? 'Agente guardado correctamente.'}
                    </div>
                  )}

                  <div style={{ padding: '24px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>

                    {/* ─── Section 1: Identidad ─────────────────────────────────── */}
                    <div className="card">
                      <SectionTitle>1. Identidad</SectionTitle>

                      <div className="field">
                        <label className="label">Nombre del agente</label>
                        <input
                          className="input"
                          value={form.name}
                          onChange={e => setF('name', e.target.value)}
                          placeholder="Ej: Asistente de ventas"
                        />
                      </div>

                      <div className="field" style={{ marginTop: 14 }}>
                        <label className="label">Avatar</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                          {AVATARS.map(em => (
                            <button
                              key={em}
                              type="button"
                              onClick={() => setF('avatar', em)}
                              style={{
                                width: 38, height: 38, borderRadius: '50%', fontSize: 20,
                                border: `2px solid ${form.avatar === em ? 'var(--acc)' : 'var(--g03)'}`,
                                background: form.avatar === em ? 'color-mix(in srgb, var(--acc) 12%, var(--g01))' : 'var(--g01)',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all .15s',
                              }}
                            >
                              {em}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
                        <div className="field">
                          <label className="label">Proveedor IA</label>
                          <select
                            className="input"
                            value={form.aiProvider.provider}
                            onChange={e => {
                              const prov = PROVIDERS.find(p => p.id === e.target.value)!;
                              setF('aiProvider', { provider: prov.id as Provider, model: prov.models[0] });
                            }}
                          >
                            {PROVIDERS.map(p => (
                              <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="field">
                          <label className="label">Modelo</label>
                          <select
                            className="input"
                            value={form.aiProvider.model}
                            onChange={e => setF('aiProvider', { ...form.aiProvider, model: e.target.value })}
                          >
                            {(PROVIDERS.find(p => p.id === form.aiProvider.provider)?.models ?? []).map(m => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="field" style={{ marginTop: 14 }}>
                        <label className="label">System Prompt</label>
                        <div style={{ position: 'relative' }}>
                          <textarea
                            className="input"
                            rows={4}
                            value={form.profile.systemPrompt}
                            onChange={e => setF('profile', { ...form.profile, systemPrompt: e.target.value })}
                            placeholder="Eres un asistente de ventas amigable y eficiente. Tu objetivo es..."
                            style={{ resize: 'vertical', fontFamily: 'var(--f-mono)', fontSize: 12 }}
                          />
                          <span style={{
                            position: 'absolute', bottom: 8, right: 12,
                            fontSize: 10, color: 'var(--g05)',
                          }}>
                            {form.profile.systemPrompt.length} chars
                          </span>
                        </div>
                      </div>

                      <div className="field" style={{ marginTop: 14 }}>
                        <label className="label">Personalidad</label>
                        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                          {PERSONALITIES.map(p => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setF('profile', { ...form.profile, personality: p.id })}
                              style={{
                                flex: 1, padding: '8px 10px',
                                borderRadius: 'var(--radius-sm)',
                                border: `1px solid ${form.profile.personality === p.id ? 'var(--acc)' : 'var(--g03)'}`,
                                background: form.profile.personality === p.id ? 'color-mix(in srgb, var(--acc) 12%, var(--g01))' : 'transparent',
                                color: form.profile.personality === p.id ? 'var(--acc)' : 'var(--g06)',
                                fontWeight: 600, fontSize: 12, cursor: 'pointer', transition: 'all .15s',
                              }}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
                        <div className="field">
                          <label className="label">Idioma</label>
                          <select
                            className="input"
                            value={form.profile.language}
                            onChange={e => setF('profile', { ...form.profile, language: e.target.value })}
                          >
                            {LANGUAGES.map(l => (
                              <option key={l.id} value={l.id}>{l.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="field" style={{ marginTop: 14 }}>
                        <label className="label">Contexto corporativo</label>
                        <textarea
                          className="input"
                          rows={3}
                          value={form.corporateContext}
                          onChange={e => setF('corporateContext', e.target.value)}
                          placeholder="Describe tu empresa, productos o servicios..."
                          style={{ resize: 'vertical' }}
                        />
                      </div>
                    </div>

                    {/* ─── Section 2: Canales ───────────────────────────────────── */}
                    <div className="card">
                      <SectionTitle>2. Canales</SectionTitle>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                        {CHANNELS.map(ch => {
                          const enabled = form.channels[ch.id] ?? false;
                          return (
                            <button
                              key={ch.id}
                              type="button"
                              onClick={() => setF('channels', { ...form.channels, [ch.id]: !enabled })}
                              style={{
                                padding: '12px 10px',
                                borderRadius: 'var(--radius)',
                                border: `1.5px solid ${enabled ? ch.color : 'var(--g03)'}`,
                                background: enabled ? ch.color + '12' : 'transparent',
                                cursor: 'pointer', textAlign: 'center',
                                transition: 'all .15s',
                              }}
                            >
                              <div style={{ fontSize: 22, marginBottom: 4 }}>{ch.emoji}</div>
                              <div style={{ fontSize: 11, fontWeight: 600, color: enabled ? ch.color : 'var(--g06)' }}>
                                {ch.label}
                              </div>
                              <div style={{
                                marginTop: 6, width: 20, height: 10, borderRadius: 5,
                                background: enabled ? ch.color : 'var(--g03)',
                                margin: '6px auto 0',
                                transition: 'background .15s',
                              }} />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* ─── Section 3: Skills / MCP ──────────────────────────────── */}
                    <div className="card">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <SectionTitle>3. Skills / MCP</SectionTitle>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className={`badge ${form.skills.length >= 8 ? 'badge-red' : 'badge-green'}`}>
                            {form.skills.length}/8
                          </span>
                          {form.skills.length >= 8 && (
                            <span style={{ fontSize: 11, color: 'var(--red)' }}>Máx. 8 skills</span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {SKILLS_GROUPS.map(group => (
                          <div key={group.id}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--g06)', marginBottom: 8 }}>
                              {group.icon} {group.name}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {group.skills.map(skill => {
                                const selected = form.skills.includes(skill.id);
                                const disabled = !selected && form.skills.length >= 8;
                                return (
                                  <button
                                    key={skill.id}
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => {
                                      if (selected) {
                                        setF('skills', form.skills.filter(s => s !== skill.id));
                                      } else if (!disabled) {
                                        setF('skills', [...form.skills, skill.id]);
                                      }
                                    }}
                                    style={{
                                      padding: '4px 12px',
                                      borderRadius: 20,
                                      border: `1px solid ${selected ? 'var(--acc)' : 'var(--g03)'}`,
                                      background: selected ? 'color-mix(in srgb, var(--acc) 15%, var(--g01))' : 'transparent',
                                      color: selected ? 'var(--acc)' : disabled ? 'var(--g04)' : 'var(--g06)',
                                      fontSize: 12, fontWeight: selected ? 600 : 400,
                                      cursor: disabled ? 'not-allowed' : 'pointer',
                                      transition: 'all .15s',
                                    }}
                                  >
                                    {skill.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ─── Section 4: Avanzado ──────────────────────────────────── */}
                    <div className="card">
                      <SectionTitle>4. Avanzado</SectionTitle>

                      <div className="field">
                        <label className="label">Zona horaria</label>
                        <select
                          className="input"
                          value={form.advanced.timezone}
                          onChange={e => setF('advanced', { ...form.advanced, timezone: e.target.value })}
                        >
                          {TIMEZONES.map(tz => (
                            <option key={tz} value={tz}>{tz}</option>
                          ))}
                        </select>
                      </div>

                      {/* Schedule */}
                      <div style={{ marginTop: 14 }}>
                        <ToggleRow
                          title="Horario de atención"
                          desc="Define en qué días y horario el agente responde automáticamente"
                          checked={form.advanced.scheduleEnabled}
                          onChange={v => setF('advanced', { ...form.advanced, scheduleEnabled: v })}
                        />
                        {form.advanced.scheduleEnabled && (
                          <div style={{ marginTop: 10, paddingLeft: 16, borderLeft: '2px solid var(--acc)' }}>
                            <div className="label" style={{ marginBottom: 8 }}>Días activos</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
                                <label key={d} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
                                  <input type="checkbox" defaultChecked={['Lun','Mar','Mié','Jue','Vie'].includes(d)} />
                                  {d}
                                </label>
                              ))}
                            </div>
                            <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'center' }}>
                              <div className="field" style={{ marginBottom: 0 }}>
                                <label className="label">Desde</label>
                                <input className="input" type="time" defaultValue="08:00" style={{ width: 110 }} />
                              </div>
                              <div className="field" style={{ marginBottom: 0 }}>
                                <label className="label">Hasta</label>
                                <input className="input" type="time" defaultValue="18:00" style={{ width: 110 }} />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Geofencing */}
                      <div style={{ marginTop: 14 }}>
                        <ToggleRow
                          title="Restricción geográfica"
                          desc="Limita las respuestas del agente a ciertos países"
                          checked={form.advanced.geofencingEnabled}
                          onChange={v => setF('advanced', { ...form.advanced, geofencingEnabled: v })}
                        />
                        {form.advanced.geofencingEnabled && (
                          <div style={{ marginTop: 10, paddingLeft: 16, borderLeft: '2px solid var(--acc)' }}>
                            <div className="label" style={{ marginBottom: 8 }}>Países permitidos</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {GEO_COUNTRIES.map(c => (
                                <span
                                  key={c}
                                  style={{
                                    padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                                    background: 'color-mix(in srgb, var(--acc) 12%, var(--g01))',
                                    color: 'var(--acc)', border: '1px solid var(--acc)',
                                    cursor: 'default',
                                  }}
                                >
                                  {c}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="field" style={{ marginTop: 14 }}>
                        <label className="label">Palabras clave de escalación</label>
                        <input
                          className="input"
                          value={form.advanced.escalationKeywords}
                          onChange={e => setF('advanced', { ...form.advanced, escalationKeywords: e.target.value })}
                          placeholder="hablar con agente, cancelar, queja, urgente"
                        />
                        <span style={{ fontSize: 11, color: 'var(--g05)', marginTop: 4, display: 'block' }}>
                          Separadas por comas
                        </span>
                      </div>

                      <div className="field" style={{ marginTop: 14 }}>
                        <label className="label">Mensaje de transferencia a humano</label>
                        <input
                          className="input"
                          value={form.advanced.humanHandoffMsg}
                          onChange={e => setF('advanced', { ...form.advanced, humanHandoffMsg: e.target.value })}
                          placeholder="En un momento te atiendo un agente humano."
                        />
                      </div>
                    </div>

                    {/* ─── Delete ───────────────────────────────────────────────── */}
                    {selectedId !== 'new' && (
                      <div style={{ paddingBottom: 32 }}>
                        {!deleteConfirm ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => { setDeleteConfirm(true); setDeleteErr(null); }}
                            >
                              Eliminar agente
                            </button>
                            {deleteErr && (
                              <span style={{ fontSize: 13, color: 'var(--red)' }}>{deleteErr}</span>
                            )}
                          </div>
                        ) : (
                          <div style={{
                            padding: '14px 16px',
                            border: '1px solid var(--red)',
                            borderRadius: 'var(--radius)',
                            background: 'color-mix(in srgb, var(--red) 6%, var(--g01))',
                            display: 'flex', flexDirection: 'column', gap: 12,
                          }}>
                            <div style={{ fontSize: 13, color: 'var(--g08)', fontWeight: 500 }}>
                              ¿Eliminar este agente? Esta acción no se puede deshacer.
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button className="btn btn-danger btn-sm" onClick={handleDelete}>
                                Sí, eliminar
                              </button>
                              <button className="btn btn-ghost btn-sm" onClick={() => setDeleteConfirm(false)}>
                                Cancelar
                              </button>
                            </div>
                            {deleteErr && (
                              <span style={{ fontSize: 12, color: 'var(--red)' }}>{deleteErr}</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Preview drawer */}
            {showPreview && (
              <PreviewDrawer agent={form} onClose={() => setShowPreview(false)} />
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(20px); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ── Inline ToggleRow (no import) ───────────────────────────────────────────────
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
