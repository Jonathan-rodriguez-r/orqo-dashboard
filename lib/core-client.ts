/**
 * Cliente HTTP para la Management API de orqo-core.
 * Solo se usa para operaciones de control: provisioning, MCP servers, rotate key.
 * Los datos de conversación se leen directamente de MongoDB (misma BD compartida).
 */

const CORE_URL = (process.env.CORE_MANAGEMENT_URL ?? 'http://localhost:3002').replace(/\/$/, '');
const CORE_SECRET = process.env.CORE_INTERNAL_SECRET ?? '';

async function coreRequest<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${CORE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(CORE_SECRET ? { 'x-orqo-internal-secret': CORE_SECRET } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(10_000),
    });
    const data = await res.json() as unknown;
    if (!res.ok) {
      return { ok: false, error: (data as any)?.error ?? `HTTP ${res.status}` };
    }
    return { ok: true, data: data as T };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export interface CoreWorkspace {
  workspaceId: string;
  name: string;
  status: string;
  plan: string;
  apiKeyPrefix: string;
  agentName: string;
  limits: { messagesPerMinute: number; maxActiveConversations: number };
  createdAt: string;
  trialEndsAt?: string;
}

export interface CoreProvisionResult {
  workspaceId: string;
  apiKeyPlaintext: string;
  agentId: string;
}

export interface CoreMcpServer {
  id: string;
  workspaceId: string;
  name: string;
  type: string;
  active: boolean;
  tools: Array<{ name: string; description: string }>;
  triggers: Array<{ type: string; value?: string }>;
  createdAt: string;
}

export interface CoreMcpTemplate {
  type: string;
  name: string;
  description: string;
  requiredEnv: string[];
  toolCount: number;
}

export const CoreClient = {
  /** Provisiona un workspace nuevo en el core. Llamar una vez al activar un workspace. */
  async provision(params: {
    name: string;
    agentName?: string;
    plan?: string;
    timezone?: string;
    trialDays?: number;
  }): Promise<{ ok: true; data: CoreProvisionResult } | { ok: false; error: string }> {
    return coreRequest<CoreProvisionResult>('POST', '/workspaces', params);
  },

  async getWorkspace(coreWorkspaceId: string) {
    return coreRequest<CoreWorkspace>('GET', `/workspaces/${coreWorkspaceId}`);
  },

  async activateWorkspace(coreWorkspaceId: string) {
    return coreRequest<CoreWorkspace>('POST', `/workspaces/${coreWorkspaceId}/activate`);
  },

  async suspendWorkspace(coreWorkspaceId: string) {
    return coreRequest<CoreWorkspace>('POST', `/workspaces/${coreWorkspaceId}/suspend`);
  },

  async rotateApiKey(coreWorkspaceId: string) {
    return coreRequest<CoreWorkspace & { apiKeyPlaintext: string }>('POST', `/workspaces/${coreWorkspaceId}/rotate-key`);
  },

  async getMcpCatalog() {
    return coreRequest<CoreMcpTemplate[]>('GET', '/mcp-catalog');
  },

  async listMcpServers(coreWorkspaceId: string) {
    return coreRequest<CoreMcpServer[]>('GET', `/workspaces/${coreWorkspaceId}/mcp-servers`);
  },

  async addMcpServer(coreWorkspaceId: string, type: string, credentials: Record<string, string>) {
    return coreRequest<CoreMcpServer>('POST', `/workspaces/${coreWorkspaceId}/mcp-servers`, {
      type,
      credentials,
    });
  },

  async removeMcpServer(coreWorkspaceId: string, mcpId: string) {
    return coreRequest<{ deleted: boolean }>('DELETE', `/workspaces/${coreWorkspaceId}/mcp-servers/${mcpId}`);
  },

  async enableMcpServer(coreWorkspaceId: string, mcpId: string) {
    return coreRequest<CoreMcpServer>('POST', `/workspaces/${coreWorkspaceId}/mcp-servers/${mcpId}/enable`);
  },

  async disableMcpServer(coreWorkspaceId: string, mcpId: string) {
    return coreRequest<CoreMcpServer>('POST', `/workspaces/${coreWorkspaceId}/mcp-servers/${mcpId}/disable`);
  },
};
