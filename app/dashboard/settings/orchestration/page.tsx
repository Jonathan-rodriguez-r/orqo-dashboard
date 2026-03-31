'use client';

import { useEffect, useState } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────
type ProviderCfg = { apiKey: string; model: string; enabled: boolean };
type PreChatField = { enabled: boolean; required: boolean };

type Settings = {
  aiProviders: {
    google: ProviderCfg;
    openai: ProviderCfg;
    grok: ProviderCfg;
    anthropic: ProviderCfg;
  };
  tokenLimits: {
    periodEnabled: boolean;
    period: 'day' | 'week' | 'month';
    periodLimit: number;
    convEnabled: boolean;
    convLimit: number;
  };
  orchestration: {
    multiModel: boolean;
    strategy: 'failover' | 'roundrobin' | 'single';
    concurrentMessages: number;
    activeProviders: string[];
  };
  preChatForm: {
    enabled: boolean;
    fields: {
      name:  PreChatField;
      email: PreChatField;
      phone: PreChatField;
    };
  };
};

// ── Defaults ──────────────────────────────────────────────────────────────────
const DEFAULT: Settings = {
  aiProviders: {
    google:    { apiKey: '', model: 'gemini-2.0-flash', enabled: false },
    openai:    { apiKey: '', model: 'gpt-4o', enabled: false },
    grok:      { apiKey: '', model: 'grok-3', enabled: false },
    anthropic: { apiKey: '', model: 'claude-sonnet-4-6', enabled: false },
  },
  tokenLimits: {
    periodEnabled: false, period: 'month', periodLimit: 100000,
    convEnabled: false, convLimit: 4000,
  },
  orchestration: { multiModel: false, strategy: 'failover', concurrentMessages: 50, activeProviders: [] },
  preChatForm: {
    enabled: false,
    fields: {
      name:  { enabled: true,  required: true  },
      email: { enabled: true,  required: false },
      phone: { enabled: false, required: false },
    },
  },
};

