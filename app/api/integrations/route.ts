import { getDb } from '@/lib/mongodb';

const DEFAULTS = {
  wordpress: { url: '', api_key: '', wp_user: '', enabled: false },
  whatsapp: { phone: '', token: '', phone_number_id: '', webhook_token: '', enabled: false },
};

export async function GET() {
  try {
    const db = await getDb();
    const doc = await db.collection('config').findOne({ _id: 'integrations' as any });
    if (!doc) return Response.json(DEFAULTS);
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
      { _id: 'integrations' as any },
      { $set: body },
      { upsert: true }
    );
    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
