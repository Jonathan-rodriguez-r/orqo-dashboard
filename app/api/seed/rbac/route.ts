import { getDb } from '@/lib/mongodb';
import { SYSTEM_MODULES, DEFAULT_ROLES } from '@/lib/rbac';
import { getDefaultWorkspaceId } from '@/lib/tenant';
import { getWorkspaceClient, resolveClientScopeForRole } from '@/lib/clients';

/**
 * POST /api/seed/rbac
 * Idempotent — seeds system_modules and roles collections.
 * Requires admin.seed permission (enforced by proxy.ts).
 */
export async function POST() {
  try {
    const db = await getDb();
    const workspaceId = getDefaultWorkspaceId();
    const workspaceClient = await getWorkspaceClient(db, workspaceId);

    // ── system_modules ──────────────────────────────────────────────────────
    const moduleOps = SYSTEM_MODULES.map(m => ({
      updateOne: {
        filter: { slug: m.slug },
        update: { $setOnInsert: { ...m, createdAt: new Date() } },
        upsert: true,
      },
    }));
    const modulesResult = await db.collection('system_modules').bulkWrite(moduleOps);

    // ── roles ───────────────────────────────────────────────────────────────
    const roleOps = DEFAULT_ROLES.map(r => ({
      updateOne: {
        filter: { slug: r.slug, workspaceId },
        update: {
          $setOnInsert: {
            slug:        r.slug,
            label:       r.label,
            description: r.description,
            workspaceId,
            clientId: resolveClientScopeForRole({
              role: r.slug,
              workspaceClientId: workspaceClient.clientId,
              workspaceClientName: workspaceClient.clientName,
              promoteToGlobal: true,
            }).clientId,
            clientName: resolveClientScopeForRole({
              role: r.slug,
              workspaceClientId: workspaceClient.clientId,
              workspaceClientName: workspaceClient.clientName,
              promoteToGlobal: true,
            }).clientName,
            createdAt:   new Date(),
          },
          $set: {
            permissions: r.permissions,
            clientId: resolveClientScopeForRole({
              role: r.slug,
              workspaceClientId: workspaceClient.clientId,
              workspaceClientName: workspaceClient.clientName,
              promoteToGlobal: true,
            }).clientId,
            clientName: resolveClientScopeForRole({
              role: r.slug,
              workspaceClientId: workspaceClient.clientId,
              workspaceClientName: workspaceClient.clientName,
              promoteToGlobal: true,
            }).clientName,
          }, // always sync permissions
        },
        upsert: true,
      },
    }));
    const rolesResult = await db.collection('roles').bulkWrite(roleOps);

    // ── indexes ─────────────────────────────────────────────────────────────
    await Promise.all([
      db.collection('system_modules').createIndex({ slug: 1 }, { unique: true }),
      db.collection('roles').createIndex({ workspaceId: 1, slug: 1 }, { unique: true }),
      db.collection('users').dropIndex('email_1').catch(() => {}),
      db.collection('users').createIndex({ workspaceId: 1, email: 1 }, { unique: true }),
      db.collection('users').createIndex({ workspaceId: 1 }),
      db.collection('auth_tokens').createIndex({ token: 1 }, { unique: true }),
      db.collection('auth_tokens').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    ]);

    return Response.json({
      ok: true,
      modules: {
        upserted: modulesResult.upsertedCount,
        matched:  modulesResult.matchedCount,
      },
      roles: {
        upserted: rolesResult.upsertedCount,
        matched:  rolesResult.matchedCount,
      },
    });
  } catch (e: any) {
    console.error('[seed/rbac]', e);
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
