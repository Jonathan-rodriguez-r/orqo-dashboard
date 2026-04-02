import type { Db } from 'mongodb';
import { getDefaultWorkspaceId } from '@/lib/tenant';
import { getWorkspaceClient } from '@/lib/clients';

type WorkspaceConfigKey = 'account' | 'integrations' | 'widget';

type GetConfigOptions<T extends Record<string, any>> = {
  defaults: T;
  allowLegacyMigration?: boolean;
};

const CONFIG_COLLECTION = 'workspace_configs';
let indexesPromise: Promise<void> | null = null;

function nowDate() {
  return new Date();
}

function stripMeta<T extends Record<string, any>>(doc: T | null | undefined) {
  if (!doc) return {} as Partial<T>;
  const out = { ...(doc as Record<string, any>) };
  delete out._id;
  delete out.workspaceId;
  delete out.key;
  delete out.createdAt;
  delete out.updatedAt;
  return out as Partial<T>;
}

async function ensureIndexes(db: Db) {
  if (!indexesPromise) {
    indexesPromise = (async () => {
      const col = db.collection(CONFIG_COLLECTION);
      await Promise.all([
        col.createIndex({ workspaceId: 1, key: 1 }, { unique: true }),
        col.createIndex({ key: 1, api_key: 1 }, { sparse: true }),
        db.collection('conversations').createIndex({ workspaceId: 1, updatedAt: -1 }),
        db.collection('conversations').createIndex({ workspaceId: 1, conv_id: 1 }),
        db.collection('conversations').createIndex({ workspaceId: 1, visitor_id: 1, agent_id: 1, updatedAt: -1 }),
        db.collection('activity_logs').createIndex({ workspaceId: 1, ts: -1 }),
        db.collection('audit_logs').createIndex({ workspaceId: 1, createdAt: -1 }),
      ]);
    })().catch((error) => {
      indexesPromise = null;
      throw error;
    });
  }
  return indexesPromise;
}

async function migrateLegacyDoc<T extends Record<string, any>>(
  db: Db,
  workspaceId: string,
  key: WorkspaceConfigKey
): Promise<Partial<T> | null> {
  if (workspaceId !== getDefaultWorkspaceId()) return null;

  if (key === 'account') {
    const legacy = await db.collection('config').findOne({ _id: 'account' as any });
    return stripMeta<T>(legacy as any);
  }

  if (key === 'integrations') {
    const legacy = await db.collection('config').findOne({ _id: 'integrations' as any });
    return stripMeta<T>(legacy as any);
  }

  if (key === 'widget') {
    const widgetCfg = await db.collection('widget_config').findOne({ widgetId: 'default' });
    if (widgetCfg) return stripMeta<T>(widgetCfg as any);
    const legacy = await db.collection('config').findOne({ _id: 'widget' as any });
    return stripMeta<T>(legacy as any);
  }

  return null;
}

export async function getWorkspaceConfig<T extends Record<string, any>>(
  db: Db,
  workspaceId: string,
  key: WorkspaceConfigKey,
  options: GetConfigOptions<T>
): Promise<T> {
  await ensureIndexes(db);
  const col = db.collection(CONFIG_COLLECTION);
  const defaults = { ...(options.defaults as Record<string, any>) };
  const clientRef = await getWorkspaceClient(db, workspaceId);

  let doc = await col.findOne({ workspaceId, key });
  if (!doc && options.allowLegacyMigration !== false) {
    const legacy = await migrateLegacyDoc<T>(db, workspaceId, key);
    if (legacy && Object.keys(legacy).length > 0) {
      await col.updateOne(
        { workspaceId, key },
        {
          $set: {
            ...defaults,
            ...legacy,
            workspaceId,
            key,
            clientId: clientRef.clientId,
            clientName: clientRef.clientName,
            updatedAt: nowDate(),
          },
          $setOnInsert: { createdAt: nowDate() },
        },
        { upsert: true }
      );
      doc = await col.findOne({ workspaceId, key });
    }
  }

  if (!doc) {
    await col.updateOne(
      { workspaceId, key },
      {
        $set: {
          ...defaults,
          workspaceId,
          key,
          clientId: clientRef.clientId,
          clientName: clientRef.clientName,
          updatedAt: nowDate(),
        },
        $setOnInsert: { createdAt: nowDate() },
      },
      { upsert: true }
    );
    doc = await col.findOne({ workspaceId, key });
  }

  return { ...(defaults as T), ...(stripMeta<T>(doc as any) as T) };
}

export async function setWorkspaceConfig<T extends Record<string, any>>(
  db: Db,
  workspaceId: string,
  key: WorkspaceConfigKey,
  patch: Partial<T>
) {
  await ensureIndexes(db);
  const col = db.collection(CONFIG_COLLECTION);
  const clientRef = await getWorkspaceClient(db, workspaceId);

  await col.updateOne(
    { workspaceId, key },
    {
      $set: {
        ...(patch as Record<string, any>),
        workspaceId,
        key,
        clientId: clientRef.clientId,
        clientName: clientRef.clientName,
        updatedAt: nowDate(),
      },
      $setOnInsert: { createdAt: nowDate() },
    },
    { upsert: true }
  );
}

export async function findWorkspaceByApiKey(db: Db, apiKey: string) {
  const clean = String(apiKey ?? '').trim();
  if (!clean) return null;

  await ensureIndexes(db);
  const doc = await db.collection(CONFIG_COLLECTION).findOne(
    { key: 'account', api_key: clean },
    { projection: { workspaceId: 1 } }
  );

  return doc?.workspaceId ? String(doc.workspaceId) : null;
}
