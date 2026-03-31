import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { writeLog } from '@/app/api/admin/logs/route';
import { emitWorkspaceAlert } from '@/lib/alerts';

type CheckStatus = 'ok' | 'warn' | 'error';
type CheckResult = {
  key: string;
  label: string;
  status: CheckStatus;
  detail: string;
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
  const ws = await db.collection('workspace_settings').findOne({ workspaceId: session.workspaceId });
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
    }
  } else {
    results.push({ key: 'free_fallback', label: 'Fallback gratuito', status: 'ok', detail: 'Desactivado (opcional).' });
  }

  // 3) Agents for web channel
  const activeWebAgents = await db.collection('agents_v2').countDocuments({
    workspaceId: session.workspaceId,
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
  const runtimeErrors = await db.collection('activity_logs').countDocuments({ ts: { $gte: last24h }, level: 'error' });
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
    msg: hasError ? 'Diagnostico finalizo con errores' : hasWarn ? 'Diagnostico finalizo con advertencias' : 'Diagnostico finalizo OK',
    detail: [...errors, ...warnings].join(' | ').slice(0, 1300),
  }).catch(() => {});

  if (hasError) {
    await emitWorkspaceAlert({
      db,
      workspaceId: session.workspaceId,
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
      workspaceId: session.workspaceId,
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
      workspaceId: session.workspaceId,
      eventCode: 'WIDGET_INACTIVE',
      severity: 'warning',
      title: 'Widget inactivo detectado',
      body: 'El diagnostico encontro widget inactivo en configuracion.',
    }).catch(() => {});
  }

  if (errors.some((w) => w.includes('API publica'))) {
    await emitWorkspaceAlert({
      db,
      workspaceId: session.workspaceId,
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
