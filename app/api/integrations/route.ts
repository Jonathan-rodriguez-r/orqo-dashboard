import { getDb } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { getWorkspaceConfig, setWorkspaceConfig } from '@/lib/workspace-config';
import { resolveScopedWorkspaceId } from '@/lib/access-control';

const DEFAULTS = {
  wordpress: { url: '', api_key: '', wp_user: '', enabled: false },
  whatsapp: { phone: '', token: '', phone_number_id: '', webhook_token: '', enabled: false },
};

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const workspaceId = resolveScopedWorkspaceId(session, searchParams.get('workspaceId'));

    const db = await getDb();
    const cfg = await getWorkspaceConfig(db, workspaceId, 'integrations', { defaults: DEFAULTS });
    return Response.json({ ...DEFAULTS, ...cfg });
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

    const db = await getDb();
    await setWorkspaceConfig(db, workspaceId, 'integrations', body ?? {});
    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}