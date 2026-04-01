import { getDb } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { randomBytes } from 'crypto';

const DEFAULT_AGENT = {
  name: 'Asistente Informativo',
  status: 'active' as const,
  avatar: 'ai-core',
  channels: { whatsapp: false, instagram: false, messenger: false, web: true, woocommerce: false, shopify: false },
  profile: {
    systemPrompt: 'Eres un asistente informativo amigable. Tu objetivo es responder las preguntas de los usuarios de manera clara, precisa y concisa. Siempre mantén un tono profesional y útil.',
    personality: 'professional',
    languages: ['auto'],
    responseLength: 'standard',
  },
  skills: ['faq', 'explain'],
  corporateContext: 'Soy el asistente virtual. Estoy aquí para ayudarte con información general sobre nuestros productos y servicios.',
  advanced: {
    timezone: 'America/Bogota',
    scheduleEnabled: false,
    geofencingEnabled: false,
    escalationKeywords: 'hablar con agente, cancelar, queja, urgente',
    humanHandoffMsg: 'En un momento te atiendo un agente humano.',
  },
  preChatForm: {
    enabled: false,
    fields: {
      name:  { enabled: true,  required: true  },
      email: { enabled: true,  required: false },
      phone: { enabled: false, required: false },
    },
  },
  tokenLimits: {
    periodEnabled: false,
    period: 'month',
    periodLimit: 100000,
    convEnabled: false,
    convLimit: 4000,
  },
};

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

    // Seed default informative agent for new workspaces
    if (agents.length === 0) {
      const now = new Date();
      const doc = {
        workspaceId: session.workspaceId,
        ...DEFAULT_AGENT,
        webWidgetToken: 'awt_' + randomBytes(18).toString('hex'),
        createdAt: now,
        updatedAt: now,
      };
      const result = await db.collection('agents_v2').insertOne(doc);
      return Response.json([{
        _id: result.insertedId.toString(),
        name: doc.name, status: doc.status, avatar: doc.avatar,
        channels: doc.channels, createdAt: doc.createdAt,
      }]);
    }

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
      avatar: body.avatar ?? 'ai-core',
      aiProvider: body.aiProvider ?? { provider: 'google', model: 'gemini-2.0-flash' },
      channels: body.channels ?? {
        whatsapp: false, instagram: false, messenger: false,
        web: true, woocommerce: false, shopify: false,
      },
      webWidgetToken: (body.channels?.web ?? true) ? ('awt_' + randomBytes(18).toString('hex')) : '',
      profile: body.profile ?? {
        systemPrompt: '', personality: 'professional',
        languages: ['auto'], responseLength: 'standard',
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
      preChatForm: body.preChatForm ?? {
        enabled: false,
        fields: {
          name:  { enabled: true,  required: true  },
          email: { enabled: true,  required: false },
          phone: { enabled: false, required: false },
        },
      },
      tokenLimits: body.tokenLimits ?? {
        periodEnabled: false,
        period: 'month',
        periodLimit: 100000,
        convEnabled: false,
        convLimit: 4000,
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
