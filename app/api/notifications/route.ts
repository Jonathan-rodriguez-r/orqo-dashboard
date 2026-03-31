import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const db = await getDb();

  const items = await db.collection('notifications')
    .find({ workspaceId: session.workspaceId })
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
  const { type = 'info', title, body: bodyText } = body;

  if (!title || !bodyText) {
    return NextResponse.json({ ok: false, error: 'title and body required' }, { status: 400 });
  }

  const db = await getDb();

  const now = new Date();
  const doc = {
    workspaceId: session.workspaceId,
    type,
    title,
    body: bodyText,
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
  const db = await getDb();

  if (body.markAllRead) {
    await db.collection('notifications').updateMany(
      { workspaceId: session.workspaceId, read: false },
      { $set: { read: true } }
    );
    return NextResponse.json({ ok: true });
  }

  if (body.id) {
    await db.collection('notifications').updateOne(
      { _id: new ObjectId(body.id), workspaceId: session.workspaceId },
      { $set: { read: true } }
    );
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: 'id or markAllRead required' }, { status: 400 });
}
