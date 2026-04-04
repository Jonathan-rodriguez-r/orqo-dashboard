/**
 * /api/core/channels/meta/onboard
 *
 * Backend handler for WhatsApp Business Embedded Signup.
 * Called by the dashboard after the Meta popup returns an auth code.
 *
 * POST { code, wabaId, phoneNumberId? }
 *   1. Exchange authorization code → short-lived user token
 *   2. Extend → long-lived token (60 days)
 *   3. Fetch WABA phone numbers (if phoneNumberId not provided, use the first)
 *   4. Subscribe WABA to our app's webhook
 *   5. Save phoneNumberId + accessToken via CoreClient.setChannel
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

async function exchangeCode(code: string): Promise<string | null> {
  const appId = process.env.NEXT_PUBLIC_META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) return null;

  const url = new URL(`${META_GRAPH}/oauth/access_token`);
  url.searchParams.set('client_id', appId);
  url.searchParams.set('client_secret', appSecret);
  url.searchParams.set('code', code);

  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const data = await res.json() as any;
  return data.access_token ?? null;
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

async function getWabaPhones(wabaId: string, token: string): Promise<PhoneEntry[]> {
  const res = await fetch(
    `${META_GRAPH}/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name&access_token=${token}`
  );
  if (!res.ok) return [];
  const data = await res.json() as any;
  return (data.data ?? []) as PhoneEntry[];
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

  if (!process.env.NEXT_PUBLIC_META_APP_ID || !process.env.META_APP_SECRET) {
    return Response.json({ error: 'Meta App no configurado en el servidor. Agrega NEXT_PUBLIC_META_APP_ID y META_APP_SECRET.' }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const db = await getDb();
  const workspaceId = resolveScopedWorkspaceId(session, searchParams.get('workspaceId'));
  const coreId = await getCoreWorkspaceId(db, workspaceId);
  if (!coreId) return Response.json({ error: 'Workspace no provisionado en el core' }, { status: 409 });

  const body = await req.json().catch(() => ({})) as {
    code?: string;
    wabaId?: string;
    phoneNumberId?: string;
  };

  if (!body.code) return Response.json({ error: 'code requerido' }, { status: 400 });
  if (!body.wabaId) return Response.json({ error: 'wabaId requerido' }, { status: 400 });

  const actor = session.email ?? session.sub;

  // 1. Exchange code → short-lived token
  const shortToken = await exchangeCode(body.code);
  if (!shortToken) {
    void writeLog({ level: 'error', source: 'meta-onboard', msg: 'Fallo intercambio de código OAuth con Meta', detail: `wabaId:${body.wabaId} by:${actor} — verifica META_APP_SECRET`, workspaceId });
    return Response.json({ error: 'No se pudo obtener token de Meta. Verifica META_APP_SECRET.' }, { status: 502 });
  }

  // 2. Extend to long-lived token (60 days)
  const accessToken = await extendToken(shortToken);

  // 3. Get phone numbers in this WABA
  const phones = await getWabaPhones(body.wabaId, accessToken);
  if (!phones.length) {
    void writeLog({ level: 'error', source: 'meta-onboard', msg: 'WABA sin números verificados', detail: `wabaId:${body.wabaId} by:${actor}`, workspaceId });
    return Response.json({ error: 'No se encontraron números en el WABA. Verifica que el WABA tenga al menos un número verificado.' }, { status: 404 });
  }

  // 4. Use the phone number ID from session info, or fall back to first available
  const phoneNumberId = body.phoneNumberId ?? phones[0].id;
  const phoneEntry = phones.find(p => p.id === phoneNumberId) ?? phones[0];

  // 5. Subscribe WABA to webhook
  await subscribeWaba(body.wabaId, accessToken);

  // 6. Save to core
  const result = await CoreClient.setChannel(coreId, 'whatsapp', { phoneNumberId: phoneEntry.id, accessToken });
  if (!result.ok) {
    void writeLog({ level: 'error', source: 'meta-onboard', msg: 'Fallo guardando canal WhatsApp en core', detail: `wabaId:${body.wabaId} error:${result.error} by:${actor}`, workspaceId });
    return Response.json({ error: result.error }, { status: 502 });
  }

  void writeLog({
    level: 'info',
    source: 'integration-channel',
    msg: 'WhatsApp conectado vía Embedded Signup',
    detail: `wabaId:${body.wabaId} phoneNumberId:${phoneEntry.id} phone:${phoneEntry.display_phone_number} by:${session.email ?? session.sub}`,
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
