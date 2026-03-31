import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { writeLog } from '@/app/api/admin/logs/route';
import { WIDGET_DEFAULTS } from '@/app/api/config/widget/route';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Cache-Control': 'no-store',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

function normalizeWidgetCfg(doc: any) {
  return {
    ...WIDGET_DEFAULTS,
    ...(doc ?? {}),
    widgetId: 'default',
  };
}

function pickAgentPhoto(agent: any): string {
  const candidate = String(agent?.avatarImageUrl ?? agent?.avatar ?? '').trim();
  if (!candidate) return '';
  if (/^https?:\/\//i.test(candidate)) return candidate;
  return '';
}

function normalizeHelpArticles(rawArticles: any) {
  const source = Array.isArray(rawArticles) ? rawArticles : [];
  const fallback = Array.isArray((WIDGET_DEFAULTS as any).articles) ? (WIDGET_DEFAULTS as any).articles : [];
  const base = source.length > 0 ? source : fallback;

  return base
    .filter((a: any) => a && typeof a.id === 'string' && typeof a.title === 'string')
    .map((a: any) => ({
      id: String(a.id),
      title: String(a.title),
      category: 'Ayuda',
      date: String(a.date ?? 'Actualizado recientemente'),
      body: String(a.body ?? ''),
    }));
}

function normalizeHomeArticles(homeArticles: any, articles: Array<{ id: string }>) {
  const allowed = new Set(articles.map((a) => a.id));
  const fromCfg = Array.isArray(homeArticles) ? homeArticles.filter((id) => allowed.has(String(id))).map(String) : [];
  if (fromCfg.length > 0) return fromCfg.slice(0, 6);
  return articles.slice(0, 4).map((a) => a.id);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key');
  const origin = req.headers.get('origin') ?? 'unknown';
  const agentId = String(searchParams.get('agentId') ?? '').trim();
  const agentToken = String(searchParams.get('agentToken') ?? '').trim();

  try {
    const db = await getDb();

    // If key is provided, validate account key
    if (key) {
      const account = await db.collection('config').findOne({ _id: 'account' as any });
      if (!account || account.api_key !== key) {
        await writeLog({ level: 'warn', source: 'public-api', msg: 'API key invalida rechazada', detail: `origin: ${origin}` });
        return Response.json({ active: false }, { headers: CORS_HEADERS });
      }
    }

    // Primary source: widget_config
    const doc = await db.collection('widget_config').findOne({ widgetId: 'default' });

    // Fallback: legacy config document
    if (!doc) {
      const legacy = await db.collection('config').findOne({ _id: 'widget' as any });
      if (legacy) {
        const { _id, ...rest } = legacy;
        const cfg = normalizeWidgetCfg({ active: true, ...rest, _defaults: false });
        cfg.articles = normalizeHelpArticles(cfg.articles);
        cfg.homeArticles = normalizeHomeArticles(cfg.homeArticles, cfg.articles);
        await writeLog({ level: 'info', source: 'public-api', msg: 'Config servida desde coleccion legacy', detail: `origin:${origin}` });
        return Response.json(cfg, { headers: CORS_HEADERS });
      }

      await writeLog({ level: 'warn', source: 'public-api', msg: 'No hay config en BD - sirviendo defaults', detail: `origin:${origin}` });
      const defaultsCfg: any = { ...WIDGET_DEFAULTS, _defaults: true };
      defaultsCfg.articles = normalizeHelpArticles(defaultsCfg.articles);
      defaultsCfg.homeArticles = normalizeHomeArticles(defaultsCfg.homeArticles, defaultsCfg.articles);
      return Response.json(defaultsCfg, { headers: CORS_HEADERS });
    }

    const { _id, ...rest } = doc;
    const cfg: any = normalizeWidgetCfg(rest);
    cfg.articles = normalizeHelpArticles(cfg.articles);
    cfg.homeArticles = normalizeHomeArticles(cfg.homeArticles, cfg.articles);

    // Optional agent-level visual override for embed scripts
    if (agentId && ObjectId.isValid(agentId)) {
      const agent = await db.collection('agents_v2').findOne({ _id: new ObjectId(agentId) }, {
        projection: { _id: 1, avatar: 1, avatarImageUrl: 1, webWidgetToken: 1, status: 1 },
      });

      if (agent && String(agent?.status ?? '') !== 'inactive') {
        const tokenOk = !agent.webWidgetToken || (agentToken && agentToken === agent.webWidgetToken);
        if (tokenOk) {
          const photo = pickAgentPhoto(agent);
          if (photo) {
            cfg.iconMode = 'photo';
            cfg.agentPhoto = photo;
          }
        }
      }
    }

    await writeLog({
      level: 'info',
      source: 'public-api',
      msg: 'Config servida correctamente',
      detail: `active:${cfg.active} origin:${origin}`,
    });

    return Response.json(cfg, { headers: CORS_HEADERS });
  } catch (e: any) {
    await writeLog({ level: 'error', source: 'public-api', msg: 'Error leyendo config de MongoDB', detail: e.message }).catch(() => {});
    console.error('[ORQO] /api/public/widget error:', e.message);
    const defaultsCfg: any = { ...WIDGET_DEFAULTS, _defaults: true };
    defaultsCfg.articles = normalizeHelpArticles(defaultsCfg.articles);
    defaultsCfg.homeArticles = normalizeHomeArticles(defaultsCfg.homeArticles, defaultsCfg.articles);
    return Response.json(defaultsCfg, { headers: CORS_HEADERS });
  }
}
