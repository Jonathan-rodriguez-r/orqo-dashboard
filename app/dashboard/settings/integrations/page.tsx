'use client';

import { useEffect, useState } from 'react';

interface Template {
  type: string;
  name: string;
  description: string;
  requiredEnv: string[];
  toolCount: number;
}

interface McpServer {
  id: string;
  name: string;
  type: string;
  active: boolean;
  tools: Array<{ name: string; description: string }>;
}

interface CoreStatus {
  provisioned: boolean;
  coreWorkspaceId?: string;
  webhookUrl?: string;
  provisionedAt?: string;
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

export default function IntegrationsPage() {
  const [coreStatus, setCoreStatus]     = useState<CoreStatus | null>(null);
  const [catalog, setCatalog]           = useState<Template[]>([]);
  const [servers, setServers]           = useState<McpServer[]>([]);
  const [loading, setLoading]           = useState(true);
  const [provisioning, setProvisioning] = useState(false);
  const [connectingType, setConnectingType] = useState<string | null>(null);
  const [credentials, setCredentials]   = useState<Record<string, string>>({});
  const [apiKeyResult, setApiKeyResult] = useState<string | null>(null);
  const [copied, setCopied]             = useState(false);
  const [copiedKey, setCopiedKey]       = useState(false);

  async function load() {
    setLoading(true);
    const [statusRes, catalogRes] = await Promise.all([
      fetch('/api/core/provision').then(r => r.json()),
      fetch('/api/core/catalog').then(r => r.json()),
    ]);
    setCoreStatus(statusRes as CoreStatus);
    setCatalog(catalogRes as Template[]);
    if ((statusRes as CoreStatus).provisioned) {
      const mcpRes = await fetch('/api/core/mcp').then(r => r.json());
      setServers(Array.isArray(mcpRes) ? mcpRes as McpServer[] : []);
    }
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function provision() {
    setProvisioning(true);
    const res = await fetch('/api/core/provision', { method: 'POST' }).then(r => r.json()) as any;
    if (res.ok && res.apiKeyPlaintext) {
      setApiKeyResult(res.apiKeyPlaintext as string);
    }
    await load();
    setProvisioning(false);
  }

  async function connect(type: string) {
    await fetch('/api/core/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, credentials }),
    }).then(r => r.json());
    setConnectingType(null);
    setCredentials({});
    await load();
  }

  async function toggle(server: McpServer) {
    const action = server.active ? 'disable' : 'enable';
    await fetch(`/api/core/mcp/${server.id}?action=${action}`, { method: 'POST' });
    await load();
  }

  async function remove(mcpId: string) {
    if (!confirm('¿Eliminar esta integración?')) return;
    await fetch(`/api/core/mcp/${mcpId}`, { method: 'DELETE' });
    await load();
  }

  function copyToClipboard(text: string, setCopiedFn: (v: boolean) => void) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedFn(true);
      setTimeout(() => setCopiedFn(false), 1800);
    });
  }

  const connectingTemplate = catalog.find(t => t.type === connectingType);

  if (loading) return (
    <div style={{ textAlign: 'center', color: 'var(--g05)', padding: '48px 0', fontSize: 13 }}>
      Cargando integraciones…
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Motor de agentes ──────────────────────────────────────────────────── */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: coreStatus?.provisioned ? 20 : 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--g08)' }}>Motor de agentes (orqo-core)</span>
              {coreStatus?.provisioned
                ? <span className="badge badge-green"><span className="dot dot-green" style={{ width: 6, height: 6 }}/>Activo</span>
                : <span className="badge badge-yellow">No provisionado</span>
              }
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--g05)', margin: 0 }}>
              Procesa mensajes de WhatsApp y ejecuta integraciones MCP
            </p>
          </div>
        </div>

        {coreStatus?.provisioned ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Webhook URL */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11.5, color: 'var(--g05)', width: 110, flexShrink: 0 }}>Webhook URL</span>
              <code className="input input-mono" style={{ flex: 1, fontSize: 11.5, padding: '5px 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {coreStatus.webhookUrl}
              </code>
              <button
                className={`btn btn-ghost btn-sm${copied ? ' btn-primary' : ''}`}
                style={{ flexShrink: 0, gap: 5 }}
                onClick={() => copyToClipboard(coreStatus.webhookUrl ?? '', setCopied)}
              >
                {copied ? <><IconCheck />Copiado</> : <><IconCopy />Copiar</>}
              </button>
            </div>
            {/* Workspace ID */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11.5, color: 'var(--g05)', width: 110, flexShrink: 0 }}>Workspace ID</span>
              <code className="input input-mono" style={{ flex: 1, fontSize: 11.5, padding: '5px 10px' }}>
                {coreStatus.coreWorkspaceId}
              </code>
            </div>
            {/* Provisionado */}
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
              Provisiona para habilitar integraciones y el webhook de WhatsApp.
            </p>
            <div>
              <button className="btn btn-primary" onClick={provision} disabled={provisioning}>
                <IconPlug />
                {provisioning ? 'Provisionando…' : 'Conectar al motor de agentes'}
              </button>
            </div>
          </div>
        )}

        {/* API Key alert — solo tras provisionar */}
        {apiKeyResult && (
          <div style={{
            marginTop: 16, padding: '12px 14px', borderRadius: 'var(--radius)',
            background: 'rgba(245,180,60,0.08)', border: '1px solid rgba(245,180,60,0.25)',
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--yellow)', marginBottom: 6 }}>
              Guarda esta API Key — no se mostrará de nuevo
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <code style={{ flex: 1, fontSize: 11.5, color: 'var(--g07)', fontFamily: 'var(--f-mono)', wordBreak: 'break-all' }}>
                {apiKeyResult}
              </code>
              <button
                className={`btn btn-ghost btn-sm${copiedKey ? ' btn-primary' : ''}`}
                style={{ flexShrink: 0 }}
                onClick={() => copyToClipboard(apiKeyResult, setCopiedKey)}
              >
                {copiedKey ? <><IconCheck />Copiado</> : <><IconCopy />Copiar</>}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Integraciones activas ─────────────────────────────────────────────── */}
      {coreStatus?.provisioned && servers.length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--g07)', marginBottom: 10 }}>
            Integraciones activas
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {servers.map(server => (
              <div key={server.id} className="card-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--g07)' }}>{server.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--g04)' }}>{server.tools.length} tools</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    onClick={() => toggle(server)}
                    className={`btn btn-sm ${server.active ? 'btn-ghost' : 'btn-ghost'}`}
                    style={{
                      color: server.active ? 'var(--acc)' : 'var(--g05)',
                      borderColor: server.active ? 'rgba(44,185,120,0.3)' : 'var(--g03)',
                    }}
                  >
                    {server.active ? <><span className="dot dot-green" style={{ width: 6, height: 6 }}/>Activa</> : 'Inactiva'}
                  </button>
                  <button className="btn btn-danger btn-sm btn-icon" onClick={() => remove(server.id)} title="Eliminar">
                    <IconTrash />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Catálogo ──────────────────────────────────────────────────────────── */}
      {coreStatus?.provisioned && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--g07)', marginBottom: 10 }}>
            Catálogo de integraciones
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
            {catalog.map(template => {
              const alreadyAdded = servers.some(s => s.type === template.type);
              return (
                <div key={template.type} className="card-sm" style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--g07)', marginBottom: 2 }}>
                        {template.name}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--g05)', lineHeight: 1.5 }}>
                        {template.description}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--g04)', flexShrink: 0, whiteSpace: 'nowrap' }}>
                      {template.toolCount} tools
                    </span>
                  </div>
                  {alreadyAdded ? (
                    <span className="badge badge-green" style={{ fontSize: 11 }}>
                      <IconCheck />Conectada
                    </span>
                  ) : (
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ width: '100%' }}
                      onClick={() => { setConnectingType(template.type); setCredentials({}); }}
                    >
                      Conectar
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Modal de credenciales ─────────────────────────────────────────────── */}
      {connectingType && connectingTemplate && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 20,
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 440, padding: '24px 28px' }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--g08)', marginBottom: 4 }}>
                Conectar {connectingTemplate.name}
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--g05)', margin: 0 }}>
                {connectingTemplate.description}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {connectingTemplate.requiredEnv.map(key => (
                <div key={key}>
                  <label style={{ fontSize: 11, color: 'var(--g05)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {key}
                  </label>
                  <input
                    className="input"
                    type={key.toLowerCase().includes('secret') || key.toLowerCase().includes('key') || key.toLowerCase().includes('token') ? 'password' : 'text'}
                    value={credentials[key] ?? ''}
                    onChange={e => setCredentials(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={key}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                className="btn btn-ghost"
                onClick={() => { setConnectingType(null); setCredentials({}); }}
              >
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={() => connect(connectingType)}>
                Guardar y conectar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
