import { getDb } from '@/lib/mongodb';
import { writeLog } from '@/app/api/admin/logs/route';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Cache-Control': 'no-store',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key');
  const origin = req.headers.get('origin') ?? 'unknown';

  try {
    const db = await getDb();

    // If a key is provided, validate it against the account
    if (key) {
      const account = await db.collection('config').findOne({ _id: 'account' as any });
      if (!account || account.api_key !== key) {
        await writeLog({ level: 'warn', source: 'public-api', msg: 'API key inválida rechazada', detail: `origin: ${origin}` });
        return Response.json({ active: false }, { headers: CORS_HEADERS });
      }
    }

    // Primary: widget_config collection
    const doc = await db.collection('widget_config').findOne({ widgetId: 'default' });

    if (!doc) {
      // Fallback: legacy config collection
      const legacy = await db.collection('config').findOne({ _id: 'widget' as any });
      if (legacy) {
        await writeLog({ level: 'info', source: 'public-api', msg: 'Config servida desde colección legacy', detail: `origin: ${origin}` });
        const { _id, ...rest } = legacy;
        return Response.json({ active: true, ...rest }, { headers: CORS_HEADERS });
      }
      await writeLog({ level: 'warn', source: 'public-api', msg: 'No hay config en BD — sirviendo defaults', detail: `origin: ${origin}` });
      return Response.json({ active: true, _defaults: true }, { headers: CORS_HEADERS });
    }

    await writeLog({ level: 'info', source: 'public-api', msg: 'Config servida correctamente', detail: `active:${doc.active} origin:${origin}` });
    const { _id, ...rest } = doc;
    return Response.json(rest, { headers: CORS_HEADERS });

  } catch (e: any) {
    // LOG: MongoDB connection failure or query error
    await writeLog({ level: 'error', source: 'public-api', msg: 'Error leyendo config de MongoDB', detail: e.message }).catch(() => {});
    console.error('[ORQO] /api/public/widget error:', e.message);
    return Response.json({ active: true, _defaults: true }, { headers: CORS_HEADERS });
  }
}
