import { getDb } from '@/lib/mongodb';
import { randomBytes } from 'crypto';

const DEFAULTS = {
  plan: 'Starter',
  interactions_limit: 1000,
  interactions_used: 0,
  business_name: '',
  email: '',
  website: '',
  timezone: 'America/Bogota',
  language: 'es',
  api_key: '',
};

export async function GET() {
  try {
    const db = await getDb();
    let doc = await db.collection('config').findOne({ _id: 'account' as any });
    if (!doc) {
      const newDoc = { ...DEFAULTS, api_key: 'orqo_' + randomBytes(24).toString('hex') };
      await db.collection('config').insertOne({ _id: 'account' as any, ...newDoc });
      return Response.json(newDoc);
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
    delete body.api_key;
    const db = await getDb();
    await db.collection('config').updateOne(
      { _id: 'account' as any },
      { $set: body },
      { upsert: true }
    );
    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
