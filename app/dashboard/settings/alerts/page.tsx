'use client';

import { useEffect, useState } from 'react';

type AlertSettings = {
  enabled: boolean;
  throttleMinutes: number;
  recipients: string[];
  events: {
    NO_PROVIDER_CONFIGURED: boolean;
    ALL_PROVIDERS_FAILED: boolean;
    FREE_FALLBACK_FAILED: boolean;
    DIAGNOSTIC_WARNINGS: boolean;
    DIAGNOSTIC_FAILURE: boolean;
    WIDGET_INACTIVE: boolean;
    PUBLIC_API_UNHEALTHY: boolean;
  };
};

const DEFAULT_SETTINGS: AlertSettings = {
  enabled: true,
  throttleMinutes: 10,
  recipients: ['owner', 'operations', 'admin'],
  events: {
    NO_PROVIDER_CONFIGURED: true,
    ALL_PROVIDERS_FAILED: true,
    FREE_FALLBACK_FAILED: true,
    DIAGNOSTIC_WARNINGS: true,
    DIAGNOSTIC_FAILURE: true,
    WIDGET_INACTIVE: true,
    PUBLIC_API_UNHEALTHY: true,
  },
};

const ROLE_OPTIONS = [
  { id: 'owner', label: 'Owner' },
  { id: 'operations', label: 'Operaciones' },
  { id: 'admin', label: 'Admin' },
  { id: 'agent_manager', label: 'Agent Manager' },
  { id: 'analyst', label: 'Analyst' },
];

const EVENT_OPTIONS: Array<{ key: keyof AlertSettings['events']; label: string; desc: string }> = [
  {
    key: 'NO_PROVIDER_CONFIGURED',
    label: 'Sin proveedores activos',
    desc: 'Dispara alerta cuando no hay tokens/modelos configurados para responder.',
  },
  {
    key: 'ALL_PROVIDERS_FAILED',
    label: 'Todos los proveedores fallan',
    desc: 'Dispara alerta cuando fallan todos los modelos configurados.',
  },
  {
    key: 'FREE_FALLBACK_FAILED',
    label: 'Fallback gratuito falla',
    desc: 'Dispara alerta cuando tambien falla el fallback de modelos gratuitos.',
  },
  {
    key: 'DIAGNOSTIC_WARNINGS',
    label: 'Diagnostico con advertencias',
    desc: 'Genera alerta cuando el Centro de Ayuda encuentra warnings operativos.',
  },
  {
    key: 'DIAGNOSTIC_FAILURE',
    label: 'Diagnostico con error',
    desc: 'Genera alerta cuando el diagnostico detecta fallos criticos.',
  },
  {
    key: 'WIDGET_INACTIVE',
    label: 'Widget inactivo',
    desc: 'Genera alerta cuando la config del widget queda desactivada.',
  },
  {
    key: 'PUBLIC_API_UNHEALTHY',
    label: 'API publica no saludable',
    desc: 'Genera alerta cuando /api/public/widget no responde correctamente.',
  },
];

export default function AlertsSettingsPage({ embedded = false }: { embedded?: boolean }) {
  const [settings, setSettings] = useState<AlertSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    fetch('/api/settings/alerts')
      .then((r) => r.json())
      .then((data) => {
        if (!data?.error) {
          setSettings((prev) => ({
            ...prev,
            ...data,
            events: { ...prev.events, ...(data.events ?? {}) },
          }));
        }
      })
      .catch(() => {});
  }, []);

  function toggleRecipient(role: string, checked: boolean) {
    const next = checked
      ? Array.from(new Set([...settings.recipients, role]))
      : settings.recipients.filter((r) => r !== role);
    setSettings((s) => ({ ...s, recipients: next }));
  }

  function toggleEvent(key: keyof AlertSettings['events'], checked: boolean) {
    setSettings((s) => ({ ...s, events: { ...s.events, [key]: checked } }));
  }

  async function saveSettings() {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/settings/alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      setFeedback(res.ok && data.ok ? { ok: true, msg: 'Alertas guardadas correctamente.' } : { ok: false, msg: data.error ?? 'Error al guardar.' });
    } catch {
      setFeedback({ ok: false, msg: 'Error de red.' });
    }
    setSaving(false);
    setTimeout(() => setFeedback(null), 4000);
  }

  const content = (
    <>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">Modulo de Alertas Operativas</div>
        <p style={{ fontSize: 13, color: 'var(--g05)', marginTop: 6, marginBottom: 14 }}>
          Define eventos criticos de IA y que roles deben recibir alertas en el dashboard.
        </p>

        <div className="toggle-row" style={{ marginBottom: 16 }}>
          <div className="toggle-info">
            <div className="toggle-title">Alertas activas</div>
            <div className="toggle-desc">Si desactivas esto, no se crean alertas por fallas de modelos.</div>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => setSettings((s) => ({ ...s, enabled: e.target.checked }))}
            />
            <span className="toggle-track" />
            <span className="toggle-thumb" />
          </label>
        </div>

        <div className="field" style={{ marginBottom: 0 }}>
          <label className="label">Ventana de deduplicacion (minutos)</label>
          <input
            className="input"
            type="number"
            min={1}
            max={120}
            value={settings.throttleMinutes}
            onChange={(e) => setSettings((s) => ({ ...s, throttleMinutes: Number(e.target.value) }))}
            style={{ maxWidth: 140 }}
          />
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">Eventos</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
          {EVENT_OPTIONS.map((item) => (
            <label key={item.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <input
                type="checkbox"
                checked={settings.events[item.key]}
                onChange={(e) => toggleEvent(item.key, e.target.checked)}
                style={{ marginTop: 3, accentColor: 'var(--acc)' }}
              />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--g07)' }}>{item.label}</div>
                <div style={{ fontSize: 12, color: 'var(--g05)' }}>{item.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">Roles Destinatarios</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8, marginTop: 12 }}>
          {ROLE_OPTIONS.map((role) => (
            <label key={role.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: '1px solid var(--g03)', borderRadius: 8 }}>
              <input
                type="checkbox"
                checked={settings.recipients.includes(role.id)}
                onChange={(e) => toggleRecipient(role.id, e.target.checked)}
                style={{ accentColor: 'var(--acc)' }}
              />
              <span style={{ fontSize: 13, color: 'var(--g06)' }}>{role.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">Configuracion de modelos gratuitos</div>
        <div style={{ fontSize: 12, color: 'var(--g05)', lineHeight: 1.65 }}>
          1. Ve a <strong style={{ color: 'var(--g06)' }}>Configuracion &gt; Orquestacion IA</strong>.
          <br />
          2. Activa <strong style={{ color: 'var(--g06)' }}>Usar fallback de modelos gratuitos</strong>.
          <br />
          3. Define modelos `:free` (uno por linea) y una API key de OpenRouter o variable de entorno.
          <br />
          4. Opcional: deja mensaje seguro para contingencia cuando todo falle.
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button className="btn btn-primary" onClick={saveSettings} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar Alertas'}
        </button>
        {feedback && (
          <span style={{ fontSize: 13, fontWeight: 500, color: feedback.ok ? 'var(--acc)' : 'var(--red)' }}>
            {feedback.msg}
          </span>
        )}
      </div>
    </>
  );

  if (embedded) return <div style={{ paddingTop: 8 }}>{content}</div>;

  return (
    <div className="dash-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Alertas</h1>
          <p className="page-sub">Configura eventos operativos y destinatarios de alertas</p>
        </div>
      </div>
      {content}
    </div>
  );
}
