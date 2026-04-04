/**
 * /api/integrations/log
 *
 * Recibe eventos de integraciones que ocurren en el cliente (browser):
 *   - Meta Embedded Signup: popup bloqueado, timeout, cancelado, error de sesión
 *   - Cualquier otro evento client-side de integraciones que necesite trazabilidad
 *
 * POST { event, detail?, channel? }
 */

import { getSession } from '@/lib/auth';
import { resolveScopedWorkspaceId } from '@/lib/access-control';
import { writeLog } from '@/app/api/admin/logs/route';

export const dynamic = 'force-dynamic';

const ALLOWED_EVENTS = new Set([
  'meta_popup_blocked',
  'meta_popup_timeout',
  'meta_signup_cancelled',
  'meta_signup_no_waba',
  'meta_signup_started',
  'meta_sdk_not_loaded',
  'meta_config_missing',
]);

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const workspaceId = resolveScopedWorkspaceId(session, searchParams.get('workspaceId'));

  const body = await req.json().catch(() => ({})) as {
    event?: string;
    detail?: string;
    channel?: string;
  };

  const event = String(body.event ?? '').trim();
  if (!event || !ALLOWED_EVENTS.has(event)) {
    return Response.json({ error: 'event inválido' }, { status: 400 });
  }

  const actor = session.email ?? session.sub;
  const channel = body.channel ?? 'whatsapp';

  const MESSAGE_MAP: Record<string, { level: 'info' | 'warn' | 'error'; msg: string }> = {
    meta_signup_started:   { level: 'info',  msg: `Embedded Signup iniciado (${channel})` },
    meta_popup_blocked:    { level: 'warn',  msg: `Popup de Meta bloqueado por el navegador (${channel})` },
    meta_popup_timeout:    { level: 'warn',  msg: `Embedded Signup timeout — popup no respondió (${channel})` },
    meta_signup_cancelled: { level: 'warn',  msg: `Embedded Signup cancelado por el usuario (${channel})` },
    meta_signup_no_waba:   { level: 'error', msg: `Embedded Signup completado sin WABA ID (${channel})` },
    meta_sdk_not_loaded:   { level: 'warn',  msg: 'SDK de Facebook no cargó al intentar Embedded Signup' },
    meta_config_missing:   { level: 'error', msg: 'NEXT_PUBLIC_META_CONFIG_ID no configurado' },
  };

  const { level, msg } = MESSAGE_MAP[event];

  void writeLog({
    level,
    source: 'meta-embedded-signup',
    msg,
    detail: `by:${actor}${body.detail ? ' — ' + body.detail : ''}`,
    workspaceId,
  });

  return Response.json({ ok: true });
}
