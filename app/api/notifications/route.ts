import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { resolveScopedWorkspaceId } from '@/lib/access-control';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const workspaceId = resolveScopedWorkspaceId(session, searchParams.get('workspaceId'));
  const db = await getDb();

  const items = await db.collection('notifications')
    .find({
      workspaceId,
      $or: [
        { recipientRoles: { $exists: false } },
        { recipientRoles: { $size: 0 } },
        { recipientRoles: session.role },
      ],
    })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();

  return NextResponse.json({ ok: true, items });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !['owner', 'admin'].includes(session.role)) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const workspaceId = resolveScopedWorkspaceId(session, body?.workspaceId ?? body?.workspace_id ?? null);
  const { type = 'info', title, body: bodyText, recipientRoles } = body;

  if (!title || !bodyText) {
    return NextResponse.json({ ok: false, error: 'title and body required' }, { status: 400 });
  }

  const db = await getDb();

  const now = new Date();
  const doc = {
    workspaceId,
    type,
    title,
    body: bodyText,
    recipientRoles: Array.isArray(recipientRoles)
      ? recipientRoles.filter((r: unknown) => typeof r === 'string' && r.trim())
      : [],
    read: false,
    createdAt: now,
    expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days TTL
  };

  const result = await db.collection('notifications').insertOne(doc);
  return NextResponse.json({ ok: true, id: result.insertedId });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const workspaceId = resolveScopedWorkspaceId(session, body?.workspaceId ?? body?.workspace_id ?? null);
  const db = await getDb();

  if (body.markAllRead) {
    await db.collection('notifications').updateMany(
      { workspaceId, read: false },
      { $set: { read: true } }
    );
    return NextResponse.json({ ok: true });
  }

  if (body.id) {
    await db.collection('notifications').updateOne(
      { _id: new ObjectId(body.id), workspaceId },
      { $set: { read: true } }
    );
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: 'id or markAllRead required' }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const workspaceId = resolveScopedWorkspaceId(session, body?.workspaceId ?? body?.workspace_id ?? null);
  if (!body?.id) return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 });

  const db = await getDb();
  await db.collection('notifications').deleteOne({
    _id: new ObjectId(body.id),
    workspaceId,
  });

  return NextResponse.json({ ok: true });
}
