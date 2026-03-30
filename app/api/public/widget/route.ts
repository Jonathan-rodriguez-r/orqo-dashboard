import { getDb } from '@/lib/mongodb';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  try {
    const db = await getDb();

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
