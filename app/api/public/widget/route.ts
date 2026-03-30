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
    const doc = await db.collection('widget_config').findOne({ widgetId: 'default' });
    if (!doc) {
      return Response.json({ active: true, _defaults: true }, { headers: CORS_HEADERS });
    }
    const { _id, ...rest } = doc;
    return Response.json(rest, { headers: CORS_HEADERS });
  } catch {
    return Response.json({ active: true, _defaults: true }, { headers: CORS_HEADERS });
  }
}
