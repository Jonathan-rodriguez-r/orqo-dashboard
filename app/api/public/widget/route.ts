import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { writeLog } from '@/app/api/admin/logs/route';
import { WIDGET_DEFAULTS } from '@/app/api/config/widget/route';
import { trackWidgetInstallSource } from '@/lib/widget-install-tracker';
import { findWorkspaceByApiKey, getWorkspaceConfig } from '@/lib/workspace-config';
import { readHostFromRequest, resolveWorkspaceFromHost } from '@/lib/tenant';

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

function normalizePreChatForm(raw: any) {
  const toBool = (value: any, fallback: boolean) => {
    if (typeof value === 'boolean') return value;
    const str = String(value ?? '').trim().toLowerCase();
    if (!str) return fallback;
    if (['true', '1', 'yes', 'si', 'on'].includes(str)) return true;
    if (['false', '0', 'no', 'off'].includes(str)) return false;
    return fallback;
  };
  const defaults = {
    enabled: false,
    fields: {
      name: { enabled: true, required: true },
      email: { enabled: true, required: false },
      phone: { enabled: false, required: false },
    },
  };
  const src = raw && typeof raw === 'object' ? raw : {};
  const fields = src.fields && typeof src.fields === 'object' ? src.fields : {};
  const read = (key: 'name' | 'email' | 'phone') => {
    const base = (defaults.fields as any)[key];
    const item = fields[key] && typeof fields[key] === 'object' ? fields[key] : {};
    const enabled = item.enabled !== undefined ? toBool(item.enabled, base.enabled) : base.enabled;
    const required = enabled && (item.required !== undefined ? toBool(item.required, base.required) : base.required);
    return { enabled, required };
  };
  return {
    enabled: src.enabled !== undefined ? toBool(src.enabled, defaults.enabled) : defaults.enabled,
    fields: {
      name: read('name'),
      email: read('email'),
      phone: read('phone'),
    },
  };
}

async function resolveWorkspaceId(db: Awaited<ReturnType<typeof getDb>>, req: Request, key: string) {
  if (key) {
    const fromKey = await findWorkspaceByApiKey(db, key);
    if (fromKey) return fromKey;
    return null;
  }

  const tenant = await resolveWorkspaceFromHost(db, readHostFromRequest(req), { allowFallback: false });
  return tenant?.workspaceId ?? null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = String(searchParams.get('key') ?? '').trim();
  const origin = req.headers.get('origin') ?? 'unknown';
  const referer = req.headers.get('referer') ?? '';
  const agentId = String(searchParams.get('agentId') ?? '').trim();
  const agentToken = String(searchParams.get('agentToken') ?? '').trim();

  try {
    const db = await getDb();
    const workspaceId = await resolveWorkspaceId(db, req, key);

    if (!workspaceId) {
      await writeLog({ level: 'warn', source: 'public-api', msg: 'API key invalida rechazada', detail: `origin: ${origin}` });
      return Response.json({ active: false }, { headers: CORS_HEADERS, status: 401 });
    }

    if (key) {
      await trackWidgetInstallSource({ db, workspaceId, origin, referer }).catch(() => {});
    }

    const account = await getWorkspaceConfig(db, workspaceId, 'account', { defaults: { api_key: '' } as any });
    const widgetCfgRaw = await getWorkspaceConfig(db, workspaceId, 'widget', { defaults: WIDGET_DEFAULTS });
    const cfg: any = normalizeWidgetCfg(widgetCfgRaw);
    cfg.articles = normalizeHelpArticles(cfg.articles);
    cfg.homeArticles = normalizeHomeArticles(cfg.homeArticles, cfg.articles);

    if (agentId && ObjectId.isValid(agentId)) {
      const agent = await db.collection('agents_v2').findOne(
        { _id: new ObjectId(agentId), workspaceId },
        {
          projection: {
            _id: 1,
            avatar: 1,
            avatarImageUrl: 1,
            webWidgetToken: 1,
            status: 1,
            preChatForm: 1,
          },
        }
      );

      if (agent && String(agent?.status ?? '') !== 'inactive') {
        const tokenOk = !agent.webWidgetToken || (agentToken && agentToken === agent.webWidgetToken);
        if (tokenOk) {
          const photo = pickAgentPhoto(agent);
          if (photo) {
            cfg.iconMode = 'photo';
            cfg.agentPhoto = photo;
          }
          if (agent?.preChatForm) {
            cfg.preChatForm = normalizePreChatForm(agent.preChatForm);
          }
        }
      }
    }

    await writeLog({
      level: 'info',
      source: 'public-api',
      msg: 'Config servida correctamente',
      workspaceId,
      detail: `workspace:${workspaceId} active:${cfg.active} origin:${origin} key:${Boolean(account?.api_key)}`,
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
