import { getDb } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import { randomBytes } from 'crypto';
import { getWorkspaceClient } from '@/lib/clients';
import { resolveScopedWorkspaceId } from '@/lib/access-control';

function compileSystemPrompt(agent: any): string {
  const parts: string[] = [];

  const name = agent.name?.trim();
  if (name) parts.push(`Eres ${name}.`);

  const sp = agent.profile?.systemPrompt?.trim();
  if (sp) parts.push(sp);

  const personality = agent.profile?.personality?.trim();
  if (personality) parts.push(`Personalidad: ${personality}.`);

  const languages: string[] = agent.profile?.languages ?? [];
  if (languages.length > 0) parts.push(`Idiomas: ${languages.join(', ')}.`);

  const corporate = agent.corporateContext?.trim();
  if (corporate) parts.push(`Contexto corporativo:\n${corporate}`);

  const skills: string[] = agent.skills ?? [];
  if (skills.length > 0) parts.push(`Skills activos: ${skills.join(', ')}.`);

  const preChatForm = agent.preChatForm;
  if (preChatForm?.enabled) {
    const fields: string[] = [];
    if (preChatForm.fields?.name?.enabled) fields.push('nombre');
    if (preChatForm.fields?.email?.enabled) fields.push('email');
    if (preChatForm.fields?.phone?.enabled) fields.push('teléfono');
    if (fields.length > 0) {
      parts.push(`Al iniciar una conversación nueva, solicita al usuario los siguientes datos antes de continuar: ${fields.join(', ')}.`);
    }
  }

  const escalation = agent.advanced?.escalationKeywords?.trim();
  if (escalation) {
    const handoff = agent.advanced?.humanHandoffMsg?.trim() || 'Te conecto con un agente humano.';
    parts.push(`Si detectas alguna de estas palabras clave: ${escalation}, responde: ${handoff}`);
  }

  return parts.join('\n\n');
}

async function syncAgentToCore(db: any, agentDoc: any, coreWorkspaceId: string): Promise<void> {
  const systemPrompt = compileSystemPrompt(agentDoc);
  await db.collection('agents').updateOne(
    { workspaceId: coreWorkspaceId },
    {
      $set: {
        _id: agentDoc._id.toString(),
        workspaceId: coreWorkspaceId,
        name: agentDoc.name ?? 'Agente ORQO',
        systemPrompt,
        enabledSkillIds: agentDoc.skills ?? [],
        interactionLimit: agentDoc.tokenLimits?.convLimit ?? 100,
        active: agentDoc.status === 'active',
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );
}

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: RouteContext) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await ctx.params;
    if (!ObjectId.isValid(id)) return Response.json({ error: 'Invalid id' }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const workspaceId = resolveScopedWorkspaceId(session, searchParams.get('workspaceId'));

    const db = await getDb();
    const doc = await db.collection('agents_v2').findOne({ _id: new ObjectId(id), workspaceId });

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
    const workspaceId = resolveScopedWorkspaceId(session, body.workspaceId ?? body.workspace_id ?? null);
    delete body._id;
    delete body.workspaceId;
    delete body.workspace_id;

    const db = await getDb();
    const client = await getWorkspaceClient(db, workspaceId);
    const current = await db.collection('agents_v2').findOne({ _id: new ObjectId(id), workspaceId });
    if (!current) return Response.json({ error: 'Not found' }, { status: 404 });

    const nextChannels = body.channels ?? current.channels ?? {};
    const webIsEnabled = Boolean(nextChannels.web);
    const incomingToken = typeof body.webWidgetToken === 'string' ? body.webWidgetToken : current.webWidgetToken;
    const webWidgetToken = webIsEnabled
      ? (incomingToken && String(incomingToken).trim()) || ('awt_' + randomBytes(18).toString('hex'))
      : '';

    await db.collection('agents_v2').updateOne(
      { _id: new ObjectId(id), workspaceId },
      {
        $set: {
          ...body,
          webWidgetToken,
          clientId: client.clientId,
          clientName: client.clientName,
          updatedAt: new Date(),
        },
      }
    );

    // Sync to core 'agents' collection so the core picks up the updated config
    const coreConfig = await db
      .collection<any>('workspace_configs')
      .findOne({ workspaceId, key: 'core' });
    const coreWorkspaceId = coreConfig?.coreWorkspaceId as string | undefined;
    if (coreWorkspaceId) {
      const updated = await db.collection('agents_v2').findOne({ _id: new ObjectId(id), workspaceId });
      if (updated) await syncAgentToCore(db, updated, coreWorkspaceId);
    }

    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, ctx: RouteContext) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await ctx.params;
    if (!ObjectId.isValid(id)) return Response.json({ error: 'Invalid id' }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const workspaceId = resolveScopedWorkspaceId(session, searchParams.get('workspaceId'));

    const db = await getDb();

    const target = await db.collection('agents_v2').findOne({ _id: new ObjectId(id), workspaceId });
    if (!target) return Response.json({ error: 'Not found' }, { status: 404 });

    if (target.status === 'active') {
      const activeCount = await db.collection('agents_v2').countDocuments({ workspaceId, status: 'active' });

      if (activeCount <= 1) {
        return Response.json({ error: 'No puedes eliminar el ultimo agente activo.' }, { status: 400 });
      }
    }

    await db.collection('agents_v2').deleteOne({ _id: new ObjectId(id), workspaceId });

    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}