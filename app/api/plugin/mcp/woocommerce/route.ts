/**
 * /api/plugin/mcp/woocommerce
 *
 * El plugin de WordPress llama a este endpoint para registrar o desregistrar
 * la integración MCP de WooCommerce para el workspace asociado a una Site Key.
 *
 * Se autentica con Site Key — no requiere sesión de dashboard.
 *
 * POST   { site_key, wc_url, wc_key, wc_secret }  — registra MCP WooCommerce
 * DELETE { site_key }                              — elimina MCP WooCommerce
 */

import { createHash } from 'crypto';
import { getDb } from '@/lib/mongodb';
import { CoreClient } from '@/lib/core-client';

export const dynamic = 'force-dynamic';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
  'Cache-Control': 'no-store',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

async function resolveWorkspace(siteKey: string): Promise<string | null> {
  if (!siteKey.startsWith('orqo_sk_')) return null;
  const db = await getDb();
  const doc = await db
    .collection('plugin_site_keys')
    .findOne({ keyHash: hashKey(siteKey), active: true });
  return doc ? String(doc.workspaceId) : null;
}

async function getCoreId(workspaceId: string): Promise<string | null> {
  const db = await getDb();
  const cfg = await db.collection('workspace_configs').findOne({ workspaceId, key: 'core' });
  return (cfg as any)?.coreWorkspaceId ?? null;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as Record<string, string>;
  const siteKey = String(body.site_key ?? '').trim();

  const workspaceId = await resolveWorkspace(siteKey);
  if (!workspaceId) return Response.json({ error: 'Site key inválida' }, { status: 401, headers: CORS });

  const coreId = await getCoreId(workspaceId);
  if (!coreId) return Response.json({ error: 'Workspace no provisionado en el core' }, { status: 409, headers: CORS });

  const { wc_url, wc_key, wc_secret } = body;
  if (!wc_url || !wc_key || !wc_secret) {
    return Response.json({ error: 'wc_url, wc_key y wc_secret son requeridos' }, { status: 400, headers: CORS });
  }

  const result = await CoreClient.addMcpServer(coreId, 'woocommerce', {
    WC_URL: wc_url,
    WC_KEY: wc_key,
    WC_SECRET: wc_secret,
  });

  if (!result.ok) return Response.json({ error: result.error }, { status: 502, headers: CORS });
  return Response.json({ ok: true, mcpId: result.data.id }, { headers: CORS });
}

export async function DELETE(req: Request) {
  const body = await req.json().catch(() => ({})) as Record<string, string>;
  const siteKey = String(body.site_key ?? '').trim();

  const workspaceId = await resolveWorkspace(siteKey);
  if (!workspaceId) return Response.json({ error: 'Site key inválida' }, { status: 401, headers: CORS });

  const coreId = await getCoreId(workspaceId);
  if (!coreId) return Response.json({ error: 'Workspace no provisionado en el core' }, { status: 409, headers: CORS });

  const servers = await CoreClient.listMcpServers(coreId);
  if (!servers.ok) return Response.json({ error: servers.error }, { status: 502, headers: CORS });

  const wcServer = servers.data.find(s => s.type === 'woocommerce');
  if (!wcServer) return Response.json({ ok: true, message: 'No había integración WooCommerce activa' }, { headers: CORS });

  const result = await CoreClient.removeMcpServer(coreId, wcServer.id);
  if (!result.ok) return Response.json({ error: result.error }, { status: 502, headers: CORS });

  return Response.json({ ok: true }, { headers: CORS });
}
