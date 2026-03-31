import type { Db } from 'mongodb';

const INTERNAL_HOSTS = new Set(['dashboard.orqo.io', 'localhost', '127.0.0.1']);

function parseUrlSafe(raw: string) {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

function normalizeHost(host: string) {
  return String(host || '').trim().toLowerCase();
}

function isExternalHost(host: string) {
  const normalized = normalizeHost(host);
  if (!normalized) return false;
  if (INTERNAL_HOSTS.has(normalized)) return false;
  if (normalized.startsWith('localhost:')) return false;
  if (normalized.startsWith('127.0.0.1:')) return false;
  return true;
}

function pickSource(origin: string, referer: string) {
  const originUrl = parseUrlSafe(origin);
  if (originUrl && isExternalHost(originUrl.host)) {
    return {
      host: normalizeHost(originUrl.host),
      pageUrl: originUrl.origin,
    };
  }

  const refererUrl = parseUrlSafe(referer);
  if (refererUrl && isExternalHost(refererUrl.host)) {
    return {
      host: normalizeHost(refererUrl.host),
      pageUrl: `${refererUrl.origin}${refererUrl.pathname}`,
    };
  }

  return null;
}

export async function trackWidgetInstallSource(args: {
  db: Db;
  origin?: string | null;
  referer?: string | null;
}) {
  const source = pickSource(String(args.origin ?? '').trim(), String(args.referer ?? '').trim());
  if (!source) return null;

  const now = Date.now();
  await args.db.collection('config').updateOne(
    { _id: 'account' as any },
    {
      $set: {
        active_domain: source.host,
        widget_page_url: source.pageUrl,
        widget_last_seen_at: now,
      },
      $addToSet: { widget_seen_domains: source.host },
    },
    { upsert: true },
  );

  return source;
}
