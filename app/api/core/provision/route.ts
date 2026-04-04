import { getDb } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { getWorkspaceClient } from '@/lib/clients';
import { resolveScopedWorkspaceId } from '@/lib/access-control';
import { CoreClient } from '@/lib/core-client';
import { hasPermission } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session.permissions, 'admin.seed')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = await getDb();
  const { searchParams } = new URL(req.url);
  const workspaceId = resolveScopedWorkspaceId(session, searchParams.get('workspaceId'));
  const client = await getWorkspaceClient(db, workspaceId);

  // Idempotencia: si ya está provisionado, retornar el ID existente
  const existing = await db.collection('workspace_configs').findOne({ workspaceId, key: 'core' });
  if (existing?.coreWorkspaceId) {
    return Response.json({ ok: true, coreWorkspaceId: existing.coreWorkspaceId, alreadyProvisioned: true });
  }

  // Leer nombre del workspace desde account config
  const accountConfig = await db.collection('workspace_configs').findOne({ workspaceId, key: 'account' });
  const rawName = (accountConfig as any)?.business_name;
  const workspaceName = (rawName && String(rawName).trim()) ? String(rawName).trim() : 'Mi Workspace ORQO';

  const body = await req.json().catch(() => ({})) as Record<string, string>;
  const agentName = body.agentName ?? workspaceName;
  const plan = body.plan ?? (accountConfig as any)?.plan ?? 'starter';

  const result = await CoreClient.provision({
    name: workspaceName,
    agentName,
    plan: plan.toLowerCase(),
    timezone: 'America/Bogota',
    trialDays: 14,
  });

  if (!result.ok) {
    return Response.json({ ok: false, error: result.error }, { status: 502 });
  }

  // Persistir mapping workspaceId (dashboard) → coreWorkspaceId (UUID del core)
  await db.collection('workspace_configs').updateOne(
    { workspaceId, key: 'core' },
    {
      $set: {
        workspaceId,
        key: 'core',
        clientId: client.clientId,
        clientName: client.clientName,
        coreWorkspaceId: result.data.workspaceId,
        coreAgentId: result.data.agentId,
        // ⚠️ Solo mostrar en esta respuesta — no persistir el plaintext
        provisionedAt: new Date(),
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );

  return Response.json({
    ok: true,
    coreWorkspaceId: result.data.workspaceId,
    agentId: result.data.agentId,
    // Enviar plaintext solo en la respuesta de provisioning — el usuario debe guardarlo
    apiKeyPlaintext: result.data.apiKeyPlaintext,
  });
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const db = await getDb();
  const { searchParams } = new URL(req.url);
  const workspaceId = resolveScopedWorkspaceId(session, searchParams.get('workspaceId'));

  const config = await db.collection('workspace_configs').findOne({ workspaceId, key: 'core' });
  if (!config?.coreWorkspaceId) {
    return Response.json({ provisioned: false });
  }

  const rawCoreUrl = (process.env.CORE_WEBHOOK_URL ?? '').trim();
  // Guard: if env var is not a valid URL (e.g. accidentally set to a secret hash), fall back to empty
  const coreBaseUrl = /^https?:\/\//i.test(rawCoreUrl) ? rawCoreUrl.replace(/\/$/, '') : '';
  const webhookBaseUrl = coreBaseUrl || 'http://localhost:3001';

  return Response.json({
    provisioned: true,
    coreWorkspaceId: (config as any).coreWorkspaceId,
    coreAgentId: (config as any).coreAgentId,
    webhookBaseUrl,
    webhookUrl:     `${webhookBaseUrl}/webhook/whatsapp`,
    metaWebhookUrl: `${webhookBaseUrl}/webhook/meta`,
    webhookUrlValid: Boolean(coreBaseUrl),
    provisionedAt: (config as any).provisionedAt,
  });
}
