'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

// ── Types ────────────────────────────────────────────────────────────────────
type Provider = 'google' | 'openai' | 'grok' | 'anthropic';

const PROVIDERS: { id: Provider; name: string; icon: string; models: string[] }[] = [
  {
    id: 'google', name: 'Google', icon: '◉',
    models: ['gemini-2.0-flash', 'gemini-2.0-pro', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  },
  {
    id: 'openai', name: 'OpenAI', icon: '◆',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  },
  {
    id: 'grok', name: 'Grok (xAI)', icon: '✕',
    models: ['grok-3', 'grok-3-mini', 'grok-2'],
  },
  {
    id: 'anthropic', name: 'Anthropic', icon: '◭',
    models: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5'],
  },
];

const PROFILES = [
  { id: 'sales',     name: 'Agente de ventas',    icon: '💼', desc: 'Orientado a conversión y cierre de negocios' },
  { id: 'support',   name: 'Soporte técnico',      icon: '🎧', desc: 'Resolución de problemas y atención al cliente' },
  { id: 'host',      name: 'Anfitrión digital',    icon: '🏠', desc: 'Gestión de alojamientos y reservas' },
  { id: 'marketing', name: 'Asesor de marketing',  icon: '📣', desc: 'Estrategia y captación de clientes' },
  { id: 'info',      name: 'Informativo',          icon: '📚', desc: 'Responde consultas y provee información general' },
];

const PERSONALITIES = [
  { id: 'young',        label: 'Joven · Flexible · Cercano',              desc: 'Usa lenguaje casual, emojis y tono amigable' },
  { id: 'professional', label: 'Profesional · Claro · Formal',            desc: 'Lenguaje cuidado, directo y respetuoso' },
  { id: 'strict',       label: 'Formal · Estricto · Sin coloquialismos',  desc: 'Lenguaje corporativo, sin informalidades ni abreviaciones' },
];

const SKILLS_GROUPS = [
  {
    id: 'ventas', name: 'Ventas', icon: '💼',
    skills: [
      { id: 'leads',     label: 'Buscar leads' },
      { id: 'convert',   label: 'Convertir leads en clientes' },
      { id: 'escalate',  label: 'Escalar a agente humano' },
      { id: 'consult',   label: 'Agendar consulta' },
      { id: 'appt',      label: 'Agendar cita' },
      { id: 'messages',  label: 'Recoger mensajes' },
      { id: 'prices',    label: 'Manejar precios' },
      { id: 'inventory', label: 'Manejar inventario' },
      { id: 'star',      label: 'Vendedor estrella' },
    ],
  },
  {
    id: 'soporte', name: 'Soporte', icon: '🎧',
    skills: [
      { id: 'advisor',   label: 'Asesor de soporte' },
      { id: 'solutions', label: 'Sugerir soluciones' },
      { id: 'technical', label: 'Respuestas técnicas detalladas' },
      { id: 'trainer',   label: 'Capacitador' },
    ],
  },
  {
    id: 'multiidioma', name: 'Multi-idioma', icon: '🌎',
    skills: [
      { id: 'multilang', label: 'Asesor multi-idioma' },
      { id: 'translate', label: 'Traducción en tiempo real' },
      { id: 'locale',    label: 'Adaptación cultural y local' },
    ],
  },
  {
    id: 'anfitrion', name: 'Anfitrión Digital', icon: '🏠',
    skills: [
      { id: 'reservas',        label: 'Captura de reservas' },
      { id: 'disponibilidad',  label: 'Consultar disponibilidad' },
      { id: 'checkin',         label: 'Guía de check-in' },
      { id: 'manual',          label: 'Manual del inmueble' },
      { id: 'reglas',          label: 'Reglas del inmueble' },
    ],
  },
  {
    id: 'ecommerce', name: 'E-commerce', icon: '🛒',
    skills: [
      { id: 'cart',     label: 'Asistir en el carrito de compras' },
      { id: 'returns',  label: 'Gestionar devoluciones' },
      { id: 'tracking', label: 'Rastrear pedidos' },
      { id: 'upsell',   label: 'Upsell & cross-sell' },
      { id: 'catalog',  label: 'Presentar catálogo de productos' },
    ],
  },
  {
    id: 'educacion', name: 'Educación & Contenido', icon: '📚',
    skills: [
      { id: 'faq',       label: 'Responder preguntas frecuentes' },
      { id: 'quiz',      label: 'Generar quizzes' },
      { id: 'summarize', label: 'Resumir documentos' },
      { id: 'explain',   label: 'Explicar conceptos complejos' },
      { id: 'onboard',   label: 'Onboarding de nuevos usuarios' },
    ],
  },
];

const NON_NEGOTIABLE_RULES = [
  'No revelar información interna ni confidencial del negocio.',
  'No hacerse pasar por un humano si el usuario lo pregunta directamente.',
  'No realizar transacciones financieras sin confirmación explícita.',
  'No recopilar datos sensibles sin consentimiento del usuario.',
  'Siempre derivar emergencias a servicios de ayuda humana.',
];

// ── Session timeout — 5 min inactividad ─────────────────────────────────────
function useSessionTimeout() {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const TIMEOUT = 5 * 60 * 1000;

  const reset = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
      router.push('/login?reason=timeout');
    }, TIMEOUT);
  }, [router]);

  useEffect(() => {
    reset();
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'] as const;
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    return () => {
      if (timer.current) clearTimeout(timer.current);
      events.forEach(e => window.removeEventListener(e, reset));
    };
  }, [reset]);
}

