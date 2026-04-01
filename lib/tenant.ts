import type { Db } from 'mongodb';
import { ensureDefaultClient } from '@/lib/clients';

type HeaderReader = { get(name: string): string | null | undefined };

export type TenantResolutionSource =
  | 'mapped_domain'
  | 'subdomain'
  | 'default_host'
  | 'local'
  | 'fallback';

export type TenantResolution = {
  workspaceId: string;
  host: string;
  source: TenantResolutionSource;
  slug?: string;
};

const DEFAULT_WORKSPACE_ID = String(process.env.DEFAULT_WORKSPACE_ID ?? 'default');
const CACHE_TTL_MS = 60_000;

const DEFAULT_HOST_SUFFIXES = ['.vercel.app'];

let infraPromise: Promise<void> | null = null;
const cache = new Map<string, { expiresAt: number; value: TenantResolution | null }>();

function hostFromAppUrl() {
  const raw = String(process.env.APP_URL ?? '').trim();
  if (!raw) return '';
  try {
    return new URL(raw).host;
  } catch {
    return '';
  }
}

function normalizedBaseDomain() {
  return normalizeHost(
    process.env.TENANT_BASE_DOMAIN ??
      process.env.DASHBOARD_BASE_DOMAIN ??
      hostFromAppUrl() ??
      'dashboard.orqo.io'
  );
}

function nowMs() {
  return Date.now();
}

export function normalizeHost(rawHost: string) {
  let value = String(rawHost ?? '').trim().toLowerCase();
  if (!value) return '';

  if (value.includes(',')) value = value.split(',')[0].trim();

  if (value.startsWith('http://') || value.startsWith('https://')) {
    try {
      value = new URL(value).host.toLowerCase();
    } catch {
      return '';
    }
  }

  if (value.startsWith('[')) {
    const idx = value.indexOf(']');
    if (idx !== -1) return value.slice(1, idx);
  }

  const portIdx = value.indexOf(':');
  if (portIdx !== -1) value = value.slice(0, portIdx);

  return value;
}

function isLocalHost(host: string) {
  return host === 'localhost' || host === '127.0.0.1';
}

