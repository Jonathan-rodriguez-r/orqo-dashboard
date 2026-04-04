/**
 * /api/core/channels
 *
 * Proxy entre el dashboard y la Management API del core para configurar
 * credenciales de canales Meta (WhatsApp · Instagram · Facebook) por workspace.
 * Las credenciales se almacenan cifradas (AES-256-GCM) en MongoDB del core.
 *
 * GET    ?channel=          — obtiene config actual (tokens enmascarados)
 * PUT    ?channel=whatsapp  — guarda phoneNumberId + accessToken
 * PUT    ?channel=instagram — guarda igAccountId + accessToken
 * PUT    ?channel=facebook  — guarda pageId + accessToken
 * DELETE ?channel=whatsapp  — elimina canal
 */

import { getDb } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';
import { resolveScopedWorkspaceId } from '@/lib/access-control';
import { CoreClient } from '@/lib/core-client';
import { writeLog } from '@/app/api/admin/logs/route';

export const dynamic = 'force-dynamic';

async function getCoreWorkspaceId(db: ReturnType<typeof import('@/lib/mongodb')['getDb']> extends Promise<infer T> ? T : never, workspaceId: string): Promise<string | null> {
  const cfg = await db.collection('workspace_configs').findOne({ workspaceId, key: 'core' });
  return (cfg as any)?.coreWorkspaceId ?? null;
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session.permissions, 'settings.integrations'))
    return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const db = await getDb();
  const workspaceId = resolveScopedWorkspaceId(session, searchParams.get('workspaceId'));
  const coreId = await getCoreWorkspaceId(db, workspaceId);
  if (!coreId) return Response.json({ channels: {} });

  const result = await CoreClient.getChannels(coreId);
  if (!result.ok) return Response.json({ error: result.error }, { status: 502 });
  return Response.json(result.data);
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session.permissions, 'settings.integrations'))
    return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const channel = searchParams.get('channel') as 'whatsapp' | 'instagram' | 'facebook' | null;
  if (!channel || !['whatsapp', 'instagram', 'facebook'].includes(channel))
    return Response.json({ error: 'channel inválido' }, { status: 400 });

  const db = await getDb();
  const workspaceId = resolveScopedWorkspaceId(session, searchParams.get('workspaceId'));
  const coreId = await getCoreWorkspaceId(db, workspaceId);
  if (!coreId) return Response.json({ error: 'Workspace no provisionado en el core' }, { status: 409 });

  const body = await req.json().catch(() => ({})) as Record<string, string>;
  const result = await CoreClient.setChannel(coreId, channel, body);
  if (!result.ok) return Response.json({ error: result.error }, { status: 502 });

  void writeLog({
    level: 'info',
    source: 'integration-channel',
    msg: `Canal ${channel} configurado`,
    detail: `channel:${channel} workspaceId:${workspaceId} by:${session.email ?? session.sub}`,
    workspaceId,
  });

  // Verificar si hay agente activo con este canal habilitado y advertir si no hay
  const CHANNEL_AGENT_MAP: Record<string, string> = { whatsapp: 'whatsapp', instagram: 'instagram', facebook: 'messenger' };
  const agentChannelKey = CHANNEL_AGENT_MAP[channel];
  const db2 = await getDb();
  const agentWithChannel = await db2.collection('agents_v2').findOne({
    workspaceId,
    status: 'active',
    [`channels.${agentChannelKey}`]: true,
  });
  if (!agentWithChannel) {
    void writeLog({
      level: 'warn',
      source: 'integration-channel',
      msg: `Canal ${channel} configurado sin agente activo asignado`,
      detail: `channel:${channel} agentChannelKey:${agentChannelKey} — ningún agente activo tiene este canal habilitado`,
      workspaceId,
    });
  }

  return Response.json({ ...result.data, agentConfigured: Boolean(agentWithChannel) });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session.permissions, 'settings.integrations'))
    return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const channel = searchParams.get('channel') as 'whatsapp' | 'instagram' | 'facebook' | null;
  if (!channel || !['whatsapp', 'instagram', 'facebook'].includes(channel))
    return Response.json({ error: 'channel inválido' }, { status: 400 });

  const db = await getDb();
  const workspaceId = resolveScopedWorkspaceId(session, searchParams.get('workspaceId'));
  const coreId = await getCoreWorkspaceId(db, workspaceId);
  if (!coreId) return Response.json({ error: 'Workspace no provisionado' }, { status: 409 });

  const result = await CoreClient.deleteChannel(coreId, channel);
  if (!result.ok) return Response.json({ error: result.error }, { status: 502 });

  void writeLog({
    level: 'info',
    source: 'integration-channel',
    msg: `Canal ${channel} desconectado`,
    detail: `channel:${channel} workspaceId:${workspaceId} by:${session.email ?? session.sub}`,
    workspaceId,
  });

  return Response.json(result.data);
}
