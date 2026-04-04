import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { writeLog } from '@/app/api/admin/logs/route';
import { emitWorkspaceAlert } from '@/lib/alerts';
import { resolveScopedWorkspaceId } from '@/lib/access-control';

type CheckStatus = 'ok' | 'warn' | 'error';
type CheckResult = {
  key: string;
  label: string;
  status: CheckStatus;
  detail: string;
};

type OpenRouterModel = {
  id?: string;
  pricing?: { prompt?: string; completion?: string };
};

function looksLikeQuotaError(message: string) {
  const m = message.toLowerCase();
  return (
    m.includes('quota') ||
    m.includes('billing') ||
    m.includes('insufficient') ||
    m.includes('rate limit') ||
    m.includes('token') ||
    m.includes('credits')
  );
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const workspaceId = resolveScopedWorkspaceId(session, searchParams.get('workspaceId'));

  const db = await getDb();
  const results: CheckResult[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  const origin = (() => {
    const u = new URL(req.url);
    return `${u.protocol}//${u.host}`;
  })();

  // 1) Public widget API health
  try {
    const t0 = Date.now();
    const res = await fetch(`${origin}/api/public/widget`, { cache: 'no-store' });
    const latency = Date.now() - t0;
    if (!res.ok) {
      const msg = `HTTP ${res.status} en endpoint publico`;
      results.push({ key: 'public_api', label: 'API publica widget', status: 'error', detail: msg });
      errors.push(msg);
    } else {
      const data = await res.json().catch(() => ({}));
      results.push({
        key: 'public_api',
        label: 'API publica widget',
        status: 'ok',
        detail: `HTTP 200 en ${latency}ms`,
      });
      if (data?.active === false) {
        const msg = 'Widget configurado como inactivo.';
        results.push({ key: 'widget_active', label: 'Estado de widget', status: 'warn', detail: msg });
        warnings.push(msg);
      } else {
        results.push({ key: 'widget_active', label: 'Estado de widget', status: 'ok', detail: 'Widget activo.' });
      }
      if (data?._defaults) {
        const msg = 'No hay config persistida de widget (sirviendo defaults).';
        results.push({ key: 'widget_config', label: 'Config widget MongoDB', status: 'warn', detail: msg });
        warnings.push(msg);
      } else {
        results.push({ key: 'widget_config', label: 'Config widget MongoDB', status: 'ok', detail: 'Config encontrada.' });
      }
    }
  } catch (e: any) {
    const msg = `Error de red API publica: ${e?.message ?? 'unknown'}`;
    results.push({ key: 'public_api', label: 'API publica widget', status: 'error', detail: msg });
    errors.push(msg);
  }

  // 2) Workspace providers and fallback
  const ws = await db.collection('workspace_settings').findOne({ workspaceId: workspaceId });
  const providers = ws?.aiProviders ?? {};
  const providerList = ['google', 'openai', 'grok', 'anthropic'];
  const activeCount = providerList.filter((k) => providers?.[k]?.enabled && String(providers?.[k]?.apiKey ?? '').trim()).length;
  if (activeCount === 0) {
    const msg = 'No hay proveedores activos con API key.';
    results.push({ key: 'providers', label: 'Proveedores IA', status: 'warn', detail: msg });
    warnings.push(msg);
  } else {
    results.push({ key: 'providers', label: 'Proveedores IA', status: 'ok', detail: `${activeCount} proveedor(es) activo(s).` });
  }

  const fallback = ws?.fallback ?? {};
  if (fallback.useFreeModels) {
    const keySet = String(fallback.freeProviderApiKey ?? '').trim() || process.env.OPENROUTER_API_KEY || process.env.ORQO_FREE_OPENROUTER_API_KEY;
    const models = Array.isArray(fallback.freeModels) ? fallback.freeModels.filter((m: unknown) => typeof m === 'string' && m.trim()) : [];
    if (!keySet) {
      const msg = 'Fallback free activo pero sin API key OpenRouter.';
      results.push({ key: 'free_fallback_key', label: 'Fallback gratuito', status: 'warn', detail: msg });
      warnings.push(msg);
    } else if (models.length === 0) {
      const msg = 'Fallback free activo pero sin modelos configurados.';
      results.push({ key: 'free_fallback_models', label: 'Modelos gratuitos', status: 'warn', detail: msg });
      warnings.push(msg);
    } else {
      results.push({ key: 'free_fallback', label: 'Fallback gratuito', status: 'ok', detail: `${models.length} modelo(s) free configurado(s).` });

      const freeSuffixMissing = models.filter((m: string) => !String(m).toLowerCase().includes(':free'));
      if (freeSuffixMissing.length > 0) {
        const msg = `Modelos sin sufijo :free: ${freeSuffixMissing.join(', ')}`;
        results.push({ key: 'free_suffix', label: 'Formato de modelos free', status: 'warn', detail: msg });
        warnings.push(msg);
      } else {
        results.push({ key: 'free_suffix', label: 'Formato de modelos free', status: 'ok', detail: 'Todos usan sufijo :free.' });
      }

      const catalog = await fetchOpenRouterModels(keySet);
      if (catalog.ok) {
        const configured = new Set<string>(models.map((m: string) => m.trim().toLowerCase()));
        const ids = catalog.models
          .map((m) => String(m?.id || '').trim())
          .filter(Boolean);
        const lowerIds = new Set(ids.map((x) => x.toLowerCase()));
        const missing = Array.from(configured).filter((m) => !lowerIds.has(m));

        const availableFree = catalog.models
          .filter((m) => isOpenRouterFreeModel(m))
          .map((m) => String(m.id || '').trim())
          .filter(Boolean);

        if (missing.length > 0) {
          const msg = `Modelos no encontrados en OpenRouter: ${missing.join(', ')}`;
          results.push({ key: 'free_catalog_match', label: 'Modelos free en catalogo', status: 'warn', detail: msg });
          warnings.push(msg);
        } else {
          results.push({
            key: 'free_catalog_match',
            label: 'Modelos free en catalogo',
            status: 'ok',
            detail: 'Todos los modelos configurados existen en OpenRouter.',
          });
        }

        results.push({
          key: 'free_catalog_examples',
          label: 'Modelos free detectados',
          status: availableFree.length > 0 ? 'ok' : 'warn',
          detail: availableFree.length > 0
            ? availableFree.slice(0, 8).join(', ')
            : 'No se detectaron modelos free en la respuesta del catalogo.',
        });
      } else {
        const msg = `No se pudo consultar catalogo OpenRouter: ${catalog.error}`;
        results.push({ key: 'free_catalog_fetch', label: 'Catalogo OpenRouter', status: 'warn', detail: msg });
        warnings.push(msg);
      }
    }
  } else {
    results.push({ key: 'free_fallback', label: 'Fallback gratuito', status: 'ok', detail: 'Desactivado (opcional).' });
  }

  // 3) Agents for web channel
  const activeWebAgents = await db.collection('agents_v2').countDocuments({
    workspaceId: workspaceId,
    status: 'active',
    'channels.web': true,
  });
  if (activeWebAgents === 0) {
    const msg = 'No hay agentes activos con canal Web Widget.';
    results.push({ key: 'web_agents', label: 'Agentes Web', status: 'warn', detail: msg });
    warnings.push(msg);
  } else {
    results.push({ key: 'web_agents', label: 'Agentes Web', status: 'ok', detail: `${activeWebAgents} agente(s) activo(s) en web.` });
  }

  // 4) Recent runtime errors
  const last24h = Date.now() - 24 * 60 * 60 * 1000;
  const runtimeErrors = await db
    .collection('activity_logs')
    .countDocuments({ workspaceId: workspaceId, ts: { $gte: last24h }, level: 'error' });
  if (runtimeErrors > 0) {
    results.push({
      key: 'runtime_errors',
      label: 'Errores runtime 24h',
      status: 'warn',
      detail: `${runtimeErrors} errores detectados en activity_logs.`,
    });
    warnings.push(`${runtimeErrors} errores runtime en 24h.`);
  } else {
    results.push({ key: 'runtime_errors', label: 'Errores runtime 24h', status: 'ok', detail: 'Sin errores en 24h.' });
  }

  const hasError = errors.length > 0;
  const hasWarn = warnings.length > 0;

  await writeLog({
    level: hasError ? 'error' : hasWarn ? 'warn' : 'info',
    source: 'help-diagnostics',
    workspaceId: workspaceId,
    msg: hasError ? 'Diagnostico finalizo con errores' : hasWarn ? 'Diagnostico finalizo con advertencias' : 'Diagnostico finalizo OK',
    detail: [...errors, ...warnings].join(' | ').slice(0, 1300),
  }).catch(() => {});

  if (hasError) {
    await emitWorkspaceAlert({
      db,
      workspaceId: workspaceId,
      eventCode: 'DIAGNOSTIC_FAILURE',
      severity: 'critical',
      title: 'Diagnostico detecto errores',
      body: 'Centro de ayuda reporto errores criticos en checks operativos.',
      meta: { errors },
    }).catch(() => {});
  }

  if (hasWarn) {
    await emitWorkspaceAlert({
      db,
      workspaceId: workspaceId,
      eventCode: 'DIAGNOSTIC_WARNINGS',
      severity: 'warning',
      title: 'Diagnostico detecto advertencias',
      body: 'Centro de ayuda reporto advertencias operativas.',
      meta: { warnings },
    }).catch(() => {});
  }

  if (warnings.some((w) => w.includes('Widget configurado como inactivo'))) {
    await emitWorkspaceAlert({
      db,
      workspaceId: workspaceId,
      eventCode: 'WIDGET_INACTIVE',
      severity: 'warning',
      title: 'Widget inactivo detectado',
      body: 'El diagnostico encontro widget inactivo en configuracion.',
    }).catch(() => {});
  }

  if (errors.some((w) => w.includes('API publica'))) {
    await emitWorkspaceAlert({
      db,
      workspaceId: workspaceId,
      eventCode: 'PUBLIC_API_UNHEALTHY',
      severity: 'critical',
      title: 'API publica del widget con falla',
      body: 'El diagnostico no pudo validar correctamente /api/public/widget.',
    }).catch(() => {});
  }

  return Response.json({
    ok: true,
    summary: {
      status: hasError ? 'error' : hasWarn ? 'warn' : 'ok',
      warningCount: warnings.length,
      errorCount: errors.length,
      quotaLikeWarnings: [...warnings, ...errors].filter(looksLikeQuotaError).length,
    },
    results,
  });
}

async function fetchOpenRouterModels(apiKey?: string) {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

    const res = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers,
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false as const, error: data?.error?.message ?? `HTTP ${res.status}` };
    }
    const models = Array.isArray(data?.data) ? (data.data as OpenRouterModel[]) : [];
    return { ok: true as const, models };
  } catch (e: any) {
    return { ok: false as const, error: e?.message ?? 'network error' };
  }
}

function isOpenRouterFreeModel(m: OpenRouterModel) {
  const id = String(m?.id || '').toLowerCase();
  if (id.includes(':free')) return true;
  const prompt = String(m?.pricing?.prompt ?? '');
  const completion = String(m?.pricing?.completion ?? '');
  return prompt === '0' && completion === '0';
}
