import { getDb } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';
import { actorFromRequest, log } from '@/lib/logger';
import { resolveScopedWorkspaceId, canAccessProtectedRoles } from '@/lib/access-control';

// workspaceId virtual usado por el core para sus logs de plataforma
const CORE_WORKSPACE_ID = 'orqo_platform';

/**
 * GET /api/logs
 *
 * Returns paginated audit log entries from `audit_logs` with aggregated
 * stats in a single MongoDB round-trip via $facet.
 *
 * Requires: admin.logs permission.
 *
 * Query params:
 *   level         — INFO | WARN | ERROR | FATAL
 *   severity      — LOW | MEDIUM | HIGH | CRITICAL
 *   category      — auth | security | users | roles | system | ...
 *   action        — partial match on action name
 *   q             — free text: searches message, action, correlationId, actor.email
 *   email         — filter by actor.email (partial)
 *   correlationId — exact match
 *   from          — ISO 8601 start date (inclusive)
 *   to            — ISO 8601 end date (inclusive)
 *   page          — default 1
 *   limit         — default 50, max 200
 */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session.permissions, 'admin.logs'))
    return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const page          = Math.max(1, Number(searchParams.get('page')  ?? 1));
  const limit         = Math.min(200, Math.max(1, Number(searchParams.get('limit') ?? 50)));
  const level         = searchParams.get('level')         ?? '';
  const severity      = searchParams.get('severity')      ?? '';
  const category      = searchParams.get('category')      ?? '';
  const action        = searchParams.get('action')        ?? '';
  const email         = searchParams.get('email')         ?? '';
  const q             = searchParams.get('q')             ?? '';
  const from          = searchParams.get('from')          ?? '';
  const to            = searchParams.get('to')            ?? '';
  const correlationId = searchParams.get('correlationId') ?? '';
  const workspaceId   = resolveScopedWorkspaceId(session, searchParams.get('workspaceId'));

  // Logs de categoría 'core' son de plataforma — solo visibles para usuarios globales ORQO
  if (category === 'core') {
    if (!canAccessProtectedRoles(session)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const filter: Record<string, any> = {};
  // Los logs del core viven bajo workspaceId='orqo_platform' independientemente del workspace del usuario
  filter.workspaceId = category === 'core' ? CORE_WORKSPACE_ID : workspaceId;

  if (level)    filter.level    = level;
  if (severity) filter.severity = severity;
  if (category) filter.category = category;
  if (action)   filter.action   = { $regex: action, $options: 'i' };
  if (correlationId) filter.correlationId = correlationId;
  if (email)    filter['actor.email'] = { $regex: email, $options: 'i' };

  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to)   filter.createdAt.$lte = new Date(to);
  }

  if (q) {
    filter.$or = [
      { message:       { $regex: q, $options: 'i' } },
      { action:        { $regex: q, $options: 'i' } },
      { correlationId: q },
      { 'actor.email': { $regex: q, $options: 'i' } },
    ];
  }

  try {
    const db = await getDb();

    const [result] = await db.collection('audit_logs').aggregate([
      { $match: filter },
      {
        $facet: {
          items: [
            { $sort: { createdAt: -1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit },
          ],
          byLevel: [
            { $group: { _id: '$level', count: { $sum: 1 } } },
          ],
          byCategory: [
            { $group: { _id: '$category', count: { $sum: 1 } } },
          ],
          total: [
            { $count: 'n' },
          ],
        },
      },
    ]).toArray();

    if (!result) {
      return Response.json({ ok: true, total: 0, page, pages: 0, items: [], stats: { byLevel: {}, byCategory: {} } });
    }

    const total      = result.total[0]?.n ?? 0;
    const items      = (result.items ?? []).map(({ _id, ...rest }: any) => ({ _id: String(_id), ...rest }));
    const byLevel    = Object.fromEntries((result.byLevel ?? []).map((x: any) => [x._id, x.count]));
    const byCategory = Object.fromEntries((result.byCategory ?? []).map((x: any) => [x._id, x.count]));

    return Response.json({
      ok: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      items,
      stats: { byLevel, byCategory },
    });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

/**
 * DELETE /api/logs?days=30
 *
 * Deletes logs older than `days` from:
 * - audit_logs (createdAt)
 * - activity_logs (ts)
 *
 * Requires: admin.logs permission.
 */
export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session.permissions, 'admin.logs'))
    return Response.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { searchParams } = new URL(req.url);
    const days = Math.min(3650, Math.max(1, Number(searchParams.get('days') ?? 30)));
    const workspaceId = resolveScopedWorkspaceId(session, searchParams.get('workspaceId'));
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const cutoffTs = cutoff.getTime();

    const db = await getDb();
    const [auditDelete, runtimeDelete] = await Promise.all([
      db.collection('audit_logs').deleteMany({ workspaceId, createdAt: { $lt: cutoff } }),
      db.collection('activity_logs').deleteMany({ workspaceId, ts: { $lt: cutoffTs } }),
    ]);

    await log(db, {
      level: 'WARN',
      severity: 'MEDIUM',
      category: 'system',
      action: 'LOGS_PRUNED',
      message: `${session.email} depuro logs antiguos (${days} dias)`,
      actor: actorFromRequest(req, { id: session.sub, email: session.email, role: session.role }),
      metadata: {
        extra: {
          days,
          cutoff: cutoff.toISOString(),
          deletedAuditLogs: auditDelete.deletedCount ?? 0,
          deletedActivityLogs: runtimeDelete.deletedCount ?? 0,
        },
      },
      http: {
        method: 'DELETE',
        path: '/api/logs',
        statusCode: 200,
      },
    });

    return Response.json({
      ok: true,
      deleted: {
        audit_logs: auditDelete.deletedCount ?? 0,
        activity_logs: runtimeDelete.deletedCount ?? 0,
      },
      cutoff: cutoff.toISOString(),
      days,
    });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