// ── Provider definitions ───────────────────────────────────────────────────────
type ProviderKey = 'google' | 'openai' | 'grok' | 'anthropic';
const PROVIDER_DEFS: { id: ProviderKey; name: string; icon: string; color: string; models: string[] }[] = [
  { id: 'google',    name: 'Google Gemini', icon: '◉', color: '#4285F4',
    models: ['gemini-2.0-flash', 'gemini-2.0-pro', 'gemini-1.5-pro', 'gemini-1.5-flash'] },
  { id: 'openai',    name: 'OpenAI',        icon: '◆', color: '#10A37F',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
  { id: 'grok',      name: 'Grok (xAI)',    icon: '✕', color: '#1DA1F2',
    models: ['grok-3', 'grok-3-mini', 'grok-2'] },
  { id: 'anthropic', name: 'Anthropic',     icon: '◭', color: '#D4A27F',
    models: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5'] },
];

const PRE_CHAT_FIELDS: { id: keyof Settings['preChatForm']['fields']; label: string; icon: string }[] = [
  { id: 'name',  label: 'Nombre',   icon: '👤' },
  { id: 'email', label: 'Correo',   icon: '✉️' },
  { id: 'phone', label: 'Teléfono', icon: '📱' },
];

// ── ToggleRow ─────────────────────────────────────────────────────────────────
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

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function OrchestrationPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT);
  const [showKey, setShowKey] = useState<Record<ProviderKey, boolean>>({
    google: false, openai: false, grok: false, anthropic: false,
  });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    fetch('/api/settings/workspace')
      .then(r => r.json())
      .then(data => {
        if (data && !data.error) {
          setSettings(prev => ({
            aiProviders: { ...prev.aiProviders, ...data.aiProviders },
            tokenLimits: { ...prev.tokenLimits, ...data.tokenLimits },
            orchestration: { ...prev.orchestration, ...data.orchestration },
            preChatForm: data.preChatForm
              ? { ...prev.preChatForm, ...data.preChatForm, fields: { ...prev.preChatForm.fields, ...data.preChatForm.fields } }
              : prev.preChatForm,
          }));
        }
      })
      .catch(() => {});
  }, []);

  function setProvider(key: ProviderKey, field: keyof ProviderCfg, value: string | boolean) {
    setSettings(s => ({
      ...s,
      aiProviders: { ...s.aiProviders, [key]: { ...s.aiProviders[key], [field]: value } },
    }));
  }

  function setOrch<K extends keyof Settings['orchestration']>(
    field: K, value: Settings['orchestration'][K]
  ) {
    setSettings(s => ({ ...s, orchestration: { ...s.orchestration, [field]: value } }));
  }

  function setLimits<K extends keyof Settings['tokenLimits']>(
    field: K, value: Settings['tokenLimits'][K]
  ) {
    setSettings(s => ({ ...s, tokenLimits: { ...s.tokenLimits, [field]: value } }));
  }

  function setPreChatField(
    fieldId: keyof Settings['preChatForm']['fields'],
    prop: keyof PreChatField,
    value: boolean
  ) {
    setSettings(s => ({
      ...s,
      preChatForm: {
        ...s.preChatForm,
        fields: {
          ...s.preChatForm.fields,
          [fieldId]: { ...s.preChatForm.fields[fieldId], [prop]: value },
        },
      },
    }));
  }

  // ── Active providers for load balancer ──
  const enabledProviders = PROVIDER_DEFS.filter(p => settings.aiProviders[p.id].enabled);
  const activeProviders = settings.orchestration.activeProviders.filter(
    id => enabledProviders.some(p => p.id === id)
  );
  // Providers enabled but not yet in rotation
  const inactiveEnabled = enabledProviders.filter(p => !activeProviders.includes(p.id));

  function toggleActiveProvider(id: string, checked: boolean) {
    if (checked) {
      setOrch('activeProviders', [...activeProviders, id]);
    } else {
      setOrch('activeProviders', activeProviders.filter(p => p !== id));
    }
  }

  function moveProvider(id: string, dir: 'up' | 'down') {
    const arr = [...activeProviders];
    const idx = arr.indexOf(id);
    if (dir === 'up' && idx > 0) {
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
    } else if (dir === 'down' && idx < arr.length - 1) {
      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
    }
    setOrch('activeProviders', arr);
  }

  async function handleSave() {
    setSaving(true);
    setFeedback(null);
    try {
      const r = await fetch('/api/settings/workspace', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await r.json();
      if (r.ok && data.ok) {
        setFeedback({ ok: true, msg: 'Configuración guardada correctamente.' });
      } else {
        setFeedback({ ok: false, msg: data.error ?? 'Error al guardar.' });
      }
    } catch {
      setFeedback({ ok: false, msg: 'Error de red. Intenta de nuevo.' });
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  }

  const arrowBtnStyle: React.CSSProperties = {
    width: 24, height: 24, borderRadius: 4,
    border: '1px solid var(--g03)', background: 'none',
    cursor: 'pointer', color: 'var(--g06)', fontSize: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 0, lineHeight: 1,
  };

  return (
    <div className="dash-content">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Orquestación IA</h1>
          <p className="page-sub">Proveedores de IA, balanceo de carga, formulario pre-chat y límites de tokens</p>
        </div>
      </div>

      {/* ── Section 1: Proveedores de IA ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">Proveedores de IA</div>
        <p style={{ fontSize: 13, color: 'var(--g05)', margin: '4px 0 16px' }}>
          Configuración transversal — todos los agentes usan estos proveedores según la estrategia seleccionada.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {PROVIDER_DEFS.map(prov => {
            const cfg = settings.aiProviders[prov.id];
            return (
              <div
                key={prov.id}
                style={{
                  border: `1px solid ${cfg.enabled ? 'var(--acc)' : 'var(--g03)'}`,
                  borderRadius: 'var(--radius)',
                  padding: 16,
                  background: cfg.enabled ? 'color-mix(in srgb, var(--acc) 6%, var(--g01))' : 'var(--g01)',
                  transition: 'all .2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: prov.color + '20', color: prov.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, fontWeight: 700,
                    }}>
                      {prov.icon}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--g07)' }}>{prov.name}</span>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={cfg.enabled}
                      onChange={e => setProvider(prov.id, 'enabled', e.target.checked)}
                    />
                    <span className="toggle-track" /><span className="toggle-thumb" />
                  </label>
                </div>

                {cfg.enabled && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <label className="label">API Key</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          className="input"
                          type={showKey[prov.id] ? 'text' : 'password'}
                          value={cfg.apiKey}
                          onChange={e => setProvider(prov.id, 'apiKey', e.target.value)}
                          placeholder="sk-..."
                          style={{ paddingRight: 40 }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowKey(s => ({ ...s, [prov.id]: !s[prov.id] }))}
                          style={{
                            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--g05)', fontSize: 14, padding: 2,
                          }}
                        >
                          {showKey[prov.id] ? '🙈' : '👁'}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="label">Modelo</label>
                      <select
                        className="input"
                        value={cfg.model}
                        onChange={e => setProvider(prov.id, 'model', e.target.value)}
                      >
                        {prov.models.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Section 2: Orquestación / Balanceo ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">Balanceador de Carga</div>
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ToggleRow
            title="Multi-modelo"
            desc="Usa varios proveedores en simultáneo con estrategia de fallback o balance de carga"
            checked={settings.orchestration.multiModel}
            onChange={v => setOrch('multiModel', v)}
          />

          {settings.orchestration.multiModel && (
            <div style={{ paddingLeft: 16, borderLeft: '2px solid var(--acc)', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Estrategia */}
              <div>
                <div className="label" style={{ marginBottom: 8 }}>Estrategia de distribución</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {([
                    { id: 'failover',   label: 'Failover',    desc: 'Usa el siguiente si el primero falla' },
                    { id: 'roundrobin', label: 'Round Robin', desc: 'Alterna entre proveedores' },
                  ] as const).map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setOrch('strategy', s.id)}
                      title={s.desc}
                      style={{
                        padding: '8px 18px', borderRadius: 'var(--radius-sm)', border: '1px solid',
                        borderColor: settings.orchestration.strategy === s.id ? 'var(--acc)' : 'var(--g03)',
                        background: settings.orchestration.strategy === s.id
                          ? 'color-mix(in srgb, var(--acc) 12%, var(--g01))' : 'transparent',
                        color: settings.orchestration.strategy === s.id ? 'var(--acc)' : 'var(--g06)',
                        fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all .15s',
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: 'var(--g05)', marginTop: 6 }}>
                  {settings.orchestration.strategy === 'failover'
                    ? 'El orden define la prioridad — si el #1 falla, se usa el #2, y así sucesivamente.'
                    : 'Los mensajes se distribuyen en secuencia entre los proveedores seleccionados.'}
                </div>
              </div>

              {/* Proveedores en rotación */}
              <div>
                <div className="label" style={{ marginBottom: 8 }}>
                  Proveedores en rotación
                  {activeProviders.length > 0 && (
                    <span style={{
                      marginLeft: 8, fontSize: 10, fontWeight: 700,
                      background: 'color-mix(in srgb, var(--acc) 20%, var(--g01))',
                      color: 'var(--acc)', padding: '2px 7px', borderRadius: 10,
                    }}>
                      {activeProviders.length} activo{activeProviders.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {enabledProviders.length === 0 ? (
                  <div style={{
                    padding: '12px 16px', borderRadius: 8,
                    border: '1px dashed var(--g03)',
                    fontSize: 13, color: 'var(--g05)', textAlign: 'center',
                  }}>
                    Activa al menos un proveedor en la sección anterior para configurar la rotación.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {/* Active providers (ordered) */}
                    {activeProviders.map((provId, idx) => {
                      const prov = PROVIDER_DEFS.find(p => p.id === provId);
                      if (!prov) return null;
                      return (
                        <div key={provId} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 12px', borderRadius: 8,
                          background: 'color-mix(in srgb, var(--acc) 8%, var(--g01))',
                          border: '1px solid var(--acc)',
                        }}>
                          <span style={{
                            width: 22, height: 22, borderRadius: '50%',
                            background: 'var(--acc)', color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 700, flexShrink: 0,
                          }}>
                            {idx + 1}
                          </span>
                          <span style={{
                            width: 28, height: 28, borderRadius: '50%',
                            background: prov.color + '20', color: prov.color,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 14, fontWeight: 700, flexShrink: 0,
                          }}>
                            {prov.icon}
                          </span>
                          <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--g07)' }}>
                            {prov.name}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--g05)', marginRight: 4 }}>
                            {settings.aiProviders[prov.id].model}
                          </span>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              style={arrowBtnStyle}
                              disabled={idx === 0}
                              onClick={() => moveProvider(provId, 'up')}
                            >
                              ↑
                            </button>
                            <button
                              style={arrowBtnStyle}
                              disabled={idx === activeProviders.length - 1}
                              onClick={() => moveProvider(provId, 'down')}
                            >
                              ↓
                            </button>
                          </div>
                          <button
                            onClick={() => toggleActiveProvider(provId, false)}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              color: 'var(--g05)', fontSize: 16, lineHeight: 1, padding: '0 2px',
                            }}
                            title="Quitar de rotación"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}

                    {/* Enabled providers not yet in rotation */}
                    {inactiveEnabled.map(prov => (
                      <div key={prov.id} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 12px', borderRadius: 8,
                        background: 'var(--g01)', border: '1px dashed var(--g03)',
                        opacity: 0.7,
                      }}>
                        <span style={{
                          width: 22, height: 22, borderRadius: '50%',
                          background: 'var(--g03)', color: 'var(--g05)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 700, flexShrink: 0,
                        }}>
                          —
                        </span>
                        <span style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: prov.color + '15', color: prov.color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 14, fontWeight: 700, flexShrink: 0,
                        }}>
                          {prov.icon}
                        </span>
                        <span style={{ flex: 1, fontSize: 13, color: 'var(--g06)' }}>{prov.name}</span>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => toggleActiveProvider(prov.id, true)}
                          style={{ fontSize: 11 }}
                        >
                          + Agregar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="field">
            <label className="label">Mensajes concurrentes</label>
            <input
              className="input"
              type="number"
              min={1}
              max={500}
              value={settings.orchestration.concurrentMessages}
              onChange={e => setOrch('concurrentMessages', Number(e.target.value))}
              style={{ maxWidth: 120 }}
            />
          </div>
        </div>
      </div>

      {/* ── Section 3: Formulario Pre-Chat ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">Formulario Pre-Chat</div>
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ToggleRow
            title="Activar formulario pre-chat"
            desc="Muestra un formulario antes de que el usuario inicie la conversación con el agente"
            checked={settings.preChatForm.enabled}
            onChange={v => setSettings(s => ({ ...s, preChatForm: { ...s.preChatForm, enabled: v } }))}
          />

          {settings.preChatForm.enabled && (
            <div style={{ paddingLeft: 16, borderLeft: '2px solid var(--acc)' }}>
              <div className="label" style={{ marginBottom: 12 }}>Campos del formulario</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Header row */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 100px 100px',
                  gap: 8, paddingBottom: 8,
                  borderBottom: '1px solid var(--g03)',
                  fontSize: 11, fontWeight: 700, color: 'var(--g05)', textTransform: 'uppercase',
                }}>
                  <span>Campo</span>
                  <span style={{ textAlign: 'center' }}>Habilitado</span>
                  <span style={{ textAlign: 'center' }}>Requerido</span>
                </div>

                {PRE_CHAT_FIELDS.map(field => {
                  const cfg = settings.preChatForm.fields[field.id];
                  return (
                    <div key={field.id} style={{
                      display: 'grid', gridTemplateColumns: '1fr 100px 100px',
                      gap: 8, alignItems: 'center',
                      padding: '8px 0',
                      borderBottom: '1px solid var(--g02)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16 }}>{field.icon}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--g07)' }}>{field.label}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <label className="toggle">
                          <input
                            type="checkbox"
                            checked={cfg.enabled}
                            onChange={e => setPreChatField(field.id, 'enabled', e.target.checked)}
                          />
                          <span className="toggle-track" /><span className="toggle-thumb" />
                        </label>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <label className="toggle" style={{ opacity: cfg.enabled ? 1 : 0.35 }}>
                          <input
                            type="checkbox"
                            checked={cfg.required}
                            disabled={!cfg.enabled}
                            onChange={e => setPreChatField(field.id, 'required', e.target.checked)}
                          />
                          <span className="toggle-track" /><span className="toggle-thumb" />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: 11, color: 'var(--g05)', marginTop: 10 }}>
                Los campos requeridos bloquean el inicio de la conversación hasta que el usuario los complete.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Section 4: Límites de Tokens ── */}
      <div className="card" style={{ marginBottom: 32 }}>
        <div className="card-title">Límites de Tokens</div>
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ToggleRow
            title="Límite por período"
            desc="Restringe el número total de tokens por período de tiempo"
            checked={settings.tokenLimits.periodEnabled}
            onChange={v => setLimits('periodEnabled', v)}
          />
          {settings.tokenLimits.periodEnabled && (
            <div style={{ paddingLeft: 16, borderLeft: '2px solid var(--acc)', display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="field">
                <label className="label">Período</label>
                <select
                  className="input"
                  value={settings.tokenLimits.period}
                  onChange={e => setLimits('period', e.target.value as 'day' | 'week' | 'month')}
                  style={{ minWidth: 120 }}
                >
                  <option value="day">Día</option>
                  <option value="week">Semana</option>
                  <option value="month">Mes</option>
                </select>
              </div>
              <div className="field">
                <label className="label">Límite de tokens</label>
                <input
                  className="input"
                  type="number"
                  min={1000}
                  step={1000}
                  value={settings.tokenLimits.periodLimit}
                  onChange={e => setLimits('periodLimit', Number(e.target.value))}
                  style={{ maxWidth: 160 }}
                />
              </div>
            </div>
          )}

          <ToggleRow
            title="Límite por conversación"
            desc="Limita los tokens que puede consumir cada conversación individual"
            checked={settings.tokenLimits.convEnabled}
            onChange={v => setLimits('convEnabled', v)}
          />
          {settings.tokenLimits.convEnabled && (
            <div style={{ paddingLeft: 16, borderLeft: '2px solid var(--acc)' }}>
              <div className="field">
                <label className="label">Tokens por conversación</label>
                <input
                  className="input"
                  type="number"
                  min={500}
                  step={500}
                  value={settings.tokenLimits.convLimit}
                  onChange={e => setLimits('convLimit', Number(e.target.value))}
                  style={{ maxWidth: 160 }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Guardando…' : 'Guardar configuración'}
        </button>
        {feedback && (
          <span style={{
            fontSize: 13, fontWeight: 500,
            color: feedback.ok ? 'var(--acc)' : 'var(--red)',
          }}>
            {feedback.msg}
          </span>
        )}
      </div>
    </div>
  );
}
