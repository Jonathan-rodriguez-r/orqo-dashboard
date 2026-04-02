import { getDb } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { resolveScopedWorkspaceId } from '@/lib/access-control';
import { CoreClient } from '@/lib/core-client';
import { hasPermission } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

async function getCoreWorkspaceId(db: Awaited<ReturnType<typeof import('@/lib/mongodb').getDb>>, workspaceId: string): Promise<string | null> {
  const config = await db.collection('workspace_configs').findOne({ workspaceId, key: 'core' });
  return (config as any)?.coreWorkspaceId ?? null;
}

// DELETE /api/core/mcp/:mcpId
export async function DELETE(req: Request, { params }: { params: Promise<{ mcpId: string }> }) {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session.permissions, 'settings.integrations')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { mcpId } = await params;
  const db = await getDb();
  const { searchParams } = new URL(req.url);
  const workspaceId = resolveScopedWorkspaceId(session, searchParams.get('workspaceId'));
  const coreWorkspaceId = await getCoreWorkspaceId(db, workspaceId);
  if (!coreWorkspaceId) return Response.json({ error: 'Workspace no provisionado' }, { status: 409 });

  const result = await CoreClient.removeMcpServer(coreWorkspaceId, mcpId);
  if (!result.ok) return Response.json({ error: result.error }, { status: 502 });
  return Response.json(result.data);
}

// POST /api/core/mcp/:mcpId — con query param action=enable|disable
export async function POST(req: Request, { params }: { params: Promise<{ mcpId: string }> }) {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session.permissions, 'settings.integrations')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { mcpId } = await params;
  const db = await getDb();
  const { searchParams } = new URL(req.url);
  const workspaceId = resolveScopedWorkspaceId(session, searchParams.get('workspaceId'));
  const action = searchParams.get('action');
  const coreWorkspaceId = await getCoreWorkspaceId(db, workspaceId);
  if (!coreWorkspaceId) return Response.json({ error: 'Workspace no provisionado' }, { status: 409 });

  const result = action === 'disable'
    ? await CoreClient.disableMcpServer(coreWorkspaceId, mcpId)
    : await CoreClient.enableMcpServer(coreWorkspaceId, mcpId);

  if (!result.ok) return Response.json({ error: result.error }, { status: 502 });
  return Response.json(result.data);
}
