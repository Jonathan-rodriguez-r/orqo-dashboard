'use client';

import { useEffect, useState } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────
type ProviderCfg = { apiKey: string; model: string; enabled: boolean };
type Settings = {
  aiProviders: {
    google: ProviderCfg; openai: ProviderCfg; grok: ProviderCfg; anthropic: ProviderCfg;
  };
  orchestration: {
    multiModel: boolean; strategy: 'failover' | 'roundrobin' | 'single';
    concurrentMessages: number; activeProviders: string[];
  };
};

const DEFAULT: Settings = {
  aiProviders: {
    google:    { apiKey: '', model: 'gemini-2.0-flash', enabled: false },
    openai:    { apiKey: '', model: 'gpt-4o', enabled: false },
    grok:      { apiKey: '', model: 'grok-3', enabled: false },
    anthropic: { apiKey: '', model: 'claude-sonnet-4-6', enabled: false },
  },
  orchestration: { multiModel: false, strategy: 'failover', concurrentMessages: 50, activeProviders: [] },
};

type ProviderKey = 'google' | 'openai' | 'grok' | 'anthropic';
const PROVIDER_DEFS: { id: ProviderKey; name: string; icon: string; color: string; models: string[] }[] = [
  { id: 'google',    name: 'Google Gemini', icon: '◉', color: '#4285F4', models: ['gemini-2.0-flash', 'gemini-2.0-pro', 'gemini-1.5-pro', 'gemini-1.5-flash'] },
  { id: 'openai',    name: 'OpenAI',        icon: '◆', color: '#10A37F', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
  { id: 'grok',      name: 'Grok (xAI)',    icon: '✕', color: '#1DA1F2', models: ['grok-3', 'grok-3-mini', 'grok-2'] },
  { id: 'anthropic', name: 'Anthropic',     icon: '◭', color: '#D4A27F', models: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5'] },
];

function ToggleRow({ title, desc, checked, onChange }: { title: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
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

export default function OrchestrationPage({ embedded = false }: { embedded?: boolean }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT);
  const [showKey, setShowKey] = useState<Record<ProviderKey, boolean>>({ google: false, openai: false, grok: false, anthropic: false });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    fetch('/api/settings/workspace').then(r => r.json()).then(data => {
      if (data && !data.error) {
        setSettings(prev => ({
          aiProviders: { ...prev.aiProviders, ...data.aiProviders },
          orchestration: { ...prev.orchestration, ...data.orchestration },
        }));
      }
    }).catch(() => {});
  }, []);

  function setProvider(key: ProviderKey, field: keyof ProviderCfg, value: string | boolean) {
    setSettings(s => ({ ...s, aiProviders: { ...s.aiProviders, [key]: { ...s.aiProviders[key], [field]: value } } }));
  }
  function setOrch<K extends keyof Settings['orchestration']>(field: K, value: Settings['orchestration'][K]) {
    setSettings(s => ({ ...s, orchestration: { ...s.orchestration, [field]: value } }));
  }

  const enabledProviders = PROVIDER_DEFS.filter(p => settings.aiProviders[p.id].enabled);
  const activeProviders = settings.orchestration.activeProviders.filter(id => enabledProviders.some(p => p.id === id));
  const inactiveEnabled = enabledProviders.filter(p => !activeProviders.includes(p.id));

  function toggleActiveProvider(id: string, checked: boolean) {
    setOrch('activeProviders', checked ? [...activeProviders, id] : activeProviders.filter(p => p !== id));
  }
  function moveProvider(id: string, dir: 'up' | 'down') {
    const arr = [...activeProviders];
    const idx = arr.indexOf(id);
    if (dir === 'up' && idx > 0) { [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]; }
    else if (dir === 'down' && idx < arr.length - 1) { [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]; }
    setOrch('activeProviders', arr);
  }

  async function handleSave() {
    setSaving(true); setFeedback(null);
    try {
      const r = await fetch('/api/settings/workspace', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
      const data = await r.json();
      setFeedback(r.ok && data.ok ? { ok: true, msg: 'Configuración guardada correctamente.' } : { ok: false, msg: data.error ?? 'Error al guardar.' });
    } catch { setFeedback({ ok: false, msg: 'Error de red.' }); }
    setSaving(false);
    setTimeout(() => setFeedback(null), 4000);
  }

  const arrowBtnStyle: React.CSSProperties = { width: 24, height: 24, borderRadius: 4, border: '1px solid var(--g03)', background: 'none', cursor: 'pointer', color: 'var(--g06)', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 };

  const content = (
    <>
      {/* Section 1 — Proveedores de IA */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">Proveedores de IA</div>
        <p style={{ fontSize: 13, color: 'var(--g05)', margin: '4px 0 16px' }}>
          Configuración transversal — todos los agentes usan estos proveedores según la estrategia activa.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {PROVIDER_DEFS.map(prov => {
            const cfg = settings.aiProviders[prov.id];
            return (
              <div key={prov.id} style={{ border: `1px solid ${cfg.enabled ? 'var(--acc)' : 'var(--g03)'}`, borderRadius: 'var(--radius)', padding: 16, background: cfg.enabled ? 'color-mix(in srgb, var(--acc) 6%, var(--g01))' : 'var(--g01)', transition: 'all .2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 36, height: 36, borderRadius: '50%', background: prov.color + '20', color: prov.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700 }}>{prov.icon}</span>
                    <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--g07)' }}>{prov.name}</span>
                  </div>
                  <label className="toggle"><input type="checkbox" checked={cfg.enabled} onChange={e => setProvider(prov.id, 'enabled', e.target.checked)}/><span className="toggle-track"/><span className="toggle-thumb"/></label>
                </div>
                {cfg.enabled && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <label className="label">API Key</label>
                      <div style={{ position: 'relative' }}>
                        <input className="input" type={showKey[prov.id] ? 'text' : 'password'} value={cfg.apiKey} onChange={e => setProvider(prov.id, 'apiKey', e.target.value)} placeholder="sk-..." style={{ paddingRight: 40 }}/>
                        <button type="button" onClick={() => setShowKey(s => ({ ...s, [prov.id]: !s[prov.id] }))} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--g05)', fontSize: 14 }}>
                          {showKey[prov.id] ? '🙈' : '👁'}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="label">Modelo</label>
                      <select className="input" value={cfg.model} onChange={e => setProvider(prov.id, 'model', e.target.value)}>
                        {prov.models.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2 — Balanceador de Carga */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">Balanceador de Carga</div>
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ToggleRow title="Multi-modelo" desc="Usa varios proveedores con estrategia de failback o balance de carga" checked={settings.orchestration.multiModel} onChange={v => setOrch('multiModel', v)}/>
          {settings.orchestration.multiModel && (
            <div style={{ paddingLeft: 16, borderLeft: '2px solid var(--acc)', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div className="label" style={{ marginBottom: 8 }}>Estrategia de distribución</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {([{ id: 'failover', label: 'Failover', desc: 'Usa el siguiente si el primero falla' }, { id: 'roundrobin', label: 'Round Robin', desc: 'Alterna entre proveedores' }] as const).map(s => (
                    <button key={s.id} type="button" title={s.desc} onClick={() => setOrch('strategy', s.id)} style={{ padding: '8px 18px', borderRadius: 'var(--radius-sm)', border: '1px solid', borderColor: settings.orchestration.strategy === s.id ? 'var(--acc)' : 'var(--g03)', background: settings.orchestration.strategy === s.id ? 'color-mix(in srgb, var(--acc) 12%, var(--g01))' : 'transparent', color: settings.orchestration.strategy === s.id ? 'var(--acc)' : 'var(--g06)', fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all .15s' }}>{s.label}</button>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: 'var(--g05)', marginTop: 6 }}>
                  {settings.orchestration.strategy === 'failover' ? 'El orden define la prioridad — si el #1 falla, se usa el #2.' : 'Los mensajes se distribuyen en secuencia entre los proveedores.'}
                </div>
              </div>
              <div>
                <div className="label" style={{ marginBottom: 8 }}>
                  Proveedores en rotación
                  {activeProviders.length > 0 && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, background: 'color-mix(in srgb, var(--acc) 20%, var(--g01))', color: 'var(--acc)', padding: '2px 7px', borderRadius: 10 }}>{activeProviders.length} activo{activeProviders.length !== 1 ? 's' : ''}</span>}
                </div>
                {enabledProviders.length === 0 ? (
                  <div style={{ padding: '12px 16px', borderRadius: 8, border: '1px dashed var(--g03)', fontSize: 13, color: 'var(--g05)', textAlign: 'center' }}>Activa al menos un proveedor para configurar la rotación.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {activeProviders.map((provId, idx) => {
                      const prov = PROVIDER_DEFS.find(p => p.id === provId); if (!prov) return null;
                      return (
                        <div key={provId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: 'color-mix(in srgb, var(--acc) 8%, var(--g01))', border: '1px solid var(--acc)' }}>
                          <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--acc)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{idx + 1}</span>
                          <span style={{ width: 28, height: 28, borderRadius: '50%', background: prov.color + '20', color: prov.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>{prov.icon}</span>
                          <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--g07)' }}>{prov.name}</span>
                          <span style={{ fontSize: 11, color: 'var(--g05)', marginRight: 4 }}>{settings.aiProviders[prov.id].model}</span>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button style={arrowBtnStyle} disabled={idx === 0} onClick={() => moveProvider(provId, 'up')}>↑</button>
                            <button style={arrowBtnStyle} disabled={idx === activeProviders.length - 1} onClick={() => moveProvider(provId, 'down')}>↓</button>
                          </div>
                          <button onClick={() => toggleActiveProvider(provId, false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--g05)', fontSize: 16, lineHeight: 1, padding: '0 2px' }} title="Quitar de rotación">×</button>
                        </div>
                      );
                    })}
                    {inactiveEnabled.map(prov => (
                      <div key={prov.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: 'var(--g01)', border: '1px dashed var(--g03)', opacity: 0.7 }}>
                        <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--g03)', color: 'var(--g05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>—</span>
                        <span style={{ width: 28, height: 28, borderRadius: '50%', background: prov.color + '15', color: prov.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>{prov.icon}</span>
                        <span style={{ flex: 1, fontSize: 13, color: 'var(--g06)' }}>{prov.name}</span>
                        <button className="btn btn-ghost btn-sm" onClick={() => toggleActiveProvider(prov.id, true)} style={{ fontSize: 11 }}>+ Agregar</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="field">
            <label className="label">Mensajes concurrentes</label>
            <input className="input" type="number" min={1} max={500} value={settings.orchestration.concurrentMessages} onChange={e => setOrch('concurrentMessages', Number(e.target.value))} style={{ maxWidth: 120 }}/>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Guardando…' : 'Guardar configuración'}</button>
        {feedback && <span style={{ fontSize: 13, fontWeight: 500, color: feedback.ok ? 'var(--acc)' : 'var(--red)' }}>{feedback.msg}</span>}
      </div>
    </>
  );

  if (embedded) return <div style={{ paddingTop: 8 }}>{content}</div>;

  return (
    <div className="dash-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Orquestación IA</h1>
          <p className="page-sub">Proveedores de IA y balanceo de carga entre modelos</p>
        </div>
      </div>
      {content}
    </div>
  );
}
