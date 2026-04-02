import { getDb } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { ensureDefaultClient, DEFAULT_CLIENT_ID } from '@/lib/clients';
import { hasPermission } from '@/lib/rbac';
import { canAccessProtectedRoles } from '@/lib/access-control';

function slugify(input: string) {
  return String(input || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function ownerOnly(session: Awaited<ReturnType<typeof getSession>>) {
  return !!session && hasPermission(session.permissions, 'admin.clients') && canAccessProtectedRoles(session);
}

export async function GET() {
  const session = await getSession();
  if (!ownerOnly(session)) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const db = await getDb();
  await ensureDefaultClient(db);

  const [clients, workspaces] = await Promise.all([
    db.collection<any>('clients').find({}).sort({ createdAt: -1 }).toArray(),
    db.collection<any>('workspaces').find({}, { projection: { _id: 1, name: 1, clientId: 1, clientName: 1 } }).toArray(),
  ]);

  const workspaceCountByClient = new Map<string, number>();
  for (const ws of workspaces) {
    const cid = String(ws?.clientId ?? DEFAULT_CLIENT_ID);
    workspaceCountByClient.set(cid, (workspaceCountByClient.get(cid) ?? 0) + 1);
  }

  return Response.json({
    ok: true,
    clients: clients.map((client: any) => ({
      _id: String(client._id),
      slug: String(client.slug ?? ''),
      name: String(client.name ?? ''),
      status: String(client.status ?? 'active'),
      ownerEmail: String(client.ownerEmail ?? ''),
      notes: String(client.notes ?? ''),
      workspaceCount: workspaceCountByClient.get(String(client._id)) ?? 0,
      createdAt: client.createdAt ?? null,
      updatedAt: client.updatedAt ?? null,
    })),
    workspaces: workspaces.map((ws: any) => ({
      _id: String(ws._id),
      name: String(ws.name ?? ws._id),
      clientId: String(ws.clientId ?? DEFAULT_CLIENT_ID),
      clientName: String(ws.clientName ?? ''),
    })),
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!ownerOnly(session)) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name ?? '').trim();
  const ownerEmail = String(body?.ownerEmail ?? '').trim().toLowerCase();
  const notes = String(body?.notes ?? '').trim();
  if (!name) return Response.json({ error: 'name requerido' }, { status: 400 });

  const db = await getDb();
  await ensureDefaultClient(db);

  const slug = slugify(String(body?.slug ?? '') || name);
  if (!slug) return Response.json({ error: 'slug invalido' }, { status: 400 });

  const existing = await db.collection<any>('clients').findOne({ slug });
  if (existing) return Response.json({ error: 'Ya existe un cliente con ese slug' }, { status: 409 });

  const _id = slug;
  await db.collection<any>('clients').insertOne({
    _id,
    slug,
    name,
    ownerEmail,
    notes,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: session?.email ?? 'system',
  });

  return Response.json({ ok: true, id: _id, slug });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!ownerOnly(session)) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const clientId = String(body?.id ?? '').trim();
  if (!clientId) return Response.json({ error: 'id requerido' }, { status: 400 });

  const db = await getDb();
  await ensureDefaultClient(db);

  const patch: Record<string, any> = {};
  if (typeof body?.name === 'string') patch.name = body.name.trim();
  if (typeof body?.ownerEmail === 'string') patch.ownerEmail = body.ownerEmail.trim().toLowerCase();
  if (typeof body?.notes === 'string') patch.notes = body.notes.trim();
  if (typeof body?.status === 'string') patch.status = body.status === 'inactive' ? 'inactive' : 'active';
  patch.updatedAt = new Date();

  await db.collection<any>('clients').updateOne({ _id: clientId as any }, { $set: patch });

  if (patch.name) {
    await db.collection<any>('workspaces').updateMany(
      { clientId },
      { $set: { clientName: patch.name, updatedAt: new Date() } }
    );
    await db.collection<any>('workspace_configs').updateMany(
      { clientId },
      { $set: { clientName: patch.name, updatedAt: new Date() } }
    );
  }

  if (body?.workspaceId) {
    const workspaceId = String(body.workspaceId).trim();
    const clientDoc = await db.collection<any>('clients').findOne({ _id: clientId as any });
    if (workspaceId && clientDoc) {
      await db.collection<any>('workspaces').updateOne(
        { _id: workspaceId as any },
        {
          $set: {
            clientId,
            clientName: String(clientDoc.name ?? ''),
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );
      await db.collection<any>('workspace_configs').updateMany(
        { workspaceId },
        {
          $set: {
            clientId,
            clientName: String(clientDoc.name ?? ''),
            updatedAt: new Date(),
          },
        }
      );
    }
  }

  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!ownerOnly(session)) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const clientId = String(body?.id ?? '').trim();
  if (!clientId) return Response.json({ error: 'id requerido' }, { status: 400 });
  if (clientId === DEFAULT_CLIENT_ID) {
    return Response.json({ error: 'No se puede eliminar el cliente base' }, { status: 400 });
  }

  const db = await getDb();
  await db.collection<any>('clients').updateOne(
    { _id: clientId as any },
    { $set: { status: 'inactive', updatedAt: new Date() } }
  );

  return Response.json({ ok: true });
}
