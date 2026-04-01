import { getDb } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';
import { getDefaultWorkspaceId } from '@/lib/tenant';
import { resolveScopedWorkspaceId } from '@/lib/access-control';

/**
 * GET /api/logs/security
 * Returns security log entries. Requires admin.logs permission.
 * Query params: limit (default 50, max 200), offset, type, email
 */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session.permissions, 'admin.logs'))
    return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const limit  = Math.min(200, Math.max(1, Number(searchParams.get('limit')  ?? 50)));
  const offset = Math.max(0, Number(searchParams.get('offset') ?? 0));
  const type   = searchParams.get('type')  ?? '';
  const email  = searchParams.get('email') ?? '';
  const workspaceId = resolveScopedWorkspaceId(session, searchParams.get('workspaceId'));

  const workspaceFilter =
    workspaceId === getDefaultWorkspaceId()
      ? { $or: [{ workspaceId }, { workspaceId: { $exists: false } }] }
      : { workspaceId };

  const filter: Record<string, any> = { ...workspaceFilter, category: 'security' };
  if (type)  filter.type  = type;
  if (email) filter.email = { $regex: email, $options: 'i' };

  const db = await getDb();
  const [items, total] = await Promise.all([
    db.collection('security_logs')
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray(),
    db.collection('security_logs').countDocuments(filter),
  ]);

  return Response.json({
    ok: true,
    total,
    items: items.map(({ _id, ...rest }) => ({ _id: String(_id), ...rest })),
  });
}
