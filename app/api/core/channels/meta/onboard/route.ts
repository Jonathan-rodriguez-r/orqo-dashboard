/**
 * /api/core/channels/meta/onboard
 *
 * POST { token, wabaId, phoneNumberId? }
 *   1. Extend short-lived user token → long-lived token (60 days)
 *   2. Fetch WABA phone numbers
 *   3. Subscribe WABA to our app's webhook
 *   4. Save phoneNumberId + accessToken via CoreClient.setChannel
 *
 * The client (FB.login response_type:'token') provides the short-lived token directly.
 * No code exchange needed — avoids redirect_uri mismatch issues.
 */

import { getDb } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';
import { resolveScopedWorkspaceId } from '@/lib/access-control';
import { CoreClient } from '@/lib/core-client';
import { writeLog } from '@/app/api/admin/logs/route';

export const dynamic = 'force-dynamic';

const META_GRAPH = 'https://graph.facebook.com/v21.0';

async function getCoreWorkspaceId(db: Awaited<ReturnType<typeof import('@/lib/mongodb')['getDb']>>, workspaceId: string): Promise<string | null> {
  const cfg = await db.collection('workspace_configs').findOne({ workspaceId, key: 'core' });
  return (cfg as any)?.coreWorkspaceId ?? null;
}

async function exchangeCode(code: string): Promise<{ token: string | null; metaError?: string }> {
  const appId = process.env.NEXT_PUBLIC_META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) return { token: null };

  // Business Login / config_id flow does NOT use redirect_uri in the exchange
  const url = new URL(`${META_GRAPH}/oauth/access_token`);
  url.searchParams.set('client_id', appId);
  url.searchParams.set('client_secret', appSecret);
  url.searchParams.set('code', code);

  const res = await fetch(url.toString());
  const data = await res.json() as any;
  if (!res.ok) {
    const metaError = data?.error?.message ?? `HTTP ${res.status}`;
    console.error('[meta-onboard] exchangeCode failed:', res.status, JSON.stringify(data));
    return { token: null, metaError };
  }
  return { token: data.access_token ?? null };
}

async function extendToken(shortToken: string): Promise<string> {
  const appId = process.env.NEXT_PUBLIC_META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) return shortToken;

  const url = new URL(`${META_GRAPH}/oauth/access_token`);
  url.searchParams.set('grant_type', 'fb_exchange_token');
  url.searchParams.set('client_id', appId);
  url.searchParams.set('client_secret', appSecret);
  url.searchParams.set('fb_exchange_token', shortToken);

  const res = await fetch(url.toString());
  if (!res.ok) return shortToken;
  const data = await res.json() as any;
  return data.access_token ?? shortToken;
}

interface PhoneEntry { id: string; display_phone_number: string; verified_name: string; }

async function getWabaPhones(wabaId: string, token: string): Promise<{ phones: PhoneEntry[]; error?: string }> {
  const res = await fetch(
    `${META_GRAPH}/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name&access_token=${token}`
  );
  const data = await res.json() as any;
  if (!res.ok) {
    const msg = data?.error?.message ?? `HTTP ${res.status}`;
    return { phones: [], error: msg };
  }
  return { phones: (data.data ?? []) as PhoneEntry[] };
}

async function subscribeWaba(wabaId: string, token: string): Promise<void> {
  await fetch(`${META_GRAPH}/${wabaId}/subscribed_apps`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session.permissions, 'settings.integrations'))
    return Response.json({ error: 'Forbidden' }, { status: 403 });

  if (!process.env.META_APP_SECRET) {
    return Response.json({ error: 'META_APP_SECRET no configurado en el servidor.' }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const db = await getDb();
  const workspaceId = resolveScopedWorkspaceId(session, searchParams.get('workspaceId'));
  const coreId = await getCoreWorkspaceId(db, workspaceId);
  if (!coreId) return Response.json({ error: 'Workspace no provisionado en el core' }, { status: 409 });

  const body = await req.json().catch(() => ({})) as {
    token?: string;
    code?: string;
    accessToken?: string;
    wabaId?: string;
    phoneNumberId?: string;
  };

  const rawToken = (body.token ?? body.accessToken ?? '').trim();
  const rawCode  = (body.code ?? '').trim();

  if (!rawToken && !rawCode)
    return Response.json({ error: 'token o code requerido' }, { status: 400 });
  if (!body.wabaId && !body.phoneNumberId)
    return Response.json({ error: 'wabaId o phoneNumberId requerido' }, { status: 400 });

  const actor = session.email ?? session.sub;

  // 1. Resolve token: if code provided, exchange it first; then extend to long-lived
  let shortToken = rawToken;
  if (rawCode) {
    const { token: exchanged, metaError: exchangeError } = await exchangeCode(rawCode);
    if (!exchanged) {
      const detail = `by:${actor}${exchangeError ? ' metaError:' + exchangeError : ''}`;
      void writeLog({ level: 'error', source: 'meta-onboard', msg: 'Fallo intercambio de código OAuth', detail, workspaceId });
      const userMsg = exchangeError
        ? `Meta rechazó el código OAuth: ${exchangeError}`
        : 'No se pudo intercambiar el código con Meta. Intenta de nuevo.';
      return Response.json({ error: userMsg }, { status: 502 });
    }
    shortToken = exchanged;
  }
  const accessToken = await extendToken(shortToken);

  // 2. Get phone numbers in this WABA
  const { phones, error: phonesError } = await getWabaPhones(body.wabaId ?? '', accessToken);
  if (!phones.length) {
    const detail = `wabaId:${body.wabaId} by:${actor}${phonesError ? ' metaError:' + phonesError : ''}`;
    void writeLog({ level: 'error', source: 'meta-onboard', msg: 'WABA sin números o sin acceso', detail, workspaceId });
    const userMsg = phonesError
      ? `Meta respondió: ${phonesError}`
      : 'No se encontraron números en el WABA. Verifica que el WABA ID sea correcto y que tu cuenta tenga acceso administrador.';
    return Response.json({ error: userMsg }, { status: 404 });
  }

  // 3. Use provided phoneNumberId or fall back to first
  const phoneNumberId = body.phoneNumberId ?? phones[0].id;
  const phoneEntry = phones.find(p => p.id === phoneNumberId) ?? phones[0];

  // 4. Subscribe WABA to webhook (optional — skip if no wabaId)
  if (body.wabaId) await subscribeWaba(body.wabaId, accessToken);

  // 5. Save to core
  const result = await CoreClient.setChannel(coreId, 'whatsapp', { phoneNumberId: phoneEntry.id, accessToken });
  if (!result.ok) {
    void writeLog({ level: 'error', source: 'meta-onboard', msg: 'Fallo guardando canal WhatsApp en core', detail: `wabaId:${body.wabaId} error:${result.error} by:${actor}`, workspaceId });
    return Response.json({ error: result.error }, { status: 502 });
  }

  void writeLog({
    level: 'info',
    source: 'integration-channel',
    msg: 'WhatsApp conectado',
    detail: `wabaId:${body.wabaId} phoneNumberId:${phoneEntry.id} phone:${phoneEntry.display_phone_number} by:${actor}`,
    workspaceId,
  });

  return Response.json({
    ok: true,
    phoneNumberId: phoneEntry.id,
    displayPhone: phoneEntry.display_phone_number,
    verifiedName: phoneEntry.verified_name,
    phones,
  });
}
