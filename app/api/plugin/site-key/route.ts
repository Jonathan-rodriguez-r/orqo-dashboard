/**
 * /api/plugin/site-key
 *
 * Administra Site Keys para el plugin de WordPress de ORQO.
 * Las Site Keys permiten que el plugin WP se autentique con el dashboard
 * sin exponer la API key de workspace completa.
 *
 * GET    — lista keys activas del workspace (prefijo enmascarado, sin plaintext)
 * POST   — genera una nueva Site Key (devuelve plaintext una sola vez)
 * DELETE ?id=   — revoca una Site Key
 */

import { createHash, randomBytes } from 'crypto';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';
import { resolveScopedWorkspaceId } from '@/lib/access-control';

export const dynamic = 'force-dynamic';

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session.permissions, 'settings.integrations'))
    return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const workspaceId = resolveScopedWorkspaceId(session, searchParams.get('workspaceId'));
  const db = await getDb();

  const keys = await db
    .collection('plugin_site_keys')
    .find({ workspaceId, active: true })
    .sort({ createdAt: -1 })
    .project({ _id: 1, keyPrefix: 1, label: 1, createdAt: 1, lastUsedAt: 1 })
    .toArray();

  return Response.json(keys.map(k => ({ ...k, id: String(k._id) })));
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session.permissions, 'settings.integrations'))
    return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const workspaceId = resolveScopedWorkspaceId(session, searchParams.get('workspaceId'));
  const body = await req.json().catch(() => ({})) as { label?: string };

  const raw = randomBytes(24).toString('hex');
  const plaintext = `orqo_sk_${raw}`;
  const keyHash = hashKey(plaintext);
  const keyPrefix = `orqo_sk_${raw.slice(0, 8)}…`;

  const db = await getDb();
  const result = await db.collection('plugin_site_keys').insertOne({
    workspaceId,
    keyHash,
    keyPrefix,
    label: String(body.label ?? 'WordPress').slice(0, 80),
    active: true,
    createdAt: new Date(),
    lastUsedAt: null,
  });

  return Response.json({ id: String(result.insertedId), keyPrefix, plaintext });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session.permissions, 'settings.integrations'))
    return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const workspaceId = resolveScopedWorkspaceId(session, searchParams.get('workspaceId'));
  const id = searchParams.get('id');
  if (!id) return Response.json({ error: 'id requerido' }, { status: 400 });
  if (!ObjectId.isValid(id)) return Response.json({ error: 'id inválido' }, { status: 400 });

  const db = await getDb();
  await db.collection('plugin_site_keys').updateOne(
    { _id: new ObjectId(id), workspaceId },
    { $set: { active: false } }
  );

  return Response.json({ ok: true });
}
