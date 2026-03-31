import type { Db } from 'mongodb';

export type AlertEventCode =
  | 'NO_PROVIDER_CONFIGURED'
  | 'ALL_PROVIDERS_FAILED'
  | 'FREE_FALLBACK_FAILED';

export type AlertSeverity = 'info' | 'warning' | 'critical';

type AlertSettings = {
  enabled: boolean;
  throttleMinutes: number;
  recipients: string[];
  events: Record<AlertEventCode, boolean>;
};

const DEFAULT_ALERT_SETTINGS: AlertSettings = {
  enabled: true,
  throttleMinutes: 10,
  recipients: ['owner', 'operations', 'admin'],
  events: {
    NO_PROVIDER_CONFIGURED: true,
    ALL_PROVIDERS_FAILED: true,
    FREE_FALLBACK_FAILED: true,
  },
};

export async function readAlertSettings(db: Db, workspaceId?: string): Promise<AlertSettings> {
  const safeWorkspaceId = workspaceId || 'default';
  const doc = await db.collection('workspace_alert_settings').findOne({ workspaceId: safeWorkspaceId });
  const safeDoc: any = doc ?? {};

  return {
    enabled: typeof safeDoc.enabled === 'boolean' ? safeDoc.enabled : DEFAULT_ALERT_SETTINGS.enabled,
    throttleMinutes: Number.isFinite(safeDoc.throttleMinutes)
      ? Math.max(1, Number(safeDoc.throttleMinutes))
      : DEFAULT_ALERT_SETTINGS.throttleMinutes,
    recipients: Array.isArray(safeDoc.recipients) && safeDoc.recipients.length > 0
      ? safeDoc.recipients.filter((r: unknown) => typeof r === 'string' && r.trim()).map((r: string) => r.trim())
      : DEFAULT_ALERT_SETTINGS.recipients,
    events: {
      NO_PROVIDER_CONFIGURED:
        typeof safeDoc.events?.NO_PROVIDER_CONFIGURED === 'boolean'
          ? safeDoc.events.NO_PROVIDER_CONFIGURED
          : DEFAULT_ALERT_SETTINGS.events.NO_PROVIDER_CONFIGURED,
      ALL_PROVIDERS_FAILED:
        typeof safeDoc.events?.ALL_PROVIDERS_FAILED === 'boolean'
          ? safeDoc.events.ALL_PROVIDERS_FAILED
          : DEFAULT_ALERT_SETTINGS.events.ALL_PROVIDERS_FAILED,
      FREE_FALLBACK_FAILED:
        typeof safeDoc.events?.FREE_FALLBACK_FAILED === 'boolean'
          ? safeDoc.events.FREE_FALLBACK_FAILED
          : DEFAULT_ALERT_SETTINGS.events.FREE_FALLBACK_FAILED,
    },
  };
}

export async function emitWorkspaceAlert(args: {
  db: Db;
  workspaceId?: string;
  eventCode: AlertEventCode;
  severity: AlertSeverity;
  title: string;
  body: string;
  meta?: Record<string, unknown>;
}) {
  const workspaceId = args.workspaceId || 'default';
  const settings = await readAlertSettings(args.db, workspaceId);
  if (!settings.enabled || !settings.events[args.eventCode]) return { ok: true, skipped: 'disabled' as const };

  const now = new Date();
  const throttleStart = new Date(now.getTime() - settings.throttleMinutes * 60 * 1000);

  const recentlyEmitted = await args.db.collection('alert_events').findOne({
    workspaceId,
    eventCode: args.eventCode,
    createdAt: { $gte: throttleStart },
  });
  if (recentlyEmitted) return { ok: true, skipped: 'throttled' as const };

  await args.db.collection('alert_events').insertOne({
    workspaceId,
    eventCode: args.eventCode,
    severity: args.severity,
    title: args.title,
    body: args.body,
    meta: args.meta ?? {},
    recipients: settings.recipients,
    createdAt: now,
  });

  await args.db.collection('notifications').insertOne({
    workspaceId,
    type: args.severity,
    title: args.title,
    body: args.body,
    read: false,
    recipientRoles: settings.recipients,
    eventCode: args.eventCode,
    meta: args.meta ?? {},
    createdAt: now,
    expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
  });

  return { ok: true };
}

export function defaultAlertSettings() {
  return DEFAULT_ALERT_SETTINGS;
}
