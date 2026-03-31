'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ── Types ──────────────────────────────────────────────────────────────────────
type Status = 'active' | 'inactive' | 'draft';

type AgentSummary = {
  _id: string;
  name: string;
  status: Status;
  avatar: string;
  channels: Record<string, boolean>;
  createdAt: string;
};

type AgentFull = AgentSummary & {
  webWidgetToken?: string;
  profile: {
    systemPrompt: string;
    personality: string;
    languages: string[];
    responseLength: string;
  };
  skills: string[];
  corporateContext: string;
  advanced: {
    timezone: string;
    scheduleEnabled: boolean;
    geofencingEnabled: boolean;
    escalationKeywords: string;
    humanHandoffMsg: string;
  };
  preChatForm: {
    enabled: boolean;
    fields: {
      name:  { enabled: boolean; required: boolean };
      email: { enabled: boolean; required: boolean };
      phone: { enabled: boolean; required: boolean };
    };
  };
  tokenLimits: {
    periodEnabled: boolean;
    period: 'day' | 'week' | 'month';
    periodLimit: number;
    convEnabled: boolean;
    convLimit: number;
  };
};

type FormState = Omit<AgentFull, '_id' | 'createdAt'>;

// ── Constants ─────────────────────────────────────────────────────────────────
const AVATARS = ['🤖', '💼', '🎧', '🏠', '📣', '📚', '🛒', '🌎', '🔬', '✨'];

const PERSONALITIES = [
  { id: 'young',        label: 'Joven' },
  { id: 'professional', label: 'Profesional' },
  { id: 'formal',       label: 'Formal' },
];

const LANG_OPTIONS = [
  { id: 'auto', label: '🌐 Auto (zona)' },
  { id: 'es',   label: '🇪🇸 Español' },
  { id: 'en',   label: '🇺🇸 Inglés' },
  { id: 'fr',   label: '🇫🇷 Francés' },
  { id: 'pt',   label: '🇧🇷 Portugués' },
  { id: 'de',   label: '🇩🇪 Alemán' },
  { id: 'it',   label: '🇮🇹 Italiano' },
];

