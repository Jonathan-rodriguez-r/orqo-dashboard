import { getDb } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';
import { canAccessProtectedRoles } from '@/lib/access-control';
import { CoreClient } from '@/lib/core-client';
import { writeLog } from '@/app/api/admin/logs/route';

function slugify(input: string) {
  return String(input || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function canManageWorkspaces(session: Awaited<ReturnType<typeof getSession>>) {
  return !!session && hasPermission(session.permissions, 'admin.clients') && canAccessProtectedRoles(session);
}

export async function GET() {
  const session = await getSession();
  if (!canManageWorkspaces(session)) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const db = await getDb();
  const workspaces = await db
    .collection<any>('workspaces')
    .find({}, { projection: { _id: 1, name: 1, slug: 1, clientId: 1, clientName: 1, status: 1, domains: 1 } })
    .sort({ name: 1 })
    .toArray();

  return Response.json({
    ok: true,
    items: workspaces.map((workspace: any) => ({
      _id: String(workspace._id),
      name: String(workspace.name ?? workspace._id),
      slug: String(workspace.slug ?? ''),
      clientId: String(workspace.clientId ?? ''),
      clientName: String(workspace.clientName ?? ''),
      status: String(workspace.status ?? 'active'),
      domains: Array.isArray(workspace.domains) ? workspace.domains.map((domain: unknown) => String(domain)) : [],
    })),
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!canManageWorkspaces(session)) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name ?? '').trim();
  const clientId = String(body?.clientId ?? '').trim();
  const slug = slugify(String(body?.slug ?? '') || name);

  if (!name) return Response.json({ error: 'name requerido' }, { status: 400 });
  if (!clientId) return Response.json({ error: 'clientId requerido' }, { status: 400 });
  if (!slug) return Response.json({ error: 'slug invalido' }, { status: 400 });

  const db = await getDb();
  const targetClient = await db.collection<any>('clients').findOne({ _id: clientId as any });
  if (!targetClient) return Response.json({ error: 'Cliente no encontrado' }, { status: 404 });

  const existing = await db.collection<any>('workspaces').findOne({
    $or: [{ _id: slug as any }, { slug }],
  });
  if (existing) return Response.json({ error: 'Ya existe una cuenta con ese slug' }, { status: 409 });

  const doc = {
    _id: slug,
    slug,
    name,
    clientId,
    clientName: String(targetClient.name ?? ''),
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.collection<any>('workspaces').insertOne(doc);

  // Auto-provision Core workspace — best-effort, don't fail the request if Core is down
  void (async () => {
    try {
      const alreadyProvisioned = await db
        .collection('workspace_configs')
        .findOne({ workspaceId: slug, key: 'core' });

      if (alreadyProvisioned?.coreWorkspaceId) return;

      const coreResult = await CoreClient.provision({
        name,
        agentName: name,
        plan: 'starter',
        timezone: 'America/Bogota',
        trialDays: 14,
      });

      if (coreResult.ok) {
        await db.collection('workspace_configs').updateOne(
          { workspaceId: slug, key: 'core' },
          {
            $set: {
              workspaceId: slug,
              key: 'core',
              clientId,
              clientName: String(targetClient.name ?? ''),
              coreWorkspaceId: coreResult.data.workspaceId,
              coreAgentId: coreResult.data.agentId,
              provisionedAt: new Date(),
              updatedAt: new Date(),
            },
          },
          { upsert: true }
        );
        void writeLog({
          level: 'info',
          source: 'workspaces',
          msg: `Workspace provisionado en Core`,
          detail: `workspaceId:${slug} coreWorkspaceId:${coreResult.data.workspaceId}`,
          workspaceId: slug,
        });
      } else {
        void writeLog({
          level: 'warn',
          source: 'workspaces',
          msg: `Workspace creado pero fallo provisioning en Core`,
          detail: `workspaceId:${slug} error:${coreResult.error}`,
          workspaceId: slug,
        });
      }
    } catch (e) {
      void writeLog({
        level: 'warn',
        source: 'workspaces',
        msg: `Excepción en auto-provisioning de Core`,
        detail: `workspaceId:${slug} error:${e instanceof Error ? e.message : String(e)}`,
        workspaceId: slug,
      });
    }
  })();

  return Response.json({
    ok: true,
    item: {
      _id: doc._id,
      name: doc.name,
      slug: doc.slug,
      clientId: doc.clientId,
      clientName: doc.clientName,
      status: doc.status,
      domains: [],
    },
  });
}
