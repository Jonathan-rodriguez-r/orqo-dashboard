import { getDb } from '@/lib/mongodb';

const DEFAULT_AGENTS = [
  { id: 'inventory', name: 'Inventario', emoji: '📦', desc: 'Consulta stock y disponibilidad de productos', instructions: 'Eres un asistente de inventario. Ayuda a los clientes a consultar disponibilidad de productos, fechas de reabastecimiento y stock actual.', enabled: true },
  { id: 'orders', name: 'Pedidos', emoji: '🛒', desc: 'Estado y seguimiento de órdenes', instructions: 'Eres un asistente de pedidos. Ayuda a los clientes a rastrear sus órdenes, entender el estado de entrega y resolver problemas con sus compras.', enabled: true },
  { id: 'reservations', name: 'Reservas', emoji: '📅', desc: 'Gestión de citas y reservaciones', instructions: 'Eres un asistente de reservas. Ayuda a los clientes a agendar, modificar o cancelar citas y reservaciones.', enabled: true },
  { id: 'support', name: 'Soporte', emoji: '🎧', desc: 'Atención al cliente y resolución de problemas', instructions: 'Eres un agente de soporte al cliente. Escucha los problemas, ofrece soluciones y escala cuando sea necesario.', enabled: true },
  { id: 'catalog', name: 'Catálogo', emoji: '🏷️', desc: 'Información de productos y precios', instructions: 'Eres un asistente de catálogo. Proporciona información detallada sobre productos, características, precios y comparativas.', enabled: false },
];

export async function GET() {
  try {
    const db = await getDb();
    const docs = await db.collection('agents').find({}).toArray();
    if (docs.length === 0) {
      await db.collection('agents').insertMany(DEFAULT_AGENTS);
      return Response.json(DEFAULT_AGENTS);
    }
    return Response.json(docs.map(({ _id, ...rest }) => rest));
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const agents = await req.json();
    if (!Array.isArray(agents)) return Response.json({ error: 'Expected array' }, { status: 400 });
    const db = await getDb();
    for (const agent of agents) {
      await db.collection('agents').updateOne(
        { id: agent.id },
        { $set: agent },
        { upsert: true }
      );
    }
    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
