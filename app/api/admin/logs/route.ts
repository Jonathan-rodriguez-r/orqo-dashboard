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
    // Mirror to audit_logs so /dashboard/logs can show operational runtime events.
    const createdAt = new Date(doc.ts);
    const retentionDays = Math.max(1, parseInt(process.env.LOG_RETENTION_DAYS ?? '90', 10));
    const expiresAt = new Date(createdAt.getTime() + retentionDays * 24 * 60 * 60 * 1000);

    const levelUpper = doc.level.toUpperCase();
    const level = levelUpper === 'WARN' || levelUpper === 'ERROR' ? levelUpper : 'INFO';
    const severity =
      level === 'ERROR' ? 'HIGH' :
      level === 'WARN' ? 'MEDIUM' :
      'LOW';

    const src = (doc.source || '').toLowerCase();
    const category =
      src.includes('auth') ? 'auth' :
      src.includes('agent') ? 'agent' :
      src.includes('widget') || src.includes('conversation') ? 'conversation' :
      src.includes('security') ? 'security' :
      'system';

    const action = `RUNTIME_${src.replace(/[^a-z0-9]+/g, '_').toUpperCase() || 'EVENT'}`;

    await db.collection('audit_logs').insertOne({
      correlationId: `rt-${doc.ts}-${Math.random().toString(36).slice(2, 8)}`,
      level,
      severity,
      category,
      action,
      message: doc.msg,
      metadata: doc.detail ? { extra: { detail: doc.detail, source: doc.source } } : { extra: { source: doc.source } },
      createdAt,
      expiresAt,
    } as any);

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
