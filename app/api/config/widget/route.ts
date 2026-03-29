import { getDb } from '@/lib/mongodb';

const DEFAULTS = {
  color: '#2CB978',
  position: 'bottom-right',
  greeting: 'Hola 👋 ¿En qué te puedo ayudar?',
  welcome_title: 'Asistente ORQO',
  welcome_sub: 'Responde en menos de 1 minuto',
  interaction_limit: 20,
  show_branding: true,
  allow_file_upload: true,
  allow_voice: false,
  show_agent_avatar: true,
};

export async function GET() {
  try {
    const db = await getDb();
    const doc = await db.collection('config').findOne({ _id: 'widget' as any });
    if (!doc) {
      await db.collection('config').insertOne({ _id: 'widget' as any, ...DEFAULTS });
      return Response.json(DEFAULTS);
    }
    const { _id, ...rest } = doc;
    return Response.json(rest);
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const db = await getDb();
    await db.collection('config').updateOne(
      { _id: 'widget' as any },
      { $set: body },
      { upsert: true }
    );
    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