// ── Sub-components ───────────────────────────────────────────────────────────
function ToggleRow({
  title, desc, checked, onChange,
}: { title: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="toggle-row">
      <div className="toggle-info">
        <div className="toggle-title">{title}</div>
        {desc && <div className="toggle-desc">{desc}</div>}
      </div>
      <label className="toggle">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
        <span className="toggle-track" />
        <span className="toggle-thumb" />
      </label>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: 'var(--f-disp)', fontWeight: 700, fontSize: 16, color: 'var(--g08)', marginBottom: 14 }}>
      {children}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function AgentsPage() {
  useSessionTimeout();

  // Providers
  const [activeProvider, setActiveProvider] = useState<Provider>('google');
  const [providers, setProviders] = useState<Record<Provider, { apiKey: string; model: string; enabled: boolean }>>({
    google:    { apiKey: '', model: 'gemini-2.0-flash', enabled: false },
    openai:    { apiKey: '', model: 'gpt-4o',           enabled: false },
    grok:      { apiKey: '', model: 'grok-3',           enabled: false },
    anthropic: { apiKey: '', model: 'claude-sonnet-4-6', enabled: false },
  });
  const [showKey, setShowKey] = useState<Record<Provider, boolean>>({
    google: false, openai: false, grok: false, anthropic: false,
  });

  // Token limits
  const [tokenPeriodEnabled, setTokenPeriodEnabled] = useState(false);
  const [tokenPeriod, setTokenPeriod] = useState<'day' | 'week' | 'month'>('month');
  const [tokenPeriodLimit, setTokenPeriodLimit] = useState('100000');
  const [tokenConvEnabled, setTokenConvEnabled] = useState(false);
  const [tokenConvLimit, setTokenConvLimit] = useState('4000');

  // Multi-model
  const [multiModel, setMultiModel] = useState(false);
  const [balancer, setBalancer] = useState<'failover' | 'roundrobin'>('failover');

  // Pre-chat form
  const [preChatFields, setPreChatFields] = useState({
    email: { enabled: true,  required: true  },
    name:  { enabled: true,  required: false },
    phone: { enabled: false, required: false },
  });
  const [preChatSkip, setPreChatSkip] = useState(false);

  // Message limit
  const [msgLimitEnabled, setMsgLimitEnabled] = useState(false);
  const [msgLimit, setMsgLimit] = useState('20');

  // Profile & personality
  const [profile, setProfile] = useState('sales');
  const [personality, setPersonality] = useState('professional');

  // Skills
  const [skills, setSkills] = useState<Record<string, boolean>>({});
  const [skillsError, setSkillsError] = useState(false);

  // Md preview
  const [showMd, setShowMd] = useState(false);

  // Context
  const [corporateContext, setCorporateContext]   = useState('');
  const [pageContextEnabled, setPageContextEnabled] = useState(false);
  const [pageContextUrl, setPageContextUrl]       = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [extraRules, setExtraRules]               = useState('');

  // Geolocation
  const [geoEnabled, setGeoEnabled] = useState(false);

  // UI
  const [saved, setSaved] = useState(false);

  function updateProvider(p: Provider, field: string, value: string | boolean) {
    setProviders(prev => ({ ...prev, [p]: { ...prev[p], [field]: value } }));
  }

  function updatePreChat(
    field: keyof typeof preChatFields,
    key: 'enabled' | 'required',
    value: boolean,
  ) {
    setPreChatFields(prev => ({ ...prev, [field]: { ...prev[field], [key]: value } }));
  }

  const MAX_SKILLS = 8;

  function toggleSkill(id: string) {
    setSkills(prev => {
      const isOn = prev[id];
      if (!isOn) {
        const currentCount = Object.values(prev).filter(Boolean).length;
        if (currentCount >= MAX_SKILLS) {
          setSkillsError(true);
          setTimeout(() => setSkillsError(false), 2500);
          return prev;
        }
      }
      return { ...prev, [id]: !isOn };
    });
  }

  // Auto-select default skills for a profile (clears existing)
  const PROFILE_SKILLS: Record<string, string[]> = {
    sales:     ['leads', 'convert', 'escalate', 'consult', 'appt', 'prices', 'inventory', 'star'],
    support:   ['advisor', 'solutions', 'technical', 'trainer', 'faq', 'explain', 'escalate', 'summarize'],
    host:      ['reservas', 'disponibilidad', 'checkin', 'manual', 'reglas', 'appt', 'messages', 'multilang'],
    marketing: ['leads', 'convert', 'upsell', 'catalog', 'faq', 'multilang', 'star', 'explain'],
    info:      ['faq', 'explain', 'summarize', 'solutions', 'advisor', 'multilang', 'locale', 'quiz'],
  };

  function selectProfile(id: string) {
    setProfile(id);
    const defaults = PROFILE_SKILLS[id] ?? [];
    const newSkills: Record<string, boolean> = {};
    defaults.slice(0, MAX_SKILLS).forEach(s => { newSkills[s] = true; });
    setSkills(newSkills);
    setSkillsError(false);
  }

  // Generate agent markdown preview
  function generateMd(): string {
    const enabledProvs = PROVIDERS.filter(p => providers[p.id].enabled);
    const prof = PROFILES.find(p => p.id === profile);
    const pers = PERSONALITIES.find(p => p.id === personality);
    const activeSkills = SKILLS_GROUPS.flatMap(g =>
      g.skills.filter(s => skills[s.id]).map(s => `- ${s.label}`)
    );
    const lines = [
      `# Agente ORQO — ${prof?.name ?? '—'}`,
      ``,
      `## Modelos activos`,
      ...(enabledProvs.length
        ? enabledProvs.map(p => `- **${p.name}:** ${providers[p.id].model}`)
        : ['- Sin proveedor activo']),
      ``,
      `## Orquestación`,
      multiModel ? `- Modo: ${balancer === 'failover' ? 'Failover' : 'Round-robin'}` : '- Un único modelo',
      ``,
      `## Personalidad`,
      `${pers?.label ?? '—'} — ${pers?.desc ?? ''}`,
      ``,
      `## Skills activos`,
      ...(activeSkills.length ? activeSkills : ['- Ninguno seleccionado']),
      ``,
      `## Límites`,
      tokenPeriodEnabled ? `- Tokens por ${tokenPeriod === 'day' ? 'día' : tokenPeriod === 'week' ? 'semana' : 'mes'}: ${Number(tokenPeriodLimit).toLocaleString()}` : '',
      tokenConvEnabled ? `- Tokens por conversación: ${Number(tokenConvLimit).toLocaleString()}` : '',
      msgLimitEnabled ? `- Mensajes por conversación: ${msgLimit}` : '',
      ``,
      `## Reglas no negociables`,
      ...NON_NEGOTIABLE_RULES.map(r => `- 🔒 ${r}`),
      ...(extraRules.trim() ? extraRules.split('\n').filter(Boolean).map(r => `- 🔒 ${r}`) : []),
      ``,
      `## Contexto corporativo`,
      corporateContext || '_(sin definir)_',
      ``,
      `## Instrucciones personalizadas`,
      customInstructions || '_(ninguna)_',
      geoEnabled ? '\n## Geolocalización\n- Activa' : '',
    ];
    return lines.filter(l => l !== undefined).join('\n');
  }

  async function save() {
    // Frontend-only for now
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const pCurrent = providers[activeProvider];
  const currentProviderMeta = PROVIDERS.find(p => p.id === activeProvider)!;

  return (
    <div className="dash-content">
      <div className="page-header">
        <h1 className="page-title">Agente & Modelos de IA</h1>
        <p className="page-sub">Configura proveedores, perfil y comportamiento de tu asistente ORQO</p>
      </div>

      {/* ── 1. Proveedores de IA ──────────────────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <SectionTitle>Proveedores de IA</SectionTitle>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          {PROVIDERS.map(p => (
            <button
              key={p.id}
              className={`btn btn-sm ${activeProvider === p.id ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveProvider(p.id)}
            >
              <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11 }}>{p.icon}</span>
              {p.name}
              {providers[p.id].enabled && (
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', opacity: 0.8 }} />
              )}
            </button>
          ))}
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div style={{ fontFamily: 'var(--f-disp)', fontWeight: 700, fontSize: 15, color: 'var(--g07)' }}>
                {currentProviderMeta.name}
              </div>
              <div style={{ fontSize: 12, color: pCurrent.enabled ? 'var(--acc)' : 'var(--g05)', marginTop: 2 }}>
                {pCurrent.enabled ? '● Activo' : '○ Inactivo'}
              </div>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={pCurrent.enabled}
                onChange={e => updateProvider(activeProvider, 'enabled', e.target.checked)}
              />
              <span className="toggle-track" />
              <span className="toggle-thumb" />
            </label>
          </div>

          <div className="field">
            <label className="label">API Key</label>
            <div className="input-group">
              <input
                className="input input-mono"
                type={showKey[activeProvider] ? 'text' : 'password'}
                placeholder="Pega tu API key aquí…"
                value={pCurrent.apiKey}
                onChange={e => updateProvider(activeProvider, 'apiKey', e.target.value)}
              />
              <button
                className="btn btn-ghost"
                onClick={() => setShowKey(prev => ({ ...prev, [activeProvider]: !prev[activeProvider] }))}
                style={{ whiteSpace: 'nowrap' }}
              >
                {showKey[activeProvider] ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>

          <div className="field" style={{ marginBottom: 0 }}>
            <label className="label">Modelo</label>
            <select
              className="input"
              value={pCurrent.model}
              onChange={e => updateProvider(activeProvider, 'model', e.target.value)}
            >
              {currentProviderMeta.models.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* ── 2. Límites de tokens ─────────────────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <SectionTitle>Límites de tokens</SectionTitle>
        <div className="card">
          <ToggleRow
            title="Límite de tokens por período"
            desc="Controla el consumo total de tokens por día, semana o mes"
            checked={tokenPeriodEnabled}
            onChange={setTokenPeriodEnabled}
          />
          {tokenPeriodEnabled && (
            <div style={{ display: 'flex', gap: 12, padding: '16px 0 8px', alignItems: 'flex-end' }}>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="label">Período</label>
                <select
                  className="input"
                  value={tokenPeriod}
                  onChange={e => setTokenPeriod(e.target.value as 'day' | 'week' | 'month')}
                >
                  <option value="day">Por día</option>
                  <option value="week">Por semana</option>
                  <option value="month">Por mes</option>
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 2 }}>
                <label className="label">Máximo de tokens</label>
                <input
                  className="input"
                  type="number"
                  min={1000}
                  step={1000}
                  value={tokenPeriodLimit}
                  onChange={e => setTokenPeriodLimit(e.target.value)}
                />
              </div>
            </div>
          )}

          <ToggleRow
            title="Límite de tokens por conversación"
            desc="Máximo de tokens permitidos en una sola sesión de chat"
            checked={tokenConvEnabled}
            onChange={setTokenConvEnabled}
          />
          {tokenConvEnabled && (
            <div style={{ padding: '16px 0 8px' }}>
              <div className="field" style={{ marginBottom: 0, maxWidth: 280 }}>
                <label className="label">Tokens máximos por conversación</label>
                <input
                  className="input"
                  type="number"
                  min={500}
                  step={500}
                  value={tokenConvLimit}
                  onChange={e => setTokenConvLimit(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── 3. Orquestación de modelos ───────────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <SectionTitle>Orquestación de modelos</SectionTitle>
        <div className="card">
          <ToggleRow
            title="Usar múltiples modelos en concurrencia"
            desc="Activa más de un proveedor y ORQO distribuirá las peticiones según el modo seleccionado"
            checked={multiModel}
            onChange={setMultiModel}
          />
          {multiModel && (
            <div style={{ paddingTop: 16 }}>
              <label className="label">Modo balanceador</label>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                {([
                  { id: 'failover',   label: 'Failover',    desc: 'Usa el modelo principal y cambia al siguiente solo si falla' },
                  { id: 'roundrobin', label: 'Round-robin', desc: 'Distribuye las peticiones equitativamente entre modelos activos' },
                ] as const).map(mode => (
                  <button
                    key={mode.id}
                    className={`btn ${balancer === mode.id ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setBalancer(mode.id)}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 12, color: 'var(--g05)', marginTop: 10 }}>
                {balancer === 'failover'
                  ? 'Failover: el modelo principal recibe todas las peticiones. Los demás actúan como respaldo.'
                  : 'Round-robin: cada petición se envía al siguiente modelo en orden, distribuyendo la carga.'}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── 4. Formulario pre-chat ───────────────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <SectionTitle>Formulario pre-chat</SectionTitle>
        <div className="card">
          <p style={{ fontSize: 13, color: 'var(--g05)', marginBottom: 18, lineHeight: 1.6 }}>
            Solicita datos al usuario antes de iniciar la conversación. Define qué campos mostrar y si son obligatorios.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {([
              { key: 'email', label: 'Correo electrónico', icon: '✉' },
              { key: 'name',  label: 'Nombre completo',    icon: '👤' },
              { key: 'phone', label: 'Teléfono',           icon: '📱' },
            ] as const).map(f => (
              <div
                key={f.key}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px',
                  background: 'var(--g02)',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${preChatFields[f.key].enabled ? 'var(--g03)' : 'transparent'}`,
                  opacity: preChatFields[f.key].enabled ? 1 : 0.55,
                }}
              >
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={preChatFields[f.key].enabled}
                    onChange={e => updatePreChat(f.key, 'enabled', e.target.checked)}
                  />
                  <span className="toggle-track" />
                  <span className="toggle-thumb" />
                </label>
                <span style={{ fontSize: 14 }}>{f.icon}</span>
                <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: 'var(--g07)' }}>{f.label}</span>
                {preChatFields[f.key].enabled && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className={`btn btn-sm ${preChatFields[f.key].required ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => updatePreChat(f.key, 'required', true)}
                    >
                      Requerido
                    </button>
                    <button
                      className={`btn btn-sm ${!preChatFields[f.key].required ? 'btn-secondary' : 'btn-ghost'}`}
                      onClick={() => updatePreChat(f.key, 'required', false)}
                    >
                      Opcional
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <ToggleRow
            title="Permitir saltar el formulario"
            desc="El usuario puede omitir el formulario con un botón «Continuar sin registrarme»"
            checked={preChatSkip}
            onChange={setPreChatSkip}
          />
        </div>
      </section>

      {/* ── 5. Límite de mensajes ────────────────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <SectionTitle>Límite de mensajes</SectionTitle>
        <div className="card">
          <ToggleRow
            title="Límite de mensajes por conversación"
            desc="Número máximo de mensajes que un usuario puede enviar en una sola conversación"
            checked={msgLimitEnabled}
            onChange={setMsgLimitEnabled}
          />
          {msgLimitEnabled && (
            <div style={{ paddingTop: 16 }}>
              <div className="field" style={{ marginBottom: 0, maxWidth: 200 }}>
                <label className="label">Máximo de mensajes</label>
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={msgLimit}
                  onChange={e => setMsgLimit(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── 6. Perfil & personalidad ─────────────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <SectionTitle>Perfil del agente</SectionTitle>

        {/* Profile selector */}
        <div className="card" style={{ marginBottom: 16 }}>
          <label className="label" style={{ marginBottom: 14 }}>Tipo de agente</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
            {PROFILES.map(p => (
              <button
                key={p.id}
                onClick={() => selectProfile(p.id)}
                style={{
                  padding: '14px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${profile === p.id ? 'var(--acc)' : 'var(--g03)'}`,
                  background: profile === p.id ? 'var(--acc-g)' : 'var(--g02)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 8 }}>{p.icon}</div>
                <div style={{
                  fontSize: 12.5, fontWeight: 700,
                  color: profile === p.id ? 'var(--acc)' : 'var(--g07)',
                  marginBottom: 4,
                }}>
                  {p.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--g05)', lineHeight: 1.4 }}>{p.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Personality */}
        <div className="card">
          <label className="label" style={{ marginBottom: 14 }}>Personalidad del agente</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {PERSONALITIES.map(p => (
              <button
                key={p.id}
                onClick={() => setPersonality(p.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '13px 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${personality === p.id ? 'var(--acc)' : 'var(--g03)'}`,
                  background: personality === p.id ? 'var(--acc-g)' : 'var(--g02)',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                  border: `2px solid ${personality === p.id ? 'var(--acc)' : 'var(--g04)'}`,
                  background: personality === p.id ? 'var(--acc)' : 'transparent',
                }} />
                <div>
                  <div style={{
                    fontSize: 13.5, fontWeight: 600,
                    color: personality === p.id ? 'var(--acc)' : 'var(--g07)',
                  }}>
                    {p.label}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--g05)', marginTop: 2 }}>{p.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. Skills del agente ─────────────────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <SectionTitle>Skills del agente</SectionTitle>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {skillsError && (
              <span style={{ fontSize: 12, color: 'var(--red)', fontWeight: 600 }}>Máximo {MAX_SKILLS} skills</span>
            )}
            <span className={`badge ${Object.values(skills).filter(Boolean).length >= MAX_SKILLS ? 'badge-red' : 'badge-green'}`}>
              {Object.values(skills).filter(Boolean).length} / {MAX_SKILLS}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {SKILLS_GROUPS.map(group => {
            const activeCount = group.skills.filter(s => skills[s.id]).length;
            return (
              <div key={group.id} className="card" style={{ padding: '18px 22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <span style={{ fontSize: 18 }}>{group.icon}</span>
                  <span style={{ fontFamily: 'var(--f-disp)', fontWeight: 700, fontSize: 14, color: 'var(--g07)' }}>
                    {group.name}
                  </span>
                  <span
                    className={`badge ${activeCount > 0 ? 'badge-green' : 'badge-gray'}`}
                    style={{ marginLeft: 'auto' }}
                  >
                    {activeCount}/{group.skills.length}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(195px, 1fr))', gap: 7 }}>
                  {group.skills.map(s => (
                    <label
                      key={s.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 9,
                        padding: '8px 11px',
                        borderRadius: 'var(--radius-sm)',
                        background: skills[s.id] ? 'var(--acc-g)' : 'var(--g02)',
                        border: `1px solid ${skills[s.id] ? 'rgba(44,185,120,0.3)' : 'transparent'}`,
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={!!skills[s.id]}
                        onChange={() => toggleSkill(s.id)}
                        style={{ accentColor: 'var(--acc)', width: 14, height: 14, flexShrink: 0 }}
                      />
                      <span style={{
                        fontSize: 12.5,
                        color: skills[s.id] ? 'var(--acc)' : 'var(--g06)',
                        fontWeight: skills[s.id] ? 600 : 400,
                      }}>
                        {s.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 8. Contexto corporativo ──────────────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <SectionTitle>Contexto corporativo</SectionTitle>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          <div className="field" style={{ marginBottom: 0 }}>
            <label className="label">Contexto de negocio / nicho</label>
            <textarea
              className="input"
              rows={4}
              placeholder="Describe tu empresa, industria, productos o servicios. Esta información guía al agente para dar respuestas más relevantes…"
              value={corporateContext}
              onChange={e => setCorporateContext(e.target.value)}
            />
          </div>

          <div>
            <ToggleRow
              title="Obtener contexto de página específica"
              desc="ORQO extrae automáticamente información de una URL para enriquecer las respuestas"
              checked={pageContextEnabled}
              onChange={setPageContextEnabled}
            />
            {pageContextEnabled && (
              <div className="field" style={{ marginBottom: 0, marginTop: 12 }}>
                <label className="label">URL de la página</label>
                <input
                  className="input"
                  type="url"
                  placeholder="https://misitioweb.com/sobre-nosotros"
                  value={pageContextUrl}
                  onChange={e => setPageContextUrl(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="field" style={{ marginBottom: 0 }}>
            <label className="label">Instrucciones personalizadas</label>
            <textarea
              className="input"
              rows={3}
              placeholder="Instrucciones adicionales: tono específico, temas a evitar, flujos especiales, cómo manejar ciertos escenarios…"
              value={customInstructions}
              onChange={e => setCustomInstructions(e.target.value)}
            />
          </div>

          <div>
            <label className="label" style={{ marginBottom: 10 }}>Reglas no negociables</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
              {NON_NEGOTIABLE_RULES.map((rule, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '9px 13px',
                    background: 'var(--g02)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--g03)',
                  }}
                >
                  <span style={{ fontSize: 13, flexShrink: 0 }}>🔒</span>
                  <span style={{ fontSize: 12.5, color: 'var(--g06)', lineHeight: 1.5 }}>{rule}</span>
                  <span className="badge badge-gray" style={{ marginLeft: 'auto', flexShrink: 0 }}>Fija</span>
                </div>
              ))}
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="label">Agregar reglas adicionales</label>
              <textarea
                className="input"
                rows={2}
                placeholder="Una regla por línea…"
                value={extraRules}
                onChange={e => setExtraRules(e.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── 9. Geolocalización ───────────────────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <SectionTitle>Geolocalización</SectionTitle>
        <div className="card">
          <ToggleRow
            title="Activar geolocalización del usuario"
            desc="ORQO detectará la ubicación aproximada del usuario para personalizar respuestas (requiere permiso del navegador)"
            checked={geoEnabled}
            onChange={setGeoEnabled}
          />
        </div>
      </section>

      {/* ── 10. Vista previa del agente (.md) ───────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <SectionTitle>Vista previa del agente</SectionTitle>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowMd(v => !v)}>
            {showMd ? '▲ Colapsar' : '▼ Ver .md generado'}
          </button>
        </div>
        {showMd && (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--g05)' }}>Generado automáticamente · Solo referencia</span>
              <span className="badge badge-gray">No editable</span>
            </div>
            <pre style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 11.5,
              lineHeight: 1.8,
              color: 'var(--g06)',
              background: 'var(--g02)',
              borderRadius: 'var(--radius-sm)',
              padding: '14px 16px',
              overflow: 'auto',
              maxHeight: 400,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              pointerEvents: 'none',
            }}>
              {generateMd()}
            </pre>
          </div>
        )}
      </section>

      {/* ── Save bar ─────────────────────────────────────────────────────── */}
      <div className="save-bar">
        <button className="btn btn-primary" onClick={save}>
          {saved ? '✓ Configuración guardada' : 'Guardar configuración'}
        </button>
      </div>
    </div>
  );
}
