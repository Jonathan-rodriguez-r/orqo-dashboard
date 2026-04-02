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

export default function IntegrationsPage() {
  const [coreStatus, setCoreStatus] = useState<CoreStatus | null>(null);
  const [catalog, setCatalog] = useState<Template[]>([]);
  const [servers, setServers] = useState<McpServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [provisioning, setProvisioning] = useState(false);
  const [connectingType, setConnectingType] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [apiKeyResult, setApiKeyResult] = useState<string | null>(null);

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
    const template = catalog.find(t => t.type === type);
    if (!template) return;
    const res = await fetch('/api/core/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, credentials }),
    }).then(r => r.json());
    if ((res as any).id) {
      setConnectingType(null);
      setCredentials({});
      await load();
    }
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

  const connectingTemplate = catalog.find(t => t.type === connectingType);

  if (loading) return (
    <div className="p-8 text-center text-neutral-500">Cargando integraciones...</div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Integraciones</h1>
        <p className="text-neutral-400 mt-1">
          Conecta tu workspace a sistemas externos. Los agentes accederán a ellos automáticamente.
        </p>
      </div>

      {/* Estado del Core */}
      <section className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-white">Motor de agentes (orqo-core)</h2>
            <p className="text-sm text-neutral-400">Procesa mensajes de WhatsApp y ejecuta integraciones</p>
          </div>
          {coreStatus?.provisioned ? (
            <span className="text-xs bg-emerald-900/40 text-emerald-400 border border-emerald-800 px-3 py-1 rounded-full">
              Activo
            </span>
          ) : (
            <span className="text-xs bg-yellow-900/40 text-yellow-400 border border-yellow-800 px-3 py-1 rounded-full">
              No provisionado
            </span>
          )}
        </div>

        {coreStatus?.provisioned ? (
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-neutral-500 w-32">Webhook URL</span>
              <code className="text-emerald-400 bg-neutral-800 px-2 py-0.5 rounded text-xs flex-1 truncate">
                {coreStatus.webhookUrl}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(coreStatus.webhookUrl ?? '')}
                className="text-xs text-neutral-400 hover:text-white border border-neutral-700 px-2 py-0.5 rounded"
              >
                Copiar
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-500 w-32">Workspace ID</span>
              <code className="text-neutral-300 bg-neutral-800 px-2 py-0.5 rounded text-xs">
                {coreStatus.coreWorkspaceId}
              </code>
            </div>
            {coreStatus.provisionedAt && (
              <div className="flex items-center gap-2">
                <span className="text-neutral-500 w-32">Provisionado</span>
                <span className="text-neutral-400 text-xs">
                  {new Date(coreStatus.provisionedAt).toLocaleDateString('es-CO', { dateStyle: 'long' })}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-neutral-400">
              El workspace aún no está conectado al motor de procesamiento de WhatsApp.
              Provisiona para habilitar integraciones y el webhook.
            </p>
            <button
              onClick={provision}
              disabled={provisioning}
              className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg font-medium"
            >
              {provisioning ? 'Provisionando...' : 'Conectar al motor de agentes'}
            </button>
          </div>
        )}

        {/* API Key result — solo aparece tras provisionar */}
        {apiKeyResult && (
          <div className="mt-3 p-3 rounded-lg bg-yellow-950/50 border border-yellow-800/60 space-y-1">
            <p className="text-xs font-medium text-yellow-300">Guarda esta API Key — no se mostrará de nuevo</p>
            <code className="text-xs text-yellow-200 break-all">{apiKeyResult}</code>
            <button
              onClick={() => { navigator.clipboard.writeText(apiKeyResult); }}
              className="text-xs text-yellow-400 underline"
            >
              Copiar
            </button>
          </div>
        )}
      </section>

      {/* Integraciones activas */}
      {coreStatus?.provisioned && servers.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold text-white">Integraciones activas</h2>
          <div className="space-y-2">
            {servers.map(server => (
              <div
                key={server.id}
                className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900/60 px-4 py-3"
              >
                <div>
                  <span className="text-white font-medium text-sm">{server.name}</span>
                  <span className="ml-2 text-xs text-neutral-500">{server.tools.length} tools</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggle(server)}
                    className={`text-xs px-3 py-1 rounded-full border font-medium ${
                      server.active
                        ? 'text-emerald-400 border-emerald-800 bg-emerald-900/30'
                        : 'text-neutral-400 border-neutral-700 bg-neutral-800/30'
                    }`}
                  >
                    {server.active ? 'Activa' : 'Inactiva'}
                  </button>
                  <button
                    onClick={() => remove(server.id)}
                    className="text-xs text-red-400 hover:text-red-300 border border-red-900/50 px-2 py-1 rounded"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Catálogo */}
      {coreStatus?.provisioned && (
        <section className="space-y-3">
          <h2 className="font-semibold text-white">Catálogo de integraciones</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {catalog.map(template => {
              const alreadyAdded = servers.some(s => s.type === template.type);
              return (
                <div
                  key={template.type}
                  className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-white text-sm">{template.name}</h3>
                      <p className="text-xs text-neutral-400 mt-0.5">{template.description}</p>
                    </div>
                    <span className="text-xs text-neutral-500 shrink-0 ml-2">{template.toolCount} tools</span>
                  </div>
                  {alreadyAdded ? (
                    <span className="text-xs text-emerald-500">Conectada</span>
                  ) : (
                    <button
                      onClick={() => { setConnectingType(template.type); setCredentials({}); }}
                      className="text-xs bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-1.5 rounded-lg w-full font-medium"
                    >
                      Conectar
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Modal de credenciales */}
      {connectingType && connectingTemplate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="font-semibold text-white">Conectar {connectingTemplate.name}</h3>
            <p className="text-sm text-neutral-400">{connectingTemplate.description}</p>
            <div className="space-y-3">
              {connectingTemplate.requiredEnv.map(key => (
                <div key={key}>
                  <label className="text-xs text-neutral-400 block mb-1">{key}</label>
                  <input
                    type={key.toLowerCase().includes('secret') || key.toLowerCase().includes('key') || key.toLowerCase().includes('token') ? 'password' : 'text'}
                    value={credentials[key] ?? ''}
                    onChange={e => setCredentials(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={key}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setConnectingType(null); setCredentials({}); }}
                className="text-sm text-neutral-400 hover:text-white px-4 py-2"
              >
                Cancelar
              </button>
              <button
                onClick={() => connect(connectingType)}
                className="text-sm bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium"
              >
                Guardar y conectar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
