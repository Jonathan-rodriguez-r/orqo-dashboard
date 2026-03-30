import { getDb } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export type LogEntry = {
  ts: number;       // timestamp ms
  level: 'info' | 'warn' | 'error';
  source: string;   // e.g. 'widget-config', 'auth', 'public-api'
  msg: string;
  detail?: string;
};

export async function writeLog(entry: Omit<LogEntry, 'ts'>) {
  try {
    const db = await getDb();
    const doc: LogEntry = { ts: Date.now(), ...entry };
    await db.collection('activity_logs').insertOne(doc as any);
    // Keep only last 500 entries
    const count = await db.collection('activity_logs').countDocuments();
    if (count > 500) {
      const oldest = await db.collection('activity_logs')
        .find().sort({ ts: 1 }).limit(count - 500).toArray();
      const ids = oldest.map((d: any) => d._id);
      if (ids.length) await db.collection('activity_logs').deleteMany({ _id: { $in: ids } });
    }
  } catch {
    // Logging must never crash the caller
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '100'), 200);
    const db = await getDb();
    const logs = await db.collection('activity_logs')
      .find()
      .sort({ ts: -1 })
      .limit(limit)
      .toArray();
    return Response.json(logs.map(({ _id, ...r }) => r));
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const db = await getDb();
    await db.collection('activity_logs').deleteMany({});
    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
