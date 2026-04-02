import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { resolveScopedWorkspaceId } from '@/lib/access-control';
import { hasPermission } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') ?? '';
  const status = searchParams.get('status') ?? '';
  const sort = searchParams.get('sort') ?? 'votes';
  const workspaceId = resolveScopedWorkspaceId(session, searchParams.get('workspaceId'));

  const db = await getDb();
  const filter: Record<string, unknown> = { workspaceId };
  if (category) filter.category = category;
  if (status) filter.status = status;

  const sortField = sort === 'newest' ? 'createdAt' : 'votes';
  const items = await db.collection('feedback').find(filter).sort({ [sortField]: -1 }).limit(100).toArray();

  return NextResponse.json({ ok: true, items });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { title, description, category } = body;
  const workspaceId = resolveScopedWorkspaceId(session, body?.workspaceId ?? body?.workspace_id ?? null);

  if (!title?.trim() || !description?.trim() || !category) {
    return NextResponse.json({ ok: false, error: 'title, description, category required' }, { status: 400 });
  }

  const db = await getDb();

  const doc = {
    title: title.trim().slice(0, 200),
    description: description.trim().slice(0, 2000),
    category,
    status: 'open',
    votes: 0,
    votedBy: [] as string[],
    author: { email: session.email, name: session.name, role: session.role },
    workspaceId,
    createdAt: new Date(),
  };

  const result = await db.collection('feedback').insertOne(doc);
  return NextResponse.json({ ok: true, id: result.insertedId });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id, action, status } = body;
  const workspaceId = resolveScopedWorkspaceId(session, body?.workspaceId ?? body?.workspace_id ?? null);
  if (!id) return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 });

  const db = await getDb();

  let oid: ObjectId;
  try {
    oid = new ObjectId(id);
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid id' }, { status: 400 });
  }

  if (action === 'vote') {
    const item = await db.collection('feedback').findOne({ _id: oid, workspaceId });
    if (!item) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });

    const already = (item.votedBy ?? []).includes(session.email);
    if (already) {
      await db.collection('feedback').updateOne(
        { _id: oid, workspaceId },
        { $inc: { votes: -1 }, $pull: { votedBy: session.email } as any }
      );
    } else {
      await db.collection('feedback').updateOne(
        { _id: oid, workspaceId },
        { $inc: { votes: 1 }, $addToSet: { votedBy: session.email } }
      );
    }
    return NextResponse.json({ ok: true, voted: !already });
  }

  if (action === 'status' && hasPermission(session.permissions, 'settings.widget')) {
    const validStatuses = ['open', 'planned', 'in_progress', 'closed'];
    if (!validStatuses.includes(status)) return NextResponse.json({ ok: false, error: 'invalid status' }, { status: 400 });
    await db.collection('feedback').updateOne({ _id: oid, workspaceId }, { $set: { status } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: 'invalid action' }, { status: 400 });
}
