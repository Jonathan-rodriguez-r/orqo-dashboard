import { getDb } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { getWorkspaceClient } from '@/lib/clients';
import { resolveScopedWorkspaceId } from '@/lib/access-control';

const DEFAULT_SETTINGS = {
  aiProviders: {
    google: { apiKey: '', model: 'gemini-2.0-flash', enabled: false },
    openai: { apiKey: '', model: 'gpt-4o', enabled: false },
    grok: { apiKey: '', model: 'grok-3', enabled: false },
    anthropic: { apiKey: '', model: 'claude-sonnet-4-6', enabled: false },
  },
  orchestration: {
    multiModel: false,
    strategy: 'failover' as const,
    concurrentMessages: 50,
    activeProviders: [] as string[],
  },
  fallback: {
    useFreeModels: false,
    freeProviderApiKey: '',
    freeModels: ['meta-llama/llama-3.3-70b-instruct:free'],
    safeReplyEnabled: true,
    safeReplyMessage:
      'Estoy con alta demanda y no pude procesar tu mensaje ahora mismo. Intenta nuevamente en unos minutos.',
  },
};

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const workspaceId = resolveScopedWorkspaceId(session, searchParams.get('workspaceId'));

    const db = await getDb();
    const client = await getWorkspaceClient(db, workspaceId);
    let doc = await db.collection('workspace_settings').findOne({ workspaceId });

    if (!doc) {
      const newDoc = {
        workspaceId,
        clientId: client.clientId,
        clientName: client.clientName,
        ...DEFAULT_SETTINGS,
        updatedAt: new Date(),
      };
      await db.collection('workspace_settings').insertOne(newDoc);
      const { _id, ...rest } = newDoc as any;
      return Response.json(rest);
    }

    const { _id, ...rest } = doc as any;
    return Response.json({
      ...DEFAULT_SETTINGS,
      ...rest,
      clientId: rest.clientId ?? client.clientId,
      clientName: rest.clientName ?? client.clientName,
      aiProviders: { ...DEFAULT_SETTINGS.aiProviders, ...(rest.aiProviders ?? {}) },
      orchestration: { ...DEFAULT_SETTINGS.orchestration, ...(rest.orchestration ?? {}) },
      fallback: { ...DEFAULT_SETTINGS.fallback, ...(rest.fallback ?? {}) },
    });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const workspaceId = resolveScopedWorkspaceId(session, body.workspaceId ?? body.workspace_id ?? null);
    delete body.workspaceId;
    delete body.workspace_id;
    delete body._id;

    const db = await getDb();
    const client = await getWorkspaceClient(db, workspaceId);
    await db.collection('workspace_settings').updateOne(
      { workspaceId },
      {
        $set: {
          ...body,
          workspaceId,
          clientId: client.clientId,
          clientName: client.clientName,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}