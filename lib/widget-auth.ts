import { ObjectId } from 'mongodb';
import type { Db } from 'mongodb';
import { findWorkspaceByApiKey } from '@/lib/workspace-config';
import { readHostFromRequest, resolveWorkspaceFromHost } from '@/lib/tenant';

export async function resolveWidgetWorkspace(args: {
  db: Db;
  req: Request;
  key?: string | null;
  agentId?: string | null;
}) {
  const cleanKey = String(args.key ?? '').trim();
  const cleanAgentId = String(args.agentId ?? '').trim();

  if (cleanKey) {
    const fromKey = await findWorkspaceByApiKey(args.db, cleanKey);
    if (fromKey) return fromKey;
    return null;
  }

  if (cleanAgentId && ObjectId.isValid(cleanAgentId)) {
    const agent = await args.db.collection('agents_v2').findOne(
      { _id: new ObjectId(cleanAgentId) },
      { projection: { workspaceId: 1 } }
    );
    if (agent?.workspaceId) return String(agent.workspaceId);
  }

  const tenant = await resolveWorkspaceFromHost(args.db, readHostFromRequest(args.req), { allowFallback: true });
  return tenant?.workspaceId ?? null;
}
