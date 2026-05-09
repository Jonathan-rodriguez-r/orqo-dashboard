import { getDb } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { resolveScopedWorkspaceId } from '@/lib/access-control';
import { getWorkspaceClient } from '@/lib/clients';

function normalizeCoreConversation(doc: any, dashboardWorkspaceId: string) {
  const messages: any[] = doc.messages ?? [];
  const lastMsg = messages.at(-1);
  const lastUserMsg = [...messages].reverse().find((m: any) => m.role === 'user');
  return {
    _id: String(doc._id),
    workspaceId: dashboardWorkspaceId,
    conv_id: String(doc._id),
    channel: 'whatsapp',
    user_name: doc.phoneNumber ?? 'WhatsApp',
    user_phone: doc.phoneNumber,
    last_message: lastUserMsg?.content ?? lastMsg?.content ?? '',
    status: 'open',
    model: '',
    createdAt: doc.createdAt,
    updatedAt: lastMsg?.timestamp ?? doc.createdAt,
    _source: 'core',
  };
}

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

    // Lookup coreWorkspaceId to also fetch conversations saved by the core
    const coreConfig = await db
      .collection<any>('workspace_configs')
      .findOne({ workspaceId, key: 'core' });
    const coreWorkspaceId = coreConfig?.coreWorkspaceId as string | undefined;

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

    const [dashboardItems, dashboardTotal] = await Promise.all([
      db.collection('conversations').find(filter).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
      db.collection('conversations').countDocuments(filter),
    ]);

    // Fetch core conversations if provisioned and no channel/status/model filter conflicts
    let coreItems: any[] = [];
    let coreTotal = 0;
    if (coreWorkspaceId && (!channel || channel === 'whatsapp') && !model) {
      const coreFilter: Record<string, any> = { workspaceId: coreWorkspaceId };
      if (q) coreFilter.$or = [
        { phoneNumber: { $regex: q, $options: 'i' } },
        { 'messages.content': { $regex: q, $options: 'i' } },
      ];
      [coreItems, coreTotal] = await Promise.all([
        db.collection('conversations').find(coreFilter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
        db.collection('conversations').countDocuments(coreFilter),
      ]);
    }

    const normalizedCore = coreItems.map(d => normalizeCoreConversation(d, workspaceId));
    const allItems = [...dashboardItems.map(({ _id, ...rest }) => ({ _id: String(_id), ...rest })), ...normalizedCore]
      .sort((a, b) => new Date((b as any).updatedAt ?? (b as any).createdAt).getTime() - new Date((a as any).updatedAt ?? (a as any).createdAt).getTime())
      .slice(0, limit);

    return Response.json({
      items: allItems,
      total: dashboardTotal + coreTotal,
      page,
      pages: Math.ceil((dashboardTotal + coreTotal) / limit),
    });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
