import { getDb } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import { randomBytes } from 'crypto';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteContext) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await ctx.params;
    if (!ObjectId.isValid(id)) return Response.json({ error: 'Invalid id' }, { status: 400 });

    const db = await getDb();
    const doc = await db
      .collection('agents_v2')
      .findOne({ _id: new ObjectId(id), workspaceId: session.workspaceId });

    if (!doc) return Response.json({ error: 'Not found' }, { status: 404 });

    return Response.json({ ...doc, _id: doc._id.toString() });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: RouteContext) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await ctx.params;
    if (!ObjectId.isValid(id)) return Response.json({ error: 'Invalid id' }, { status: 400 });

    const body = await req.json();
    delete body._id;
    delete body.workspaceId;

    const db = await getDb();
    const current = await db.collection('agents_v2').findOne({
      _id: new ObjectId(id),
      workspaceId: session.workspaceId,
    });
    if (!current) return Response.json({ error: 'Not found' }, { status: 404 });

    const nextChannels = body.channels ?? current.channels ?? {};
    const webIsEnabled = Boolean(nextChannels.web);
    const incomingToken = typeof body.webWidgetToken === 'string' ? body.webWidgetToken : current.webWidgetToken;
    const webWidgetToken = webIsEnabled
      ? (incomingToken && String(incomingToken).trim()) || ('awt_' + randomBytes(18).toString('hex'))
      : '';

    const result = await db.collection('agents_v2').updateOne(
      { _id: new ObjectId(id), workspaceId: session.workspaceId },
      { $set: { ...body, webWidgetToken, updatedAt: new Date() } }
    );

    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: RouteContext) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await ctx.params;
    if (!ObjectId.isValid(id)) return Response.json({ error: 'Invalid id' }, { status: 400 });

    const db = await getDb();

    // Cannot delete if it's the last active agent
    const target = await db
      .collection('agents_v2')
      .findOne({ _id: new ObjectId(id), workspaceId: session.workspaceId });

    if (!target) return Response.json({ error: 'Not found' }, { status: 404 });

    if (target.status === 'active') {
      const activeCount = await db
        .collection('agents_v2')
        .countDocuments({ workspaceId: session.workspaceId, status: 'active' });

      if (activeCount <= 1) {
        return Response.json(
          { error: 'No puedes eliminar el último agente activo.' },
          { status: 400 }
        );
      }
    }

    await db
      .collection('agents_v2')
      .deleteOne({ _id: new ObjectId(id), workspaceId: session.workspaceId });

    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
