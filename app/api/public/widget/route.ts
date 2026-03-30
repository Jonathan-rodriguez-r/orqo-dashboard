import { getDb } from '@/lib/mongodb';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Cache-Control': 'no-store',
};

const INACTIVE = Response.json({ active: false }, { headers: CORS_HEADERS });

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');

    const db = await getDb();

    // If a key is provided, validate it against the account and check the account is active
    if (key) {
      const account = await db.collection('config').findOne({ _id: 'account' as any });
      if (!account || account.api_key !== key) return INACTIVE;
      // (Future: check account.plan_active flag here)
    }

    // Primary: new widget_config collection
    let doc = await db.collection('widget_config').findOne({ widgetId: 'default' });

    // Fallback: legacy config collection (saved before migration)
    if (!doc) {
      const legacy = await db.collection('config').findOne({ _id: 'widget' as any });
      if (legacy) {
        const { _id, ...rest } = legacy;
        return Response.json({ active: true, ...rest }, { headers: CORS_HEADERS });
      }
      return Response.json({ active: true, _defaults: true }, { headers: CORS_HEADERS });
    }

    const { _id, ...rest } = doc;
    return Response.json(rest, { headers: CORS_HEADERS });
  } catch {
    return Response.json({ active: true, _defaults: true }, { headers: CORS_HEADERS });
  }
}
