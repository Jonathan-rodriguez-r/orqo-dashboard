/**
 * /api/plugin/connect
 *
 * Endpoint público que el plugin de WordPress llama para:
 *   1. Validar la Site Key
 *   2. Obtener la API Key pública del workspace (para incrustar el widget)
 *   3. Obtener la configuración del widget (color, título, posición)
 *
 * No requiere sesión — se autentica solo con la Site Key.
 *
 * GET ?site_key=orqo_sk_...
 */

import { createHash } from 'crypto';
import { getDb } from '@/lib/mongodb';
import { getWorkspaceConfig } from '@/lib/workspace-config';
import { WIDGET_DEFAULTS } from '@/app/api/config/widget/route';

export const dynamic = 'force-dynamic';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Cache-Control': 'no-store',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const siteKey = String(searchParams.get('site_key') ?? '').trim();

  if (!siteKey.startsWith('orqo_sk_')) {
    return Response.json({ error: 'Site key inválida' }, { status: 401, headers: CORS });
  }

  const db = await getDb();
  const keyDoc = await db
    .collection('plugin_site_keys')
    .findOne({ keyHash: hashKey(siteKey), active: true });

  if (!keyDoc) {
    return Response.json({ error: 'Site key no encontrada o revocada' }, { status: 401, headers: CORS });
  }

  const workspaceId = String(keyDoc.workspaceId);

  // Update lastUsedAt without blocking
  void db.collection('plugin_site_keys').updateOne(
    { _id: keyDoc._id },
    { $set: { lastUsedAt: new Date() } }
  );

  const [account, widgetCfgRaw] = await Promise.all([
    getWorkspaceConfig(db, workspaceId, 'account', { defaults: { api_key: '', business_name: '' } as any }),
    getWorkspaceConfig(db, workspaceId, 'widget', { defaults: WIDGET_DEFAULTS }),
  ]);

  const cfg = { ...WIDGET_DEFAULTS, ...(widgetCfgRaw ?? {}), widgetId: 'default' };

  return Response.json({
    workspaceId,
    apiKey: String((account as any)?.api_key ?? ''),
    widget: {
      title:        cfg.title,
      subtitle:     cfg.subtitle,
      accentColor:  cfg.accentColor,
      position:     cfg.position,
      themeMode:    cfg.themeMode,
      showBranding: cfg.showBranding,
    },
  }, { headers: CORS });
}
