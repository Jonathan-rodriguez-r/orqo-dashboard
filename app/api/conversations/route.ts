import { getDb } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { resolveScopedWorkspaceId } from '@/lib/access-control';
import { getWorkspaceClient } from '@/lib/clients';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get('page') ?? 1));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') ?? 20)));
    const q = searchParams.get('q') ?? '';
    const channel = searchParams.get('channel') ?? '';
    const status = searchParams.get('status') ?? '';
    const model = searchParams.get('model') ?? '';
    const workspaceId = resolveScopedWorkspaceId(session, searchParams.get('workspaceId'));

    const db = await getDb();
    const client = await getWorkspaceClient(db, workspaceId);

    const filter: Record<string, any> = { workspaceId, clientId: client.clientId };
    if (q)
      filter.$or = [
        { user_name: { $regex: q, $options: 'i' } },
        { last_message: { $regex: q, $options: 'i' } },
        { user_email: { $regex: q, $options: 'i' } },
        { conv_id: { $regex: q, $options: 'i' } },
      ];
    if (channel) filter.channel = channel;
    if (status) filter.status = status;
    if (model) filter.model = model;

    const [items, total] = await Promise.all([
      db.collection('conversations')
        .find(filter)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
      db.collection('conversations').countDocuments(filter),
    ]);

    return Response.json({
      items: items.map(({ _id, ...rest }) => ({ _id: String(_id), ...rest })),
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