function isDefaultHost(host: string) {
  if (!host) return true;
  const base = normalizedBaseDomain();
  if (host === base || host === `www.${base}`) return true;
  return DEFAULT_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

function subdomainFromHost(host: string) {
  const base = normalizedBaseDomain();
  if (!base || host === base || !host.endsWith(`.${base}`)) return '';
  return host.slice(0, host.length - base.length - 1).trim();
}

async function ensureTenantInfrastructure(db: Db) {
  if (!infraPromise) {
    infraPromise = (async () => {
      await Promise.all([
        db.collection('workspaces').createIndex({ slug: 1 }, { unique: true, sparse: true }),
        db.collection('workspace_domains').createIndex({ host: 1 }, { unique: true }),
        db.collection('workspace_domains').createIndex({ workspaceId: 1 }),
        db.collection('users').createIndex({ workspaceId: 1, email: 1 }, { unique: true }),
        db.collection('users').createIndex({ workspaceId: 1, role: 1 }),
        db.collection('roles').createIndex({ workspaceId: 1, slug: 1 }, { unique: true }),
        db.collection('roles').createIndex({ workspaceId: 1, createdAt: 1 }),
      ]);

      // Legacy indexes can force global uniqueness and block multi-tenant evolution.
      await db.collection('users').dropIndex('email_1').catch(() => {});
      await db.collection('roles').dropIndex('slug_1').catch(() => {});

      await db.collection('users').updateMany(
        { workspaceId: { $exists: false } },
        { $set: { workspaceId: DEFAULT_WORKSPACE_ID } }
      );

      await db.collection('roles').updateMany(
        { workspaceId: { $exists: false } },
        { $set: { workspaceId: DEFAULT_WORKSPACE_ID } }
      );

      await db.collection('workspaces').updateOne(
        { _id: DEFAULT_WORKSPACE_ID as any },
        {
          $setOnInsert: {
            _id: DEFAULT_WORKSPACE_ID,
            slug: 'default',
            name: 'ORQO Workspace',
            status: 'active',
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );

      await ensureDefaultClient(db);

      const defaultHosts = [
        normalizedBaseDomain(),
        'dashboard.orqo.io',
        'localhost',
        '127.0.0.1',
      ].filter(Boolean);

      for (const host of defaultHosts) {
        await db.collection('workspace_domains').updateOne(
          { host },
          {
            $setOnInsert: {
              host,
              workspaceId: DEFAULT_WORKSPACE_ID,
              type: isLocalHost(host) ? 'local' : 'default',
              verified: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
          { upsert: true }
        );
      }
    })().catch((error) => {
      infraPromise = null;
      throw error;
    });
  }
  return infraPromise;
}

function readFromCache(host: string) {
  const hit = cache.get(host);
  if (!hit) return undefined;
  if (hit.expiresAt < nowMs()) {
    cache.delete(host);
    return undefined;
  }
  return hit.value;
}

function writeCache(host: string, value: TenantResolution | null) {
  cache.set(host, { value, expiresAt: nowMs() + CACHE_TTL_MS });
}

export function readHostFromHeaders(input: HeaderReader) {
  const forwarded = input.get('x-forwarded-host');
  const host = forwarded || input.get('host') || '';
  return normalizeHost(host);
}

export function readHostFromRequest(req: Request) {
  const direct = normalizeHost(req.headers.get('x-forwarded-host') || req.headers.get('host') || '');
  if (direct) return direct;
  try {
    return normalizeHost(new URL(req.url).host);
  } catch {
    return '';
  }
}

export async function resolveWorkspaceFromHost(
  db: Db,
  hostInput: string,
  options?: { allowFallback?: boolean }
): Promise<TenantResolution | null> {
  const host = normalizeHost(hostInput);

  if (!host) {
    return {
      workspaceId: DEFAULT_WORKSPACE_ID,
      host,
      source: 'fallback',
    };
  }

  const cached = readFromCache(host);
  if (cached !== undefined) return cached;

  await ensureTenantInfrastructure(db);

  const mapped = await db.collection('workspace_domains').findOne(
    { host },
    { projection: { workspaceId: 1, host: 1 } }
  );

  if (mapped?.workspaceId) {
    const value: TenantResolution = {
      workspaceId: String(mapped.workspaceId),
      host,
      source: 'mapped_domain',
    };
    writeCache(host, value);
    return value;
  }

  if (isLocalHost(host)) {
    const value: TenantResolution = {
      workspaceId: DEFAULT_WORKSPACE_ID,
      host,
      source: 'local',
    };
    writeCache(host, value);
    return value;
  }

  if (isDefaultHost(host)) {
    const value: TenantResolution = {
      workspaceId: DEFAULT_WORKSPACE_ID,
      host,
      source: 'default_host',
    };
    writeCache(host, value);
    return value;
  }

  const slug = subdomainFromHost(host);
  if (slug) {
    const workspace = await db.collection('workspaces').findOne(
      { slug, status: { $ne: 'disabled' } },
      { projection: { _id: 1 } }
    );

    if (workspace?._id) {
      const value: TenantResolution = {
        workspaceId: String(workspace._id),
        host,
        slug,
        source: 'subdomain',
      };
      writeCache(host, value);
      return value;
    }
  }

  const value = options?.allowFallback
    ? {
        workspaceId: DEFAULT_WORKSPACE_ID,
        host,
        source: 'fallback' as const,
      }
    : null;

  writeCache(host, value);
  return value;
}

export async function resolveWorkspaceFromRequest(
  db: Db,
  req: Request,
  options?: { allowFallback?: boolean }
) {
  return resolveWorkspaceFromHost(db, readHostFromRequest(req), options);
}

export function getDefaultWorkspaceId() {
  return DEFAULT_WORKSPACE_ID;
}

export function clearTenantHostCache() {
  cache.clear();
}
