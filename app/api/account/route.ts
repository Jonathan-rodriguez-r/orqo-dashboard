import { getDb } from '@/lib/mongodb';
import { randomBytes } from 'crypto';
import { getCurrentPeriodUsage } from '@/lib/usage-meter';

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
  brand_primary_color: '#2CB978',
  brand_secondary_color: '#0B100D',
  escalation_email: '',
  incident_whatsapp: '',
  report_footer_note: '',
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
    if (!rest.api_key) {
      rest.api_key = 'orqo_' + randomBytes(24).toString('hex');
      await db.collection('config').updateOne(
        { _id: 'account' as any },
        { $set: { api_key: rest.api_key } }
      );
    }
    const usage = await getCurrentPeriodUsage({
      db,
      workspaceId: 'default',
      timeZone: String(rest?.timezone ?? DEFAULTS.timezone),
    });
    return Response.json({
      ...DEFAULTS,
      ...rest,
      interactions_used: usage.interactions,
      interactions_period_key: usage.periodKey,
    });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    delete body.api_key;
    delete body.interactions_used;
    delete body.interactions_period_key;
    delete body.interactions_previous_period_key;
    delete body.interactions_previous_period_used;
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
