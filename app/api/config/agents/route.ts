import { getDb } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { getWorkspaceClient } from '@/lib/clients';
import { resolveScopedWorkspaceId } from '@/lib/access-control';

type AgentConfig = {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  instructions: string;
  enabled: boolean;
};

const DEFAULT_AGENTS: AgentConfig[] = [
  {
    id: 'inventory',
    name: 'Inventario',
    emoji: 'inventory',
    desc: 'Consulta stock y disponibilidad de productos',
    instructions:
      'Eres un asistente de inventario. Ayuda a los clientes a consultar disponibilidad de productos, fechas de reabastecimiento y stock actual.',
    enabled: true,
  },
  {
    id: 'orders',
    name: 'Pedidos',
    emoji: 'orders',
    desc: 'Estado y seguimiento de ordenes',
    instructions:
      'Eres un asistente de pedidos. Ayuda a los clientes a rastrear sus ordenes, entender el estado de entrega y resolver problemas con sus compras.',
    enabled: true,
  },
  {
    id: 'reservations',
    name: 'Reservas',
    emoji: 'calendar',
    desc: 'Gestion de citas y reservaciones',
    instructions:
      'Eres un asistente de reservas. Ayuda a los clientes a agendar, modificar o cancelar citas y reservaciones.',
    enabled: true,
  },
  {
    id: 'support',
    name: 'Soporte',
    emoji: 'support',
    desc: 'Atencion al cliente y resolucion de problemas',
    instructions:
      'Eres un agente de soporte al cliente. Escucha los problemas, ofrece soluciones y escala cuando sea necesario.',
    enabled: true,
  },
  {
    id: 'catalog',
    name: 'Catalogo',
    emoji: 'catalog',
    desc: 'Informacion de productos y precios',
    instructions:
      'Eres un asistente de catalogo. Proporciona informacion detallada sobre productos, caracteristicas, precios y comparativas.',
    enabled: false,
  },
];

function sanitizeAgent(input: any): AgentConfig {
  return {
    id: String(input?.id ?? '').trim(),
    name: String(input?.name ?? '').trim(),
    emoji: String(input?.emoji ?? ''),
    desc: String(input?.desc ?? '').trim(),
    instructions: String(input?.instructions ?? '').trim(),
    enabled: Boolean(input?.enabled),
  };
}

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const workspaceId = resolveScopedWorkspaceId(session, searchParams.get('workspaceId'));
    const db = await getDb();
    const client = await getWorkspaceClient(db, workspaceId);

    const docs = await db.collection<any>('agents').find({ workspaceId }).sort({ name: 1 }).toArray();
    if (docs.length === 0) {
      const now = new Date();
      const seedDocs = DEFAULT_AGENTS.map((agent) => ({
        ...agent,
        workspaceId,
        clientId: client.clientId,
        clientName: client.clientName,
        createdAt: now,
        updatedAt: now,
      }));
      await db.collection<any>('agents').insertMany(seedDocs);
      return Response.json(seedDocs);
    }

    await db.collection<any>('agents').updateMany(
      { workspaceId, $or: [{ clientId: { $exists: false } }, { clientName: { $exists: false } }] },
      {
        $set: {
          clientId: client.clientId,
          clientName: client.clientName,
          updatedAt: new Date(),
        },
      }
    );

    return Response.json(
      docs.map((doc) => ({
        ...doc,
        workspaceId,
        clientId: doc.clientId ?? client.clientId,
        clientName: doc.clientName ?? client.clientName,
        _id: String(doc._id),
      }))
    );
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json();
    if (!Array.isArray(payload?.agents ?? payload)) {
      return Response.json({ error: 'Expected array' }, { status: 400 });
    }
    const agentsInput = Array.isArray(payload) ? payload : payload.agents;

    const db = await getDb();
    const workspaceId = resolveScopedWorkspaceId(session, payload.workspaceId ?? payload.workspace_id ?? null);
    const client = await getWorkspaceClient(db, workspaceId);
    const now = new Date();

    for (const item of agentsInput) {
      const agent = sanitizeAgent(item);
      if (!agent.id) continue;

      await db.collection<any>('agents').updateOne(
        { workspaceId, id: agent.id },
        {
          $set: {
            ...agent,
            workspaceId,
            clientId: client.clientId,
            clientName: client.clientName,
            updatedAt: now,
          },
          $setOnInsert: { createdAt: now },
        },
        { upsert: true }
      );
    }

    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
