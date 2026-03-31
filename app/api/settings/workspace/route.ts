import { getDb } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';

const DEFAULT_SETTINGS = {
  aiProviders: {
    google:    { apiKey: '', model: 'gemini-2.0-flash', enabled: false },
    openai:    { apiKey: '', model: 'gpt-4o', enabled: false },
    grok:      { apiKey: '', model: 'grok-3', enabled: false },
    anthropic: { apiKey: '', model: 'claude-sonnet-4-6', enabled: false },
  },
  tokenLimits: {
    periodEnabled: false,
    period: 'month' as const,
    periodLimit: 100000,
    convEnabled: false,
    convLimit: 4000,
  },
  orchestration: {
    multiModel: false,
    strategy: 'failover' as const,
    concurrentMessages: 50,
  },
};

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const db = await getDb();
    let doc = await db.collection('workspace_settings').findOne({ workspaceId: session.workspaceId });

    if (!doc) {
      const newDoc = {
        workspaceId: session.workspaceId,
        ...DEFAULT_SETTINGS,
        updatedAt: new Date(),
      };
      await db.collection('workspace_settings').insertOne(newDoc);
      const { _id, ...rest } = newDoc as any;
      return Response.json(rest);
    }

    const { _id, ...rest } = doc as any;
    return Response.json(rest);
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    delete body.workspaceId;
    delete body._id;

    const db = await getDb();
    await db.collection('workspace_settings').updateOne(
      { workspaceId: session.workspaceId },
      { $set: { ...body, workspaceId: session.workspaceId, updatedAt: new Date() } },
      { upsert: true }
    );

    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
