import { getDb } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { randomBytes } from 'crypto';
import { getCurrentPeriodUsage } from '@/lib/usage-meter';
import { getWorkspaceConfig, setWorkspaceConfig } from '@/lib/workspace-config';
import { assignWorkspaceClient, getWorkspaceClient } from '@/lib/clients';
import { resolveScopedWorkspaceId } from '@/lib/access-control';
import { hasPermission } from '@/lib/rbac';

const DEFAULTS = {
  plan: 'Starter',
  interactions_limit: 1000,
  interactions_used: 0,
  business_name: '',
  email: '',
  website: '',
  active_domain: '',
  widget_page_url: '',
  widget_last_seen_at: 0,
  widget_seen_domains: [],
  timezone: 'America/Bogota',
  language: 'es',
  api_key: '',
  brand_primary_color: '#2CB978',
  brand_secondary_color: '#0B100D',
  escalation_email: '',
  incident_whatsapp: '',
  report_footer_note: '',
  logo_url: '',
  operations_owner: '',
  report_recipients: '',
  sla_first_response_min: 0,
  client_id: '',
  client_name: '',
};

function generateApiKey() {
  return 'orqo_' + randomBytes(24).toString('hex');
}

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const workspaceId = resolveScopedWorkspaceId(session, searchParams.get('workspaceId'));
    const client = await getWorkspaceClient(db, workspaceId);

    const cfg = await getWorkspaceConfig(db, workspaceId, 'account', { defaults: DEFAULTS });
    if (!cfg.api_key) {
      cfg.api_key = generateApiKey();
      await setWorkspaceConfig(db, workspaceId, 'account', { api_key: cfg.api_key });
    }

    const usage = await getCurrentPeriodUsage({
      db,
      workspaceId,
      timeZone: String(cfg?.timezone ?? DEFAULTS.timezone),
    });

    return Response.json({
      ...DEFAULTS,
      ...cfg,
      client_id: client.clientId,
      client_name: client.clientName,
      interactions_used: usage.interactions,
      interactions_period_key: usage.periodKey,
    });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const workspaceId = resolveScopedWorkspaceId(session, body.workspaceId ?? body.workspace_id ?? null);
    delete body.workspaceId;
    delete body.workspace_id;
    delete body.api_key;
    delete body.interactions_used;
    delete body.interactions_period_key;
    delete body.interactions_previous_period_key;
    delete body.interactions_previous_period_used;
    delete body.active_domain;
    delete body.widget_page_url;
    delete body.widget_last_seen_at;
    delete body.widget_seen_domains;
    const requestedClientId = String(body.client_id ?? '').trim();
    delete body.client_id;
    delete body.client_name;

    const db = await getDb();
    if (requestedClientId && hasPermission(session.permissions, 'admin.clients')) {
      const assigned = await assignWorkspaceClient(db, workspaceId, requestedClientId);
      if (!assigned) {
        return Response.json({ error: 'Cliente no encontrado' }, { status: 404 });
      }
    }
    await setWorkspaceConfig(db, workspaceId, 'account', body ?? {});
    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
