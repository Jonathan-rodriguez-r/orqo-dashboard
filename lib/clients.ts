import type { Db } from 'mongodb';

export const DEFAULT_CLIENT_ID = 'bacata-digital-meida';
export const DEFAULT_CLIENT_NAME = 'Bacata Digital Meida';
export const ORQO_INTERNAL_CLIENT_ID = 'orqo-internal';
export const ORQO_INTERNAL_CLIENT_NAME = 'ORQO Internal';
const DEFAULT_WORKSPACE_ID = String(process.env.DEFAULT_WORKSPACE_ID ?? 'default');

function isProtectedOperatorRole(role: string | undefined | null) {
  const clean = String(role ?? '').trim();
  return clean === 'owner' || clean.startsWith('orqo_');
}

export function resolveClientScopeForRole(args: {
  role?: string | null;
  workspaceClientId: string;
  workspaceClientName: string;
  promoteToGlobal?: boolean;
}) {
  const role = String(args.role ?? '').trim();
  if (isProtectedOperatorRole(role) && Boolean(args.promoteToGlobal)) {
    return {
      clientId: ORQO_INTERNAL_CLIENT_ID,
      clientName: ORQO_INTERNAL_CLIENT_NAME,
      isGlobalUser: true,
    };
  }

  return {
    clientId: String(args.workspaceClientId || DEFAULT_CLIENT_ID),
    clientName: String(args.workspaceClientName || DEFAULT_CLIENT_NAME),
    isGlobalUser: false,
  };
}

export async function ensureClientIndexes(db: Db) {
  await Promise.all([
    db.collection('clients').createIndex({ slug: 1 }, { unique: true }),
    db.collection('clients').createIndex({ status: 1 }),
    db.collection('workspaces').createIndex({ clientId: 1 }),
  ]);
}

export async function ensureDefaultClient(db: Db) {
  await ensureClientIndexes(db);

  await db.collection('clients').updateOne(
    { _id: ORQO_INTERNAL_CLIENT_ID as any },
    {
      $setOnInsert: {
        _id: ORQO_INTERNAL_CLIENT_ID,
        slug: ORQO_INTERNAL_CLIENT_ID,
        name: ORQO_INTERNAL_CLIENT_NAME,
        status: 'active',
        ownerEmail: '',
        notes: 'Cliente interno para usuarios globales ORQO',
        createdAt: new Date(),
      },
      $set: { updatedAt: new Date() },
    },
    { upsert: true }
  );

  await db.collection('clients').updateOne(
    { _id: DEFAULT_CLIENT_ID as any },
    {
      $setOnInsert: {
        _id: DEFAULT_CLIENT_ID,
        slug: DEFAULT_CLIENT_ID,
        name: DEFAULT_CLIENT_NAME,
        status: 'active',
        ownerEmail: '',
        notes: 'Cliente inicial ORQO',
        createdAt: new Date(),
      },
      $set: { updatedAt: new Date() },
    },
    { upsert: true }
  );

  await db.collection('workspaces').updateOne(
    { _id: DEFAULT_WORKSPACE_ID as any },
    {
      $set: {
        clientId: DEFAULT_CLIENT_ID,
        clientName: DEFAULT_CLIENT_NAME,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );
}

export async function getWorkspaceClient(db: Db, workspaceId: string) {
  await ensureDefaultClient(db);

  const ws = await db.collection('workspaces').findOne(
    { _id: workspaceId as any },
    { projection: { clientId: 1, clientName: 1 } }
  );

  let clientId = String(ws?.clientId ?? '').trim();
  let clientName = String(ws?.clientName ?? '').trim();

  if (!clientId) {
    clientId = DEFAULT_CLIENT_ID;
    clientName = DEFAULT_CLIENT_NAME;
    await db.collection('workspaces').updateOne(
      { _id: workspaceId as any },
      {
        $set: { clientId, clientName, updatedAt: new Date() },
      },
      { upsert: true }
    );
  }

  if (!clientName) {
    const client = await db.collection('clients').findOne(
      { _id: clientId as any },
      { projection: { name: 1 } }
    );
    clientName = String(client?.name ?? DEFAULT_CLIENT_NAME);
  }

  return { clientId, clientName };
}

export async function assignWorkspaceClient(db: Db, workspaceId: string, clientId: string) {
  await ensureDefaultClient(db);
  const target = await db.collection('clients').findOne({ _id: clientId as any });
  if (!target) return null;

  const clientName = String(target.name ?? DEFAULT_CLIENT_NAME);
  await db.collection('workspaces').updateOne(
    { _id: workspaceId as any },
    {
      $set: {
        clientId,
        clientName,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );

  return { clientId, clientName };
}