const CHANNELS: { id: string; label: string; emoji: string; color: string }[] = [
  { id: 'whatsapp',    label: 'WhatsApp',   emoji: '💬', color: '#25D366' },
  { id: 'instagram',   label: 'Instagram',  emoji: '📸', color: '#E1306C' },
  { id: 'messenger',   label: 'Messenger',  emoji: '📘', color: '#0084FF' },
  { id: 'web',         label: 'Web Widget', emoji: '🌐', color: '#2CB978' },
  { id: 'woocommerce', label: 'WooCommerce',emoji: '🛒', color: '#7F54B3' },
  { id: 'shopify',     label: 'Shopify',    emoji: '🛍️', color: '#96BF48' },
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

const PERSONALITY_LABEL: Record<string, string> = {
  young: 'Joven y cercano',
  professional: 'Profesional y amigable',
  formal: 'Formal y corporativo',
};

const LANG_LABEL: Record<string, string> = {
  auto: 'Detección automática (zona)', es: 'Español', en: 'Inglés',
  fr: 'Francés', pt: 'Portugués', de: 'Alemán', it: 'Italiano',
};

const DEFAULT_FORM: FormState = {
  name: '',
  status: 'draft',
  avatar: '🤖',
  webWidgetToken: '',
  channels: { whatsapp: false, instagram: false, messenger: false, web: true, woocommerce: false, shopify: false },
  profile: { systemPrompt: '', personality: 'professional', languages: ['auto'], responseLength: 'standard' },
  skills: [],
  corporateContext: '',
  advanced: {
    timezone: 'America/Bogota', scheduleEnabled: false, geofencingEnabled: false,
    escalationKeywords: '', humanHandoffMsg: 'En un momento te atiendo un agente humano.',
  },
  preChatForm: {
    enabled: false,
    fields: {
      name:  { enabled: true,  required: true  },
      email: { enabled: true,  required: false },
      phone: { enabled: false, required: false },
    },
  },
  tokenLimits: {
    periodEnabled: false, period: 'month' as const, periodLimit: 100000,
    convEnabled: false, convLimit: 4000,
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

function compileContext(form: FormState): string {
  const parts: string[] = [];

  if (form.profile.systemPrompt.trim()) {
    parts.push(`## System Prompt\n${form.profile.systemPrompt.trim()}`);
  }

  parts.push(`## Personalidad\nTono: ${PERSONALITY_LABEL[form.profile.personality] ?? form.profile.personality}`);

  if (form.profile.languages.length > 0) {
    parts.push(`## Idiomas\n${form.profile.languages.map(l => LANG_LABEL[l] ?? l).join(', ')}`);
  }

  if (form.skills.length > 0) {
    const allSkills = SKILLS_GROUPS.flatMap(g => g.skills);
    const selected = form.skills.map(id => allSkills.find(s => s.id === id)?.label ?? id);
    parts.push(`## Skills Activos\n${selected.map(s => `• ${s}`).join('\n')}`);
  }

  if (form.corporateContext.trim()) {
    parts.push(`## Contexto Corporativo\n${form.corporateContext.trim()}`);
  }

  if (form.advanced.escalationKeywords.trim()) {
    parts.push(`## Escalación\nKeywords: ${form.advanced.escalationKeywords}\nMensaje de transferencia: ${form.advanced.humanHandoffMsg}`);
  }

  return parts.length > 0 ? parts.join('\n\n') : '(Sin configuración definida aún)';
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
type PreviewMessage = { role: 'user' | 'assistant'; content: string; meta?: string };

function PreviewDrawer({ agent, onClose }: { agent: FormState; onClose: () => void }) {
  const greeting = agent.profile.personality === 'young'
    ? `Hola. Soy ${agent.name || 'tu asistente'}. En que te puedo ayudar hoy?`
    : agent.profile.personality === 'formal'
    ? `Buenos dias. Soy ${agent.name || 'su asistente'}. En que le puedo asistir?`
    : `Hola, soy ${agent.name || 'tu asistente'}. En que puedo ayudarte?`;

  const [messages, setMessages] = useState<PreviewMessage[]>([{ role: 'assistant', content: greeting }]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  function summarizeAttempts(attempts: any[]) {
    if (!Array.isArray(attempts) || attempts.length === 0) return '';
    const failed = attempts.filter((a) => a?.status === 'error');
    if (failed.length === 0) return '';
    const byType: Record<string, number> = {};
    for (const f of failed) {
      const t = String(f?.errorType || 'unknown');
      byType[t] = (byType[t] || 0) + 1;
    }
    const parts = Object.entries(byType).map(([k, v]) => `${k}:${v}`);
    return `fallos(${parts.join(', ')})`;
  }

  useEffect(() => {
    setMessages([{ role: 'assistant', content: greeting }]);
    setInput('');
    setSending(false);
  }, [
    greeting,
    agent.name,
    agent.avatar,
    agent.profile.systemPrompt,
    agent.profile.personality,
    (agent.profile.languages || []).join('|'),
    (agent.skills || []).join('|'),
    agent.corporateContext,
  ]);

  async function sendPreview() {
    const text = input.trim();
    if (!text || sending) return;

    const nextMessages = [...messages, { role: 'user', content: text } as PreviewMessage];
    setMessages(nextMessages);
    setInput('');
    setSending(true);

    try {
      const history = nextMessages
        .slice(0, -1)
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/agents/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent, message: text, history }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'No fue posible generar la respuesta');
      }

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.reply || 'No hubo respuesta del modelo.',
          meta: `${data.provider || 'n/a'} / ${data.model || 'n/a'}${summarizeAttempts(data.attempts) ? ` · ${summarizeAttempts(data.attempts)}` : ''}`,
        },
      ]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Error en preview: ${err?.message || 'fallo desconocido'}`,
          meta: 'error',
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{
      width: 340, flexShrink: 0,
      borderLeft: '1px solid var(--g03)',
      display: 'flex', flexDirection: 'column',
      background: 'var(--g00)',
      animation: 'slideIn .2s ease',
    }}>
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
              Preview IA real
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--g05)', fontSize: 18, lineHeight: 1 }}
        >
          x
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.map((m, idx) => (
          <div key={`${m.role}-${idx}`} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              background: m.role === 'user' ? 'var(--acc)' : 'var(--g02)',
              color: m.role === 'user' ? '#fff' : 'var(--g08)',
              borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              padding: '8px 14px', fontSize: 13, maxWidth: '90%',
              whiteSpace: 'pre-wrap',
            }}>
              {m.content}
              {m.meta && (
                <div style={{ marginTop: 6, fontSize: 10, opacity: 0.7 }}>
                  {m.meta}
                </div>
              )}
            </div>
          </div>
        ))}
        {sending && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              background: 'var(--g02)', color: 'var(--g05)',
              borderRadius: '16px 16px 16px 4px',
              padding: '8px 14px', fontSize: 12,
            }}>
              Generando respuesta...
            </div>
          </div>
        )}
      </div>

      <div style={{
        padding: '12px 16px', borderTop: '1px solid var(--g03)',
        display: 'flex', gap: 8, alignItems: 'center',
      }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendPreview();
            }
          }}
          placeholder="Prueba este agente con IA real"
          style={{
            flex: 1, padding: '8px 14px',
            border: '1px solid var(--g03)', borderRadius: 20,
            background: 'var(--g01)', color: 'var(--g07)',
            fontSize: 13,
          }}
        />
        <button
          onClick={sendPreview}
          disabled={sending || !input.trim()}
          style={{
            width: 34, height: 34, borderRadius: '50%',
            background: sending || !input.trim() ? 'var(--g03)' : 'var(--acc)',
            color: sending || !input.trim() ? 'var(--g05)' : '#fff',
            border: 'none',
            cursor: sending || !input.trim() ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
          }}
        >
          {'>'}
        </button>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────── ─────────────────────────────────────────────────────────────────
export default function AgentsPage() {
  const router = useRouter();
  const [agents, setAgents]             = useState<AgentSummary[]>([]);
  const [loading, setLoading]           = useState(true);
  const [selectedId, setSelectedId]     = useState<string | 'new' | null>(null);
  const [form, setForm]                 = useState<FormState>(DEFAULT_FORM);
  const [formLoading, setFormLoading]   = useState(false);
  const [saving, setSaving]             = useState(false);
  const [saveErr, setSaveErr]           = useState<string | null>(null);
  const [saveOk, setSaveOk]             = useState(false);
  const [showPreview, setShowPreview]   = useState(false);
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [embedApiKey, setEmbedApiKey]   = useState('');
  const [embedCopied, setEmbedCopied] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteErr, setDeleteErr]       = useState<string | null>(null);
  // Mobile: 'list' shows left panel, 'detail' shows right panel
  const [mobileView, setMobileView]     = useState<'list' | 'detail'>('list');

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

  useEffect(() => {
    if (!showEmbedModal || embedApiKey) return;
    fetch('/api/account')
      .then(r => r.json())
      .then(d => {
        if (d?.api_key) setEmbedApiKey(d.api_key);
      })
      .catch(() => {});
  }, [showEmbedModal, embedApiKey]);

  useEffect(() => {
    if (!showEmbedModal) setEmbedCopied(false);
  }, [showEmbedModal]);

  async function selectAgent(id: string) {
    setSelectedId(id);
    setMobileView('detail');
    setShowPreview(false);
    setShowEmbedModal(false);
    setEmbedCopied(false);
    setDeleteConfirm(false);
    setDeleteErr(null);
    setSaveErr(null);
    setSaveOk(false);
    setFormLoading(true);
    try {
      const r = await fetch(`/api/agents/${id}`);
      const data = await r.json();
      if (!data.error) {
        const { _id, createdAt, aiProvider: _ai, ...rest } = data as any;
        // Backward compat: language → languages
        if (rest.profile && !Array.isArray(rest.profile.languages)) {
          rest.profile.languages = rest.profile.language ? [rest.profile.language] : ['auto'];
        }
        // Backward compat: ensure preChatForm and tokenLimits exist
        if (!rest.preChatForm) rest.preChatForm = DEFAULT_FORM.preChatForm;
        if (!rest.tokenLimits) rest.tokenLimits = DEFAULT_FORM.tokenLimits;
        setForm(rest);
      }
    } catch {}
    setFormLoading(false);
  }

  function newAgent() {
    setSelectedId('new');
    setForm({ ...DEFAULT_FORM });
    setMobileView('detail');
    setShowPreview(false);
    setShowEmbedModal(false);
    setEmbedCopied(false);
    setDeleteConfirm(false);
    setDeleteErr(null);
    setSaveErr(null);
    setSaveOk(false);
  }

  function goBackToList() {
    setMobileView('list');
    setSelectedId(null);
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
          const { _id, createdAt, aiProvider: _ai, ...rest } = data as any;
          setSelectedId(data._id);
          setForm(prev => ({ ...prev, ...rest }));
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
        setMobileView('list');
        await loadAgents();
      }
    } catch {
      setDeleteErr('Error de red.');
      setDeleteConfirm(false);
    }
  }

  const activeCount = agents.filter(a => a.status === 'active').length;
  const canEmbed = Boolean(selectedId && selectedId !== 'new' && form.webWidgetToken && embedApiKey);
  const embedScript = canEmbed
    ? `<script src="https://dashboard.orqo.io/widget.js" data-key="${embedApiKey}" data-agent-id="${selectedId}" data-agent-token="${form.webWidgetToken}" async><\\/script>`
    : '';

  return (
    <div className="agents-shell">

      {/* ── Left Panel (Agent list) ───────────────────────────────────────── */}
      <div className={`agents-list-panel${mobileView === 'detail' ? ' agents-mobile-hidden' : ''}`}>
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

      {/* ── Right Panel (Config + Preview) ───────────────────────────────── */}
      <div className={`agents-detail-panel${mobileView === 'list' && selectedId === null ? ' agents-mobile-hidden' : ''}`}>
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
                    padding: '12px 16px', borderBottom: '1px solid var(--g03)',
                    display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                    background: 'var(--g00)', position: 'sticky', top: 0, zIndex: 10,
                  }}>
                    {/* Back button - mobile only */}
                    <button
                      className="agents-back-btn btn btn-ghost btn-sm"
                      onClick={goBackToList}
                    >
                      ← Agentes
                    </button>
                    <div style={{ fontSize: 24 }}>{form.avatar}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--f-disp)', fontWeight: 700, fontSize: 15, color: 'var(--g08)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {form.name || 'Nuevo agente'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--g05)' }}>
                        {selectedId === 'new' ? 'Sin guardar' : `ID: ${selectedId}`}
                      </div>
                    </div>
                    <select
                      className="input"
                      value={form.status}
                      onChange={e => setF('status', e.target.value as Status)}
                      style={{ width: 120, fontSize: 13 }}
                    >
                      <option value="active">Activo</option>
                      <option value="inactive">Inactivo</option>
                      <option value="draft">Borrador</option>
                    </select>
                    <button
                      className="btn btn-ghost btn-sm agents-preview-btn"
                      onClick={() => setShowPreview(v => !v)}
                    >
                      {showPreview ? 'Cerrar preview' : 'Preview'}
                    </button>
                    {form.channels.web && form.webWidgetToken && selectedId !== 'new' && (
                      <button
                        className="btn btn-ghost btn-sm agents-preview-btn"
                        onClick={() => setShowEmbedModal(true)}
                      >
                        Script Widget
                      </button>
                    )}
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
                      margin: '12px 16px 0', padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: saveErr ? 'color-mix(in srgb, var(--red) 10%, var(--g01))' : 'color-mix(in srgb, var(--acc) 10%, var(--g01))',
                      color: saveErr ? 'var(--red)' : 'var(--acc)',
                      fontSize: 13, fontWeight: 500,
                      border: `1px solid ${saveErr ? 'var(--red)' : 'var(--acc)'}`,
                    }}>
                      {saveErr ?? 'Agente guardado correctamente.'}
                    </div>
                  )}

                  <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

                    {/* ─── Section 1: Identidad ─────────────────────────────── */}
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

                      {/* AI model — transversal notice */}
                      <div style={{
                        marginTop: 14, padding: '10px 14px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'color-mix(in srgb, var(--acc) 6%, var(--g01))',
                        border: '1px solid color-mix(in srgb, var(--acc) 30%, var(--g03))',
                        display: 'flex', alignItems: 'center', gap: 10,
                      }}>
                        <span style={{ fontSize: 16 }}>⚙️</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--g07)' }}>
                            Modelo IA — configuración global
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--g05)', marginTop: 2 }}>
                            El proveedor y modelo se definen en Orquestación IA y aplican a todos los agentes.
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => router.push('/dashboard/settings/orchestration')}
                          style={{ fontSize: 11, flexShrink: 0 }}
                        >
                          Configurar →
                        </button>
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

                      {/* Multi-language with auto-detect */}
                      <div className="field" style={{ marginTop: 14 }}>
                        <label className="label">Idiomas de respuesta</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                          {LANG_OPTIONS.map(lang => {
                            const selected = form.profile.languages.includes(lang.id);
                            return (
                              <button
                                key={lang.id}
                                type="button"
                                onClick={() => {
                                  const langs = form.profile.languages;
                                  setF('profile', {
                                    ...form.profile,
                                    languages: selected
                                      ? langs.filter(l => l !== lang.id)
                                      : [...langs, lang.id],
                                  });
                                }}
                                style={{
                                  padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                                  border: `1px solid ${selected ? 'var(--acc)' : 'var(--g03)'}`,
                                  background: selected ? 'color-mix(in srgb, var(--acc) 15%, var(--g01))' : 'transparent',
                                  color: selected ? 'var(--acc)' : 'var(--g06)',
                                  cursor: 'pointer', transition: 'all .15s',
                                }}
                              >
                                {lang.label}
                              </button>
                            );
                          })}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--g05)', marginTop: 6 }}>
                          <strong>Auto</strong> detecta el idioma según la zona geográfica del usuario. Puedes combinar Auto con idiomas específicos.
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

                    {/* ─── Section 2: Formulario Pre-Chat ──────────────────────────── */}
                    <div className="card">
                      <SectionTitle>2. Formulario Pre-Chat</SectionTitle>
                      <ToggleRow
                        title="Activar formulario pre-chat"
                        desc="Muestra un formulario antes de iniciar la conversación"
                        checked={form.preChatForm.enabled}
                        onChange={v => setF('preChatForm', { ...form.preChatForm, enabled: v })}
                      />
                      {form.preChatForm.enabled && (
                        <div style={{ marginTop: 12, paddingLeft: 16, borderLeft: '2px solid var(--acc)' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px', gap: 8, marginBottom: 8, fontSize: 11, fontWeight: 700, color: 'var(--g05)', textTransform: 'uppercase' }}>
                            <span>Campo</span><span style={{ textAlign: 'center' }}>Activado</span><span style={{ textAlign: 'center' }}>Requerido</span>
                          </div>
                          {([
                            { id: 'name'  as const, label: 'Nombre',   icon: '👤' },
                            { id: 'email' as const, label: 'Correo',   icon: '✉️' },
                            { id: 'phone' as const, label: 'Teléfono', icon: '📱' },
                          ]).map(field => {
                            const cfg = form.preChatForm.fields[field.id];
                            return (
                              <div key={field.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px', gap: 8, alignItems: 'center', padding: '8px 0', borderTop: '1px solid var(--g02)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontSize: 15 }}>{field.icon}</span>
                                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--g07)' }}>{field.label}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                  <label className="toggle">
                                    <input type="checkbox" checked={cfg.enabled} onChange={e => setF('preChatForm', { ...form.preChatForm, fields: { ...form.preChatForm.fields, [field.id]: { ...cfg, enabled: e.target.checked } } })}/>
                                    <span className="toggle-track"/><span className="toggle-thumb"/>
                                  </label>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                  <label className="toggle" style={{ opacity: cfg.enabled ? 1 : 0.35 }}>
                                    <input type="checkbox" checked={cfg.required} disabled={!cfg.enabled} onChange={e => setF('preChatForm', { ...form.preChatForm, fields: { ...form.preChatForm.fields, [field.id]: { ...cfg, required: e.target.checked } } })}/>
                                    <span className="toggle-track"/><span className="toggle-thumb"/>
                                  </label>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* ─── Section 3: Límites de Tokens ────────────────────────── */}
                    <div className="card">
                      <SectionTitle>3. Límites de Tokens</SectionTitle>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <ToggleRow
                          title="Límite por período"
                          desc="Restringe el total de tokens de este agente por período"
                          checked={form.tokenLimits.periodEnabled}
                          onChange={v => setF('tokenLimits', { ...form.tokenLimits, periodEnabled: v })}
                        />
                        {form.tokenLimits.periodEnabled && (
                          <div style={{ paddingLeft: 16, borderLeft: '2px solid var(--acc)', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                            <div className="field" style={{ marginBottom: 0 }}>
                              <label className="label">Período</label>
                              <select className="input" value={form.tokenLimits.period} onChange={e => setF('tokenLimits', { ...form.tokenLimits, period: e.target.value as 'day'|'week'|'month' })} style={{ minWidth: 100 }}>
                                <option value="day">Día</option><option value="week">Semana</option><option value="month">Mes</option>
                              </select>
                            </div>
                            <div className="field" style={{ marginBottom: 0 }}>
                              <label className="label">Límite</label>
                              <input className="input" type="number" min={1000} step={1000} value={form.tokenLimits.periodLimit} onChange={e => setF('tokenLimits', { ...form.tokenLimits, periodLimit: Number(e.target.value) })} style={{ maxWidth: 140 }}/>
                            </div>
                          </div>
                        )}
                        <ToggleRow
                          title="Límite por conversación"
                          desc="Limita los tokens de cada conversación individual"
                          checked={form.tokenLimits.convEnabled}
                          onChange={v => setF('tokenLimits', { ...form.tokenLimits, convEnabled: v })}
                        />
                        {form.tokenLimits.convEnabled && (
                          <div style={{ paddingLeft: 16, borderLeft: '2px solid var(--acc)' }}>
                            <div className="field" style={{ marginBottom: 0 }}>
                              <label className="label">Tokens por conversación</label>
                              <input className="input" type="number" min={500} step={500} value={form.tokenLimits.convLimit} onChange={e => setF('tokenLimits', { ...form.tokenLimits, convLimit: Number(e.target.value) })} style={{ maxWidth: 140 }}/>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ─── Section 4: Canales ───────────────────────────────── */}
                    <div className="card">
                      <SectionTitle>4. Canales</SectionTitle>
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
                      {(form.channels.web ?? false) && (
                        <div style={{
                          marginTop: 14,
                          padding: '12px 14px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--g03)',
                          background: 'var(--g01)',
                        }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--g07)', marginBottom: 6 }}>
                            Vinculacion Web Widget
                          </div>
                          {!form.webWidgetToken ? (
                            <div style={{ fontSize: 12, color: 'var(--g05)' }}>
                              Guarda el agente para generar su token de embebido.
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 11, color: 'var(--g05)' }}>Token activo</div>
                                <div style={{ fontSize: 12, color: 'var(--g06)', fontFamily: 'var(--f-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {form.webWidgetToken}
                                </div>
                              </div>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => setShowEmbedModal(true)}
                              >
                                Script de embebido
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* ─── Section 5: Skills / MCP ──────────────────────────── */}
                    <div className="card">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <SectionTitle>5. Skills / MCP</SectionTitle>
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

                    {/* ─── Section 6: Avanzado ──────────────────────────────── */}
                    <div className="card">
                      <SectionTitle>6. Avanzado</SectionTitle>

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

                    {/* ─── Section 7: Contexto Generado ────────────────────── */}
                    <div className="card">
                      <SectionTitle>7. Contexto Generado</SectionTitle>
                      <div style={{ fontSize: 12, color: 'var(--g05)', marginBottom: 12 }}>
                        Vista previa del contexto compilado que recibirá el modelo de IA al procesar mensajes de este agente.
                      </div>
                      <div style={{
                        background: 'var(--g01)', borderRadius: 8,
                        padding: '14px 16px',
                        fontFamily: 'var(--f-mono)', fontSize: 12,
                        color: 'var(--g07)', whiteSpace: 'pre-wrap',
                        lineHeight: 1.7, maxHeight: 360, overflowY: 'auto',
                        border: '1px solid var(--g03)',
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        cursor: 'default',
                      }}>
                        {compileContext(form)}
                      </div>
                    </div>

                    {/* ─── Delete ───────────────────────────────────────────── */}
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

      {showEmbedModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.58)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 16,
        }}>
          <div style={{
            width: 'min(760px, 100%)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--g03)',
            background: 'var(--g00)',
            boxShadow: '0 18px 60px rgba(0,0,0,0.45)',
          }}>
            <div style={{
              padding: '14px 16px',
              borderBottom: '1px solid var(--g03)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontFamily: 'var(--f-disp)', fontSize: 16, fontWeight: 700, color: 'var(--g08)' }}>
                  Script de embebido Web Widget
                </div>
                <div style={{ fontSize: 12, color: 'var(--g05)' }}>
                  Vinculado al agente seleccionado y su token web.
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowEmbedModal(false)}>Cerrar</button>
            </div>
            <div style={{ padding: 16 }}>
              {canEmbed ? (
                <>
                  <div style={{ fontSize: 12, color: 'var(--g05)', marginBottom: 8 }}>
                    Copia y pega este snippet antes de cerrar el {'</body>'} en tu pagina:
                  </div>
                  <textarea
                    readOnly
                    value={embedScript}
                    style={{
                      width: '100%',
                      minHeight: 110,
                      resize: 'vertical',
                      background: 'var(--g01)',
                      color: 'var(--g07)',
                      border: '1px solid var(--g03)',
                      borderRadius: 'var(--radius-sm)',
                      fontFamily: 'var(--f-mono)',
                      fontSize: 12,
                      lineHeight: 1.5,
                      padding: 12,
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 11, color: 'var(--g05)' }}>
                      Agente: <span style={{ color: 'var(--g07)' }}>{form.name || 'Sin nombre'}</span>
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(embedScript);
                          setEmbedCopied(true);
                          setTimeout(() => setEmbedCopied(false), 2200);
                        } catch {}
                      }}
                    >
                      {embedCopied ? 'Copiado ✓' : 'Copiar script'}
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--g05)' }}>
                  Guarda el agente (con canal Web Widget activo) para generar token, y verifica que la API key de cuenta este disponible.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .agents-shell {
          display: flex;
          height: calc(100vh - 60px);
          overflow: hidden;
        }
        .agents-list-panel {
          width: 240px;
          flex-shrink: 0;
          border-right: 1px solid var(--g03);
          display: flex;
          flex-direction: column;
          background: var(--g00);
        }
        .agents-detail-panel {
          flex: 1;
          display: flex;
          overflow: hidden;
          min-width: 0;
        }
        .agents-back-btn {
          display: none;
        }
        .agents-preview-btn {
          display: inline-flex;
        }
        @keyframes slideIn {
          from { transform: translateX(20px); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @media (max-width: 767px) {
          .agents-shell {
            position: relative;
          }
          .agents-list-panel {
            width: 100%;
            position: absolute;
            inset: 0;
            z-index: 1;
          }
          .agents-list-panel.agents-mobile-hidden {
            display: none;
          }
          .agents-detail-panel {
            width: 100%;
            position: absolute;
            inset: 0;
            z-index: 2;
            flex-direction: column;
          }
          .agents-detail-panel.agents-mobile-hidden {
            display: none;
          }
          .agents-back-btn {
            display: inline-flex !important;
          }
          .agents-preview-btn {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

// ── Inline ToggleRow ───────────────────────────────────────────────────────────
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
