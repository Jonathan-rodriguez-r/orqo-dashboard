'use client';

import { useEffect, useState } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────
interface Template {
  type: string; name: string; description: string; requiredEnv: string[]; toolCount: number;
}
interface McpServer {
  id: string; name: string; type: string; active: boolean;
  tools: Array<{ name: string; description: string }>;
}
interface CoreStatus {
  provisioned: boolean; coreWorkspaceId?: string;
  webhookUrl?: string; metaWebhookUrl?: string; webhookUrlValid?: boolean;
  provisionedAt?: string;
}
interface ChannelInfo {
  phoneNumberId?: string; igAccountId?: string; pageId?: string; tokenPrefix?: string;
}
interface CoreChannels {
  whatsapp?: ChannelInfo | null;
  instagram?: ChannelInfo | null;
  facebook?: ChannelInfo | null;
}
interface AgentChannels {
  whatsapp?: boolean;
  instagram?: boolean;
  messenger?: boolean;
}
interface SiteKey {
  id: string; keyPrefix: string; label: string; createdAt: string; lastUsedAt: string | null;
}

// ── Icons ──────────────────────────────────────────────────────────────────────
const IconCopy = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="5.5" y="5.5" width="9" height="9" rx="1"/>
    <path d="M10.5 5.5V3A1.5 1.5 0 0 0 9 1.5H3A1.5 1.5 0 0 0 1.5 3v6A1.5 1.5 0 0 0 3 10.5h2.5" strokeLinecap="round"/>
  </svg>
);
const IconPlug = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M6 1.5v4M10 1.5v4M4 5.5h8v1.5a3.5 3.5 0 0 1-3.5 3.5H8V14.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconTrash = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M2 4h12M5.5 4V2.5h5V4M6.5 7v5M9.5 7v5M3.5 4l.75 9.5h7.5L12.5 4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconCheck = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M2.5 8.5 6 12l7.5-8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconEdit = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M11.5 2.5 13.5 4.5l-9 9H2.5v-2l9-9Z" strokeLinejoin="round"/>
  </svg>
);

// ── Icons adicionales ──────────────────────────────────────────────────────────
const IconBolt = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M9 1.5 3.5 9H8l-1 5.5 5.5-7.5H8L9 1.5Z" strokeLinejoin="round"/>
  </svg>
);
const IconManual = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="2" y="2" width="12" height="12" rx="1.5"/>
    <path d="M5 8h6M5 5.5h4M5 10.5h3" strokeLinecap="round"/>
  </svg>
);

// ── Channel config panel ───────────────────────────────────────────────────────
interface ChannelPanelProps {
  label: string;
  icon: string;
  description: string;
  channel: 'whatsapp' | 'instagram' | 'facebook';
  info: ChannelInfo | null | undefined;
  fields: Array<{ key: string; label: string; placeholder: string }>;
  agentCovered: boolean;
  fastDeploy?: boolean;
  fastConnecting?: boolean;
  fastError?: string;
  fastOAuthDone?: boolean;
  fastWabaInput?: string;
  fastSubmitting?: boolean;
  onFastConnect?: () => void;
  onFastWabaChange?: (v: string) => void;
  onFastWabaSubmit?: () => void;
  onSave: (channel: string, data: Record<string, string>) => Promise<void>;
  onDelete: (channel: string) => Promise<void>;
}

