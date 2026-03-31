import { getDb } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const db = await getDb();
    const agents = await db
      .collection('agents_v2')
      .find(
        { workspaceId: session.workspaceId },
        { projection: { _id: 1, name: 1, status: 1, avatar: 1, channels: 1, createdAt: 1 } }
      )
      .toArray();

    return Response.json(agents.map(a => ({ ...a, _id: a._id.toString() })));
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    delete body._id;

    const now = new Date();
    const doc = {
      workspaceId: session.workspaceId,
      name: body.name ?? 'Nuevo agente',
      status: body.status ?? 'draft',
      avatar: body.avatar ?? '🤖',
      aiProvider: body.aiProvider ?? { provider: 'google', model: 'gemini-2.0-flash' },
      channels: body.channels ?? {
        whatsapp: false, instagram: false, messenger: false,
        web: true, woocommerce: false, shopify: false,
      },
      profile: body.profile ?? {
        systemPrompt: '', personality: 'professional',
        language: 'es', responseLength: 'standard',
      },
      skills: body.skills ?? [],
      corporateContext: body.corporateContext ?? '',
      advanced: body.advanced ?? {
        timezone: 'America/Bogota',
        scheduleEnabled: false,
        geofencingEnabled: false,
        escalationKeywords: '',
        humanHandoffMsg: 'En un momento te atiendo un agente humano.',
      },
      createdAt: now,
      updatedAt: now,
    };

    const db = await getDb();
    const result = await db.collection('agents_v2').insertOne(doc);

    return Response.json({ ...doc, _id: result.insertedId.toString() }, { status: 201 });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
