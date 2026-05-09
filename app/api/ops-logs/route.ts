import { getDb } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';
import { resolveScopedWorkspaceId } from '@/lib/access-control';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasPermission(session.permissions, 'admin.logs')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page     = Math.max(1, Number(searchParams.get('page')  ?? 1));
    const limit    = Math.min(200, Math.max(1, Number(searchParams.get('limit') ?? 50)));
    const level    = searchParams.get('level')    ?? '';
    const category = searchParams.get('category') ?? '';
    const action   = searchParams.get('action')   ?? '';
    const q        = searchParams.get('q')        ?? '';
    const preset   = searchParams.get('preset')   ?? '24h';
    const from     = searchParams.get('from')     ?? '';
    const to       = searchParams.get('to')       ?? '';
    const workspaceId = resolveScopedWorkspaceId(session, searchParams.get('workspaceId'));

    const filter: Record<string, any> = { workspaceId };

    if (level)    filter['level']    = level;
    if (category) filter['category'] = category;
    if (action)   filter['action']   = { $regex: action, $options: 'i' };
    if (q)        filter['$or'] = [
      { message:  { $regex: q, $options: 'i' } },
      { action:   { $regex: q, $options: 'i' } },
    ];

    // Date range
    const now = new Date();
    let dateFrom: Date | null = null;
    let dateTo:   Date | null = null;
    if (from || to) {
      if (from) dateFrom = new Date(from);
      if (to)   dateTo   = new Date(to);
    } else if (preset !== 'all') {
      const ms: Record<string, number> = { '1h': 3_600_000, '24h': 86_400_000, '7d': 604_800_000, '30d': 2_592_000_000 };
      if (ms[preset]) dateFrom = new Date(now.getTime() - ms[preset]);
    }
    if (dateFrom || dateTo) {
      filter['ts'] = {
        ...(dateFrom ? { $gte: dateFrom } : {}),
        ...(dateTo   ? { $lte: dateTo   } : {}),
      };
    }

    const db = await getDb();

    // operational_logs usa coreWorkspaceId (UUID), no el slug del dashboard
    const coreConfig = await db.collection<any>('workspace_configs').findOne({ workspaceId, key: 'core' });
    const coreWorkspaceId = coreConfig?.coreWorkspaceId as string | undefined;
    // Filtrar por ambos: el workspaceId del dashboard Y el coreWorkspaceId si existe
    const wsFilter = coreWorkspaceId
      ? { $in: [workspaceId, coreWorkspaceId] }
      : workspaceId;
    filter['workspaceId'] = wsFilter;

    // Crear índices TTL si no existen (idempotente)
    const col = db.collection('operational_logs');
    await col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, background: true }).catch(() => {});
    await col.createIndex({ workspaceId: 1, ts: -1 }, { background: true }).catch(() => {});

    const [result] = await col.aggregate([
      { $match: filter },
      {
        $facet: {
          items: [
            { $sort: { ts: -1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit },
          ],
          byLevel: [{ $group: { _id: '$level', count: { $sum: 1 } } }],
          byCategory: [{ $group: { _id: '$category', count: { $sum: 1 } } }],
          total: [{ $count: 'n' }],
        },
      },
    ]).toArray() as any[];

    const items      = (result?.items ?? []).map((d: any) => ({ ...d, _id: String(d._id) }));
    const total      = result?.total?.[0]?.n ?? 0;
    const byLevel    = Object.fromEntries((result?.byLevel    ?? []).map((x: any) => [x._id, x.count]));
    const byCategory = Object.fromEntries((result?.byCategory ?? []).map((x: any) => [x._id, x.count]));

    return Response.json({
      ok: true,
      items,
      total,
      page,
      pages: Math.ceil(total / limit),
      stats: { byLevel, byCategory },
    });
  } catch (e: any) {
    return Response.json({ error: e?.message ?? 'Internal error' }, { status: 500 });
  }
}