function ChannelPanel({ label, icon, description, channel, info, fields, agentCovered, fastDeploy, fastConnecting, fastError, fastOAuthDone, fastWabaInput, fastSubmitting, onFastConnect, onFastWabaChange, onFastWabaSubmit, onSave, onDelete }: ChannelPanelProps) {
  const [mode, setMode]       = useState<'fast' | 'manual'>(fastDeploy && !info ? 'fast' : 'manual');
  const [editing, setEditing] = useState(!info);
  const [values, setValues]   = useState<Record<string, string>>({});
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => { setEditing(!info); setValues({}); setError(''); }, [info]);

  async function save() {
    setSaving(true); setError('');
    try {
      await onSave(channel, values);
      setEditing(false); setValues({});
    } catch (e: any) { setError(e.message ?? 'Error guardando'); }
    finally { setSaving(false); }
  }

  async function remove() {
    if (!confirm(`¿Desconectar ${label}?`)) return;
    setSaving(true);
    try { await onDelete(channel); }
    finally { setSaving(false); }
  }

  return (
    <div className="card-sm" style={{ padding: '16px 18px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>{icon}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--g07)' }}>{label}</div>
            <div style={{ fontSize: 11.5, color: 'var(--g05)' }}>{description}</div>
          </div>
        </div>
        {info && !editing && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(true); setMode('manual'); setValues({}); }}>
              <IconEdit />Editar
            </button>
            <button className="btn btn-danger btn-sm btn-icon" onClick={remove} disabled={saving}>
              <IconTrash />
            </button>
          </div>
        )}
      </div>

      {/* ── Configurado — info enmascarada ── */}
      {info && !editing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {fields.map(f => {
            const val = info[f.key as keyof ChannelInfo];
            return val ? (
              <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11.5, color: 'var(--g05)', width: 120, flexShrink: 0 }}>{f.label}</span>
                <code style={{ fontSize: 12, color: 'var(--g06)', fontFamily: 'var(--f-mono)' }}>{val}</code>
              </div>
            ) : null;
          })}
          {info.tokenPrefix && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11.5, color: 'var(--g05)', width: 120, flexShrink: 0 }}>Access Token</span>
              <code style={{ fontSize: 12, color: 'var(--g06)', fontFamily: 'var(--f-mono)' }}>
                {info.tokenPrefix}••••••••
              </code>
            </div>
          )}
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className="badge badge-green" style={{ fontSize: 11 }}><IconCheck />Conectado</span>
            {!agentCovered && (
              <span className="badge badge-yellow" style={{ fontSize: 11 }}>⚠ Sin agente asignado</span>
            )}
          </div>
          {!agentCovered && (
            <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 'var(--radius)', background: 'rgba(245,180,60,0.08)', border: '1px solid rgba(245,180,60,0.25)', fontSize: 12, color: 'var(--yellow)', lineHeight: 1.6 }}>
              Ningún agente activo tiene el canal <b>{label}</b> habilitado. Ve a{' '}
              <a href="/dashboard/agents" style={{ color: 'var(--acc)', textDecoration: 'underline' }}>Agentes</a>
              {' '}→ edita un agente → activa el canal.
            </div>
          )}
        </div>
      )}

      {/* ── Formulario de conexión / edición ── */}
      {(!info || editing) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Selector de modo — solo si el canal soporta Fast Deploy */}
          {fastDeploy && (
            <div style={{ display: 'flex', gap: 0, background: 'var(--g02)', borderRadius: 'var(--radius)', padding: 3 }}>
              <button
                onClick={() => setMode('fast')}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '7px 0', borderRadius: 'calc(var(--radius) - 2px)', border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600,
                  background: mode === 'fast' ? 'var(--g04)' : 'transparent',
                  color: mode === 'fast' ? 'var(--g08)' : 'var(--g05)',
                  transition: 'all 0.15s',
                }}
              >
                <IconBolt />WhatsApp Business Fast Deploy
              </button>
              <button
                onClick={() => setMode('manual')}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '7px 0', borderRadius: 'calc(var(--radius) - 2px)', border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600,
                  background: mode === 'manual' ? 'var(--g04)' : 'transparent',
                  color: mode === 'manual' ? 'var(--g08)' : 'var(--g05)',
                  transition: 'all 0.15s',
                }}
              >
                <IconManual />Manual (Webhook)
              </button>
            </div>
          )}

          {/* ── Guided setup (System User Token) ── */}
          {fastDeploy && mode === 'fast' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              <div style={{ padding: '12px 14px', borderRadius: 'var(--radius)', background: 'var(--g01)', border: '1px solid var(--g03)', fontSize: 12, color: 'var(--g05)', lineHeight: 1.7 }}>
                Conecta tu cuenta de WhatsApp Business usando el flujo oficial de Meta.
                Esto configurará automáticamente tu <b style={{ color: 'var(--g06)' }}>WABA ID</b>,{' '}
                <b style={{ color: 'var(--g06)' }}>Phone Number ID</b> y{' '}
                <b style={{ color: 'var(--g06)' }}>Access Token</b> — sin copiar ni pegar nada.
              </div>

              {fastError && (
                <div style={{ padding: '8px 10px', borderRadius: 'var(--radius)', background: 'rgba(220,60,60,0.08)', border: '1px solid rgba(220,60,60,0.25)', fontSize: 12, color: '#e05555', lineHeight: 1.5 }}>
                  {fastError}
                </div>
              )}

              <button
                className="btn btn-primary"
                style={{ width: '100%', padding: '11px 0', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                onClick={onFastConnect}
                disabled={fastConnecting}
              >
                {fastConnecting ? (
                  <>
                    <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                    Conectando con Meta…
                  </>
                ) : (
                  <>
                    {/* Meta icon */}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/>
                    </svg>
                    Conectar con Meta
                  </>
                )}
              </button>

              <div style={{ fontSize: 11, color: 'var(--g04)', textAlign: 'center' }}>
                ¿Prefieres ingresar las credenciales manualmente?{' '}
                <button onClick={() => setMode('manual')} style={{ background: 'none', border: 'none', color: 'var(--acc)', cursor: 'pointer', fontSize: 11, padding: 0, textDecoration: 'underline' }}>
                  Configuración manual
                </button>
              </div>
            </div>
          )}

          {/* ── Manual (Webhook) ── */}
          {(!fastDeploy || mode === 'manual') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {fields.map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 11, color: 'var(--g05)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {f.label}
                  </label>
                  <input
                    className="input"
                    placeholder={f.placeholder}
                    value={values[f.key] ?? ''}
                    onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 11, color: 'var(--g05)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Access Token
                </label>
                <input
                  className="input input-mono"
                  type="password"
                  placeholder="EAAxxxxxxxxxx..."
                  value={values['accessToken'] ?? ''}
                  onChange={e => setValues(v => ({ ...v, accessToken: e.target.value }))}
                />
                <div style={{ fontSize: 11, color: 'var(--g05)', marginTop: 4, lineHeight: 1.6 }}>
                  Usa un <b>System User Token</b> permanente:<br/>
                  Meta Business Suite → Configuración → Usuarios del sistema → genera token con permisos <code>whatsapp_business_management</code> y <code>whatsapp_business_messaging</code>.
                </div>
              </div>
              {error && <div style={{ fontSize: 12, color: 'var(--red)' }}>{error}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
                {info && (
                  <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(false); setValues({}); setError(''); }}>
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

// ── WordPress Site Key panel ───────────────────────────────────────────────────
function WordPressPanel() {
  const [keys, setKeys]           = useState<SiteKey[]>([]);
  const [loadingKeys, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newLabel, setNewLabel]   = useState('');
  const [newKey, setNewKey]       = useState<{ id: string; plaintext: string; keyPrefix: string } | null>(null);
  const [copiedNew, setCopiedNew] = useState(false);

  async function loadKeys() {
    setLoading(true);
    const res = await fetch('/api/plugin/site-key').then(r => r.json()) as SiteKey[];
    setKeys(Array.isArray(res) ? res : []);
    setLoading(false);
  }

  useEffect(() => { void loadKeys(); }, []);

  async function generate() {
    setGenerating(true);
    const res = await fetch('/api/plugin/site-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: newLabel || 'WordPress' }),
    }).then(r => r.json()) as any;
    setNewKey({ id: res.id, plaintext: res.plaintext, keyPrefix: res.keyPrefix });
    setNewLabel('');
    await loadKeys();
    setGenerating(false);
  }

  async function revoke(id: string) {
    if (!confirm('¿Revocar esta Site Key? El plugin de WordPress perderá conexión inmediatamente.')) return;
    await fetch(`/api/plugin/site-key?id=${id}`, { method: 'DELETE' });
    await loadKeys();
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(() => { setCopiedNew(true); setTimeout(() => setCopiedNew(false), 1800); });
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 18 }}>🔌</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--g08)' }}>WordPress</span>
            <span className="badge" style={{ fontSize: 11 }}>Plugin v2</span>
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--g05)', margin: 0 }}>
            Conecta tu sitio WordPress al widget de ORQO. Opcionalmente habilita WooCommerce como fuente de datos del agente.
          </p>
        </div>
      </div>

      {/* New key alert */}
      {newKey && (
        <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 'var(--radius)', background: 'rgba(245,180,60,0.08)', border: '1px solid rgba(245,180,60,0.25)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--yellow)', marginBottom: 6 }}>
            Guarda esta Site Key — no se mostrará de nuevo
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <code style={{ flex: 1, fontSize: 11.5, color: 'var(--g07)', fontFamily: 'var(--f-mono)', wordBreak: 'break-all' }}>
              {newKey.plaintext}
            </code>
            <button className={`btn btn-ghost btn-sm${copiedNew ? ' btn-primary' : ''}`} onClick={() => copy(newKey.plaintext)}>
              {copiedNew ? <><IconCheck />Copiado</> : <><IconCopy />Copiar</>}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setNewKey(null)} style={{ flexShrink: 0, fontSize: 11 }}>
              Cerrar
            </button>
          </div>
          <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--g05)' }}>
            Pégala en <strong>tu WordPress → Ajustes → ORQO Chat → Site Key</strong> y haz clic en "Verificar conexión".
          </div>
        </div>
      )}

      {/* Keys list */}
      {loadingKeys ? (
        <div style={{ fontSize: 12.5, color: 'var(--g04)', padding: '8px 0' }}>Cargando…</div>
      ) : keys.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
          {keys.map(k => (
            <div key={k.id} className="card-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', gap: 10 }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--g07)' }}>{k.label}</span>
                <span style={{ marginLeft: 10, fontFamily: 'var(--f-mono)', fontSize: 11.5, color: 'var(--g05)' }}>{k.keyPrefix}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, color: 'var(--g04)' }}>
                  {k.lastUsedAt ? `Usado ${new Date(k.lastUsedAt).toLocaleDateString('es-CO')}` : 'Sin usar'}
                </span>
                <button className="btn btn-danger btn-sm btn-icon" onClick={() => revoke(k.id)} title="Revocar">
                  <IconTrash />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: 12.5, color: 'var(--g04)', margin: '0 0 14px' }}>No hay Site Keys. Genera una para conectar tu plugin de WordPress.</p>
      )}

      {/* Generate new key */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          className="input"
          style={{ flex: 1, maxWidth: 260 }}
          placeholder="Etiqueta (ej: Mi tienda)"
          value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
        />
        <button className="btn btn-primary btn-sm" onClick={generate} disabled={generating}>
          {generating ? 'Generando…' : 'Nueva Site Key'}
        </button>
      </div>

      {/* Instructions */}
      <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 'var(--radius)', background: 'var(--g01)', border: '1px solid var(--g03)', fontSize: 12, color: 'var(--g05)', lineHeight: 1.7 }}>
        <b style={{ color: 'var(--g06)' }}>Cómo conectar:</b>
        <ol style={{ margin: '6px 0 0 16px', padding: 0, lineHeight: 1.8 }}>
          <li>Genera una Site Key arriba</li>
          <li>Instala el plugin en WordPress: <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11 }}>orqo-chat.zip</span></li>
          <li>Ve a <b>WordPress → Ajustes → ORQO Chat</b> y pega la Site Key</li>
          <li>Haz clic en <b>Verificar conexión</b> — el widget se activa automáticamente</li>
          <li>Opcional: habilita el toggle de WooCommerce para conectar tu tienda como fuente de datos</li>
        </ol>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function IntegrationsPage() {
  const [coreStatus, setCoreStatus]     = useState<CoreStatus | null>(null);
  const [catalog, setCatalog]           = useState<Template[]>([]);
  const [servers, setServers]           = useState<McpServer[]>([]);
  const [channels, setChannels]         = useState<CoreChannels>({});
  const [agentCoverage, setAgentCoverage] = useState<Record<string, boolean>>({});
  const [loading, setLoading]           = useState(true);
  const [provisioning, setProvisioning] = useState(false);
  const [connectingType, setConnectingType] = useState<string | null>(null);
  const [credentials, setCredentials]   = useState<Record<string, string>>({});
  const [apiKeyResult, setApiKeyResult] = useState<string | null>(null);
  const [copied, setCopied]             = useState(false);
  const [copiedKey, setCopiedKey]       = useState(false);
  const [metaConnecting, setMetaConnecting] = useState(false);
  const [metaError, setMetaError]           = useState('');
  const [metaOAuthCode, setMetaOAuthCode]   = useState('');   // set after OAuth succeeds
  const [metaWabaInput, setMetaWabaInput]   = useState('');   // WABA ID entered by user
  const [metaSubmitting, setMetaSubmitting] = useState(false);
  const [metaSuccess, setMetaSuccess]       = useState<{ wabaId: string; phoneNumberId: string; displayPhone: string } | null>(null);

  // ── Facebook SDK loader ────────────────────────────────────────────────────
  useEffect(() => {
    const appId = process.env.NEXT_PUBLIC_META_APP_ID;
    if (!appId) return;

    function initFB() {
      (window as any).FB.init({ appId, version: 'v25.0', cookie: true, xfbml: false, autoLogAppEvents: true });
    }

    // If FB already loaded from cache, init immediately
    if ((window as any).FB) {
      initFB();
      return;
    }

    // Otherwise set the async init callback and inject the script once
    (window as any).fbAsyncInit = initFB;

    if (!document.getElementById('facebook-jssdk')) {
      const script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      document.body.appendChild(script);
    }
  }, []);

  // ── Integration event logger (client-side) ───────────────────────────────
  function logIntegrationEvent(event: string, detail?: string) {
    void fetch('/api/integrations/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, detail, channel: 'whatsapp' }),
    });
  }

  // ── Meta Embedded Signup — lanza el popup oficial de Meta ────────────────
  function handleMetaSignup() {
    const fb = (window as any).FB;
    if (!fb) {
      setMetaError('Facebook SDK no disponible. Recarga la página e intenta de nuevo.');
      return;
    }
    const configId = process.env.NEXT_PUBLIC_META_CONFIG_ID;
    if (!configId) {
      setMetaError('NEXT_PUBLIC_META_CONFIG_ID no configurado en Vercel.');
      return;
    }

    setMetaConnecting(true);
    setMetaError('');
    setMetaSuccess(null);

    // Captura WABA ID + Phone Number ID desde el evento de sesión de Meta
    // (se dispara durante el flujo, antes del callback de login)
    let capturedWabaId = '';
    let capturedPhoneNumberId = '';

    fb.Event.subscribe(
      'WhatsAppEmbeddedSignup.sessionInfoVersion.3',
      (data: any) => {
        capturedWabaId        = data?.waba_id        ?? '';
        capturedPhoneNumberId = data?.phone_number_id ?? '';
      },
    );

    fb.login(
      async (response: any) => {
        const token = response?.authResponse?.access_token ?? response?.authResponse?.code ?? '';
        if (!token) {
          setMetaError(
            response?.status === 'not_authorized'
              ? 'Conexión no autorizada. Verifica que tu cuenta Meta tiene acceso al WABA.'
              : 'Conexión cancelada.',
          );
          setMetaConnecting(false);
          return;
        }

        try {
          const res = await fetch('/api/core/channels/meta/onboard', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token,
              wabaId:        capturedWabaId        || undefined,
              phoneNumberId: capturedPhoneNumberId || undefined,
            }),
          }).then(r => r.json()) as any;

          if (res.error) {
            setMetaError(res.error);
          } else {
            setMetaSuccess({
              wabaId:        capturedWabaId || '—',
              phoneNumberId: res.phoneNumberId,
              displayPhone:  res.displayPhone,
            });
            logIntegrationEvent('embedded_signup_success', `waba:${capturedWabaId} phoneId:${res.phoneNumberId}`);
            await load();
          }
        } catch (e: any) {
          setMetaError(e.message ?? 'Error conectando con Meta.');
        }
        setMetaConnecting(false);
      },
      {
        config_id:                    configId,
        response_type:                'token',
        override_default_response_type: true,
        extras: {
          setup:              {},
          featureName:        'whatsapp_embedded_signup',
          sessionInfoVersion: '3',
        },
      },
    );
  }

  async function handleMetaSubmitWaba() {
    // no-op — reemplazado por handleMetaSignup (Embedded Signup)
  }

  async function load() {
    setLoading(true);
    const [statusRes, catalogRes, agentsRes] = await Promise.all([
      fetch('/api/core/provision').then(r => r.json()),
      fetch('/api/core/catalog').then(r => r.json()),
      fetch('/api/agents').then(r => r.json()),
    ]);
    const status = statusRes as CoreStatus;
    setCoreStatus(status);
    setCatalog(catalogRes as Template[]);

    // Compute which channels have at least one active agent assigned
    const activeAgents = (Array.isArray(agentsRes) ? agentsRes : [])
      .filter((a: any) => a.status === 'active');
    setAgentCoverage({
      whatsapp:  activeAgents.some((a: any) => a.channels?.whatsapp  === true),
      instagram: activeAgents.some((a: any) => a.channels?.instagram === true),
      facebook:  activeAgents.some((a: any) => a.channels?.messenger === true),
    });

    if (status.provisioned) {
      const [mcpRes, chanRes] = await Promise.all([
        fetch('/api/core/mcp').then(r => r.json()),
        fetch('/api/core/channels').then(r => r.json()),
      ]);
      setServers(Array.isArray(mcpRes) ? mcpRes as McpServer[] : []);
      setChannels((chanRes as any) ?? {});
    }
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function provision() {
    setProvisioning(true);
    const res = await fetch('/api/core/provision', { method: 'POST' }).then(r => r.json()) as any;
    if (res.ok && res.apiKeyPlaintext) setApiKeyResult(res.apiKeyPlaintext as string);
    await load();
    setProvisioning(false);
  }

  async function saveChannel(channel: string, data: Record<string, string>) {
    const res = await fetch(`/api/core/channels?channel=${channel}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(r => r.json()) as any;
    if (res.error) throw new Error(res.error);
    await load();
  }

  async function deleteChannel(channel: string) {
    await fetch(`/api/core/channels?channel=${channel}`, { method: 'DELETE' });
    await load();
  }

  async function connect(type: string) {
    await fetch('/api/core/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, credentials }),
    });
    setConnectingType(null); setCredentials({});
    await load();
  }

  async function toggle(server: McpServer) {
    await fetch(`/api/core/mcp/${server.id}?action=${server.active ? 'disable' : 'enable'}`, { method: 'POST' });
    await load();
  }

  async function remove(mcpId: string) {
    if (!confirm('¿Eliminar esta integración?')) return;
    await fetch(`/api/core/mcp/${mcpId}`, { method: 'DELETE' });
    await load();
  }

  function copyText(text: string, fn: (v: boolean) => void) {
    navigator.clipboard.writeText(text).then(() => { fn(true); setTimeout(() => fn(false), 1800); });
  }

  const connectingTemplate = catalog.find(t => t.type === connectingType);

  if (loading) return (
    <div style={{ textAlign: 'center', color: 'var(--g05)', padding: '48px 0', fontSize: 13 }}>
      Cargando integraciones…
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* ── Motor de agentes ──────────────────────────────────────────────────── */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: coreStatus?.provisioned ? 20 : 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--g08)' }}>Motor de agentes (orqo-core)</span>
              {coreStatus?.provisioned
                ? <span className="badge badge-green"><span className="dot dot-green" style={{ width: 6, height: 6 }}/>Activo</span>
                : <span className="badge badge-yellow">No provisionado</span>}
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--g05)', margin: 0 }}>
              Procesa mensajes y ejecuta integraciones MCP
            </p>
          </div>
        </div>

        {coreStatus?.provisioned ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11.5, color: 'var(--g05)', width: 110, flexShrink: 0 }}>Webhook URL</span>
              <code className="input input-mono" style={{ flex: 1, fontSize: 11.5, padding: '5px 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {coreStatus.webhookUrl}
              </code>
              <button className={`btn btn-ghost btn-sm${copied ? ' btn-primary' : ''}`} style={{ flexShrink: 0 }}
                onClick={() => copyText(coreStatus.webhookUrl ?? '', setCopied)}>
                {copied ? <><IconCheck />Copiado</> : <><IconCopy />Copiar</>}
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11.5, color: 'var(--g05)', width: 110, flexShrink: 0 }}>Workspace ID</span>
              <code className="input input-mono" style={{ flex: 1, fontSize: 11.5, padding: '5px 10px' }}>
                {coreStatus.coreWorkspaceId}
              </code>
            </div>
            {coreStatus.provisionedAt && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11.5, color: 'var(--g05)', width: 110, flexShrink: 0 }}>Provisionado</span>
                <span style={{ fontSize: 12.5, color: 'var(--g06)' }}>
                  {new Date(coreStatus.provisionedAt).toLocaleDateString('es-CO', { dateStyle: 'long' })}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 13, color: 'var(--g05)', margin: 0 }}>
              El workspace aún no está conectado al motor de procesamiento.
              Provisiona para habilitar canales e integraciones MCP.
            </p>
            <div>
              <button className="btn btn-primary" onClick={provision} disabled={provisioning}>
                <IconPlug />{provisioning ? 'Provisionando…' : 'Conectar al motor de agentes'}
              </button>
            </div>
          </div>
        )}

        {apiKeyResult && (
          <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 'var(--radius)', background: 'rgba(245,180,60,0.08)', border: '1px solid rgba(245,180,60,0.25)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--yellow)', marginBottom: 6 }}>
              Guarda esta API Key — no se mostrará de nuevo
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <code style={{ flex: 1, fontSize: 11.5, color: 'var(--g07)', fontFamily: 'var(--f-mono)', wordBreak: 'break-all' }}>
                {apiKeyResult}
              </code>
              <button className={`btn btn-ghost btn-sm${copiedKey ? ' btn-primary' : ''}`}
                onClick={() => copyText(apiKeyResult, setCopiedKey)}>
                {copiedKey ? <><IconCheck />Copiado</> : <><IconCopy />Copiar</>}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Canales Meta ──────────────────────────────────────────────────────── */}
      {coreStatus?.provisioned && (
        <div>
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--g07)' }}>Canales de entrada</div>
            <div style={{ fontSize: 12, color: 'var(--g05)', marginTop: 2 }}>
              Credenciales por workspace — cifradas en MongoDB, nunca en variables de entorno.
              Obtenlas desde{' '}
              <span style={{ color: 'var(--acc)' }}>Meta Business Suite → Configuración → API de WhatsApp</span>.
            </div>
          </div>

          {/* Global warning: configured channels without an agent */}
          {(() => {
            const uncovered = [
              channels.whatsapp  && !agentCoverage.whatsapp  && 'WhatsApp',
              channels.instagram && !agentCoverage.instagram && 'Instagram',
              channels.facebook  && !agentCoverage.facebook  && 'Facebook',
            ].filter(Boolean);
            return uncovered.length > 0 ? (
              <div style={{ marginBottom: 10, padding: '10px 14px', borderRadius: 'var(--radius)', background: 'rgba(245,180,60,0.08)', border: '1px solid rgba(245,180,60,0.3)', fontSize: 12.5, color: 'var(--yellow)', lineHeight: 1.7 }}>
                <b>⚠ Acción requerida:</b> Los canales <b>{uncovered.join(', ')}</b> están configurados pero
                ningún agente activo los tiene habilitados — los mensajes entrantes serán ignorados.{' '}
                <a href="/dashboard/agents" style={{ color: 'var(--acc)', textDecoration: 'underline' }}>
                  Ir a Agentes →
                </a>
              </div>
            ) : null;
          })()}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <ChannelPanel
              label="WhatsApp Business"
              icon="💬"
              description="API oficial de Meta — mensajes entrantes y salientes"
              channel="whatsapp"
              info={channels.whatsapp}
              fields={[{ key: 'phoneNumberId', label: 'Phone Number ID', placeholder: '1234567890123' }]}
              agentCovered={agentCoverage.whatsapp ?? false}
              fastDeploy={Boolean(process.env.NEXT_PUBLIC_META_APP_ID && process.env.NEXT_PUBLIC_META_CONFIG_ID)}
              fastConnecting={metaConnecting}
              fastError={metaError}
              onFastConnect={handleMetaSignup}
              onSave={saveChannel}
              onDelete={deleteChannel}
            />
            <ChannelPanel
              label="Instagram Business"
              icon="📸"
              description="DMs de Instagram gestionados por tu agente IA"
              channel="instagram"
              info={channels.instagram}
              fields={[{ key: 'igAccountId', label: 'Instagram Account ID', placeholder: '17841400000000000' }]}
              agentCovered={agentCoverage.instagram ?? false}
              onSave={saveChannel}
              onDelete={deleteChannel}
            />
            <ChannelPanel
              label="Facebook Messenger"
              icon="📘"
              description="Chatbot en tu página de Facebook"
              channel="facebook"
              info={channels.facebook}
              fields={[{ key: 'pageId', label: 'Page ID', placeholder: '123456789012345' }]}
              agentCovered={agentCoverage.facebook ?? false}
              onSave={saveChannel}
              onDelete={deleteChannel}
            />
          </div>
          {/* ── Toast: WhatsApp conectado vía Embedded Signup ── */}
          {metaSuccess && (
            <div style={{ marginTop: 4, padding: '12px 16px', borderRadius: 'var(--radius)', background: 'rgba(44,185,120,0.10)', border: '1px solid rgba(44,185,120,0.35)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ fontSize: 18, lineHeight: 1, marginTop: 1 }}>✅</span>
              <div style={{ fontSize: 12.5, lineHeight: 1.7 }}>
                <div style={{ fontWeight: 700, color: 'var(--acc)', marginBottom: 3 }}>WhatsApp Business conectado</div>
                {metaSuccess.wabaId !== '—' && (
                  <div style={{ color: 'var(--g05)' }}>WABA ID: <code style={{ fontFamily: 'var(--f-mono)', color: 'var(--g07)', fontSize: 12 }}>{metaSuccess.wabaId}</code></div>
                )}
                <div style={{ color: 'var(--g05)' }}>Phone Number ID: <code style={{ fontFamily: 'var(--f-mono)', color: 'var(--g07)', fontSize: 12 }}>{metaSuccess.phoneNumberId}</code></div>
                {metaSuccess.displayPhone && (
                  <div style={{ color: 'var(--g05)' }}>Número: <b style={{ color: 'var(--g07)' }}>{metaSuccess.displayPhone}</b></div>
                )}
                <div style={{ marginTop: 4, color: 'var(--g05)' }}>Tu cuenta está lista para recibir mensajes.</div>
              </div>
              <button
                onClick={() => setMetaSuccess(null)}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--g04)', fontSize: 16, lineHeight: 1, padding: 0, flexShrink: 0 }}
              >×</button>
            </div>
          )}

          {coreStatus.webhookUrlValid === false && (
            <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 'var(--radius)', background: 'rgba(220,60,60,0.08)', border: '1px solid rgba(220,60,60,0.3)', fontSize: 12, color: '#e05555', lineHeight: 1.7 }}>
              <b>⚠ Variable mal configurada:</b> <code style={{ fontSize: 11 }}>CORE_WEBHOOK_URL</code> en Vercel no es una URL válida.
              Debe ser <code style={{ fontSize: 11 }}>https://core.orqo.io</code> (sin barra al final, sin rutas adicionales).
            </div>
          )}
          <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 'var(--radius)', background: 'var(--g01)', border: '1px solid var(--g03)', fontSize: 12, color: 'var(--g05)', lineHeight: 1.7 }}>
            <b style={{ color: 'var(--g06)' }}>Webhook URL para Meta:</b>{' '}
            <code style={{ fontFamily: 'var(--f-mono)', color: coreStatus.webhookUrlValid === false ? '#e05555' : 'var(--acc)', fontSize: 11.5 }}>
              {coreStatus.metaWebhookUrl ?? coreStatus.webhookUrl ?? ''}
            </code>
            <br/>
            Configúrala en Meta Business Suite → WhatsApp → Configuración → Webhook. El token de verificación está en Railway bajo <code style={{ color: 'var(--acc)', fontSize: 11 }}>WHATSAPP_VERIFY_TOKEN</code>.
          </div>
        </div>
      )}

      {/* ── Integraciones activas (MCP) ───────────────────────────────────────── */}
      {coreStatus?.provisioned && servers.length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--g07)', marginBottom: 10 }}>
            Integraciones MCP activas
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {servers.map(server => (
              <div key={server.id} className="card-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--g07)' }}>{server.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--g04)' }}>{server.tools.length} tools</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button onClick={() => toggle(server)} className="btn btn-ghost btn-sm"
                    style={{ color: server.active ? 'var(--acc)' : 'var(--g05)', borderColor: server.active ? 'rgba(44,185,120,0.3)' : 'var(--g03)' }}>
                    {server.active ? <><span className="dot dot-green" style={{ width: 6, height: 6 }}/>Activa</> : 'Inactiva'}
                  </button>
                  <button className="btn btn-danger btn-sm btn-icon" onClick={() => remove(server.id)}>
                    <IconTrash />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── WordPress plugin ──────────────────────────────────────────────────── */}
      <WordPressPanel />

      {/* ── Catálogo MCP ──────────────────────────────────────────────────────── */}
      {coreStatus?.provisioned && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--g07)', marginBottom: 10 }}>
            Catálogo de integraciones MCP
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
            {catalog.map(template => {
              const alreadyAdded = servers.some(s => s.type === template.type);
              return (
                <div key={template.type} className="card-sm" style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--g07)', marginBottom: 2 }}>{template.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--g05)', lineHeight: 1.5 }}>{template.description}</div>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--g04)', flexShrink: 0 }}>{template.toolCount} tools</span>
                  </div>
                  {alreadyAdded
                    ? <span className="badge badge-green" style={{ fontSize: 11 }}><IconCheck />Conectada</span>
                    : <button className="btn btn-ghost btn-sm" style={{ width: '100%' }}
                        onClick={() => { setConnectingType(template.type); setCredentials({}); }}>
                        Conectar
                      </button>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Modal MCP credentials ─────────────────────────────────────────────── */}
      {connectingType && connectingTemplate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div className="card" style={{ width: '100%', maxWidth: 440, padding: '24px 28px' }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--g08)', marginBottom: 4 }}>
                Conectar {connectingTemplate.name}
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--g05)', margin: 0 }}>{connectingTemplate.description}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {connectingTemplate.requiredEnv.map(key => (
                <div key={key}>
                  <label style={{ fontSize: 11, color: 'var(--g05)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{key}</label>
                  <input className="input"
                    type={key.toLowerCase().includes('secret') || key.toLowerCase().includes('key') || key.toLowerCase().includes('token') ? 'password' : 'text'}
                    value={credentials[key] ?? ''}
                    onChange={e => setCredentials(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={key} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => { setConnectingType(null); setCredentials({}); }}>Cancelar</button>
              <button className="btn btn-primary" onClick={() => connect(connectingType)}>Guardar y conectar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
