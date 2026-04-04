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

// GET /api/core/mcp — listar MCP servers del workspace
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const db = await getDb();
  const { searchParams } = new URL(req.url);
  const workspaceId = resolveScopedWorkspaceId(session, searchParams.get('workspaceId'));
  const coreWorkspaceId = await getCoreWorkspaceId(db, workspaceId);

  if (!coreWorkspaceId) {
    return Response.json({ error: 'Workspace no provisionado en el core' }, { status: 409 });
  }

  const result = await CoreClient.listMcpServers(coreWorkspaceId);
  if (!result.ok) return Response.json({ error: result.error }, { status: 502 });
  return Response.json(result.data);
}

// POST /api/core/mcp — añadir MCP server
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session.permissions, 'settings.workspace' as any)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = await getDb();
  const { searchParams } = new URL(req.url);
  const workspaceId = resolveScopedWorkspaceId(session, searchParams.get('workspaceId'));
  const coreWorkspaceId = await getCoreWorkspaceId(db, workspaceId);

  if (!coreWorkspaceId) {
    return Response.json({ error: 'Workspace no provisionado en el core' }, { status: 409 });
  }

  const body = await req.json() as { type: string; credentials: Record<string, string> };
  const result = await CoreClient.addMcpServer(coreWorkspaceId, body.type, body.credentials);
  if (!result.ok) return Response.json({ error: result.error }, { status: 502 });
  return Response.json(result.data, { status: 201 });
}
