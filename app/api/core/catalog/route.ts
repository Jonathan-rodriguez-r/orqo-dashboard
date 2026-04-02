import { getSession } from '@/lib/auth';
import { CoreClient } from '@/lib/core-client';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await CoreClient.getMcpCatalog();
  if (!result.ok) {
    // Fallback: catálogo estático si el core no está disponible
    return Response.json([
      { type: 'woocommerce', name: 'WooCommerce', description: 'Gestión de pedidos y productos WooCommerce', requiredEnv: ['WC_URL', 'WC_CONSUMER_KEY', 'WC_CONSUMER_SECRET'], toolCount: 2 },
      { type: 'shopify', name: 'Shopify', description: 'Pedidos y productos de tiendas Shopify', requiredEnv: ['SHOPIFY_STORE_URL', 'SHOPIFY_ACCESS_TOKEN'], toolCount: 2 },
      { type: 'odoo', name: 'Odoo ERP', description: 'Órdenes de venta e inventario en Odoo', requiredEnv: ['ODOO_URL', 'ODOO_DB', 'ODOO_USERNAME', 'ODOO_API_KEY'], toolCount: 2 },
      { type: 'rest-generic', name: 'REST API', description: 'Conecta cualquier API REST', requiredEnv: ['REST_BASE_URL', 'REST_API_KEY'], toolCount: 1 },
    ]);
  }
  return Response.json(result.data);
}
