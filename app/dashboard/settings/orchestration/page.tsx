'use client';

import { useEffect, useState } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────
type ProviderCfg = { apiKey: string; model: string; enabled: boolean };
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
  orchestration: { multiModel: false, strategy: 'failover', concurrentMessages: 50 },
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
          }));
        }
      })
      .catch(() => {});
  }, []);

  function setProvider(key: ProviderKey, field: keyof ProviderCfg, value: string | boolean) {
    setSettings(s => ({
      ...s,
      aiProviders: {
        ...s.aiProviders,
        [key]: { ...s.aiProviders[key], [field]: value },
      },
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

  return (
    <div className="dash-content">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Orquestación IA</h1>
          <p className="page-sub">Proveedores de IA, límites de tokens y estrategia de orquestación</p>
        </div>
      </div>

      {/* Section 1 — Proveedores de IA */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">Proveedores de IA</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginTop: 16 }}>
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
                {/* Provider header */}
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
                    {/* API Key */}
                    <div>
                      <label className="label">API Key</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          className="input"
                          type={showKey[prov.id] ? 'text' : 'password'}
                          value={cfg.apiKey}
                          onChange={e => setProvider(prov.id, 'apiKey', e.target.value)}
                          placeholder={`sk-...`}
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
                    {/* Model */}
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

      {/* Section 2 — Orquestación de Modelos */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">Orquestación de Modelos</div>
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ToggleRow
            title="Multi-modelo"
            desc="Usa varios proveedores en simultáneo con estrategia de fallback o balance de carga"
            checked={settings.orchestration.multiModel}
            onChange={v => setOrch('multiModel', v)}
          />

          {settings.orchestration.multiModel && (
            <div style={{ paddingLeft: 16, borderLeft: '2px solid var(--acc)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div className="label" style={{ marginBottom: 8 }}>Estrategia</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {([
                    { id: 'failover',    label: 'Failover' },
                    { id: 'roundrobin',  label: 'Round Robin' },
                  ] as const).map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setOrch('strategy', s.id)}
                      style={{
                        padding: '8px 18px', borderRadius: 'var(--radius-sm)', border: '1px solid',
                        borderColor: settings.orchestration.strategy === s.id ? 'var(--acc)' : 'var(--g03)',
                        background: settings.orchestration.strategy === s.id ? 'color-mix(in srgb, var(--acc) 12%, var(--g01))' : 'transparent',
                        color: settings.orchestration.strategy === s.id ? 'var(--acc)' : 'var(--g06)',
                        fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all .15s',
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
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

      {/* Section 3 — Límites de Tokens */}
      <div className="card" style={{ marginBottom: 32 }}>
        <div className="card-title">Límites de Tokens</div>
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Period limit */}
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

          {/* Per-conversation limit */}
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
