import { getDb } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { defaultAlertSettings } from '@/lib/alerts';

function sanitizeSettings(body: any) {
  const defaults = defaultAlertSettings();
  const events = body?.events ?? {};
  const recipients = Array.isArray(body?.recipients) ? body.recipients : defaults.recipients;

  return {
    enabled: typeof body?.enabled === 'boolean' ? body.enabled : defaults.enabled,
    throttleMinutes: Number.isFinite(body?.throttleMinutes)
      ? Math.max(1, Number(body.throttleMinutes))
      : defaults.throttleMinutes,
    recipients: recipients
      .filter((r: unknown) => typeof r === 'string' && r.trim())
      .map((r: string) => r.trim()),
    events: {
      NO_PROVIDER_CONFIGURED:
        typeof events.NO_PROVIDER_CONFIGURED === 'boolean'
          ? events.NO_PROVIDER_CONFIGURED
          : defaults.events.NO_PROVIDER_CONFIGURED,
      ALL_PROVIDERS_FAILED:
        typeof events.ALL_PROVIDERS_FAILED === 'boolean'
          ? events.ALL_PROVIDERS_FAILED
          : defaults.events.ALL_PROVIDERS_FAILED,
      FREE_FALLBACK_FAILED:
        typeof events.FREE_FALLBACK_FAILED === 'boolean'
          ? events.FREE_FALLBACK_FAILED
          : defaults.events.FREE_FALLBACK_FAILED,
      DIAGNOSTIC_WARNINGS:
        typeof events.DIAGNOSTIC_WARNINGS === 'boolean'
          ? events.DIAGNOSTIC_WARNINGS
          : defaults.events.DIAGNOSTIC_WARNINGS,
      DIAGNOSTIC_FAILURE:
        typeof events.DIAGNOSTIC_FAILURE === 'boolean'
          ? events.DIAGNOSTIC_FAILURE
          : defaults.events.DIAGNOSTIC_FAILURE,
      WIDGET_INACTIVE:
        typeof events.WIDGET_INACTIVE === 'boolean'
          ? events.WIDGET_INACTIVE
          : defaults.events.WIDGET_INACTIVE,
      PUBLIC_API_UNHEALTHY:
        typeof events.PUBLIC_API_UNHEALTHY === 'boolean'
          ? events.PUBLIC_API_UNHEALTHY
          : defaults.events.PUBLIC_API_UNHEALTHY,
    },
  };
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const db = await getDb();
    const defaults = defaultAlertSettings();
    const doc = await db.collection('workspace_alert_settings').findOne({ workspaceId: session.workspaceId });
    const merged = {
      ...defaults,
      ...(doc ?? {}),
      workspaceId: session.workspaceId,
    };

    delete (merged as any)._id;
    return Response.json(merged);
  } catch (e: any) {
    return Response.json({ error: e?.message ?? 'Error interno' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session || !['owner', 'admin'].includes(session.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const raw = await req.json();
    const payload = sanitizeSettings(raw);

    const db = await getDb();
    await db.collection('workspace_alert_settings').updateOne(
      { workspaceId: session.workspaceId },
      { $set: { ...payload, workspaceId: session.workspaceId, updatedAt: new Date() } },
      { upsert: true }
    );

    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ error: e?.message ?? 'Error interno' }, { status: 500 });
  }
}
