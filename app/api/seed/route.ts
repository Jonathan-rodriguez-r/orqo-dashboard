import { getDb } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

const CHANNELS = ['whatsapp', 'whatsapp', 'whatsapp', 'instagram', 'widget', 'facebook', 'woocommerce', 'shopify'];
const STATUSES = ['resolved', 'resolved', 'resolved', 'escalated', 'open'];
const AGENTS   = ['Agente Pedidos', 'Agente Soporte', 'Agente Reservas', 'Agente Catálogo', 'Agente Captación'];
const NAMES    = ['María García','Carlos López','Ana Martínez','Juan Rodríguez','Sofía Herrera',
                  'Luis Jiménez','Valentina Cruz','Andrés Torres','Camila Pérez','Diego Vargas',
                  'Laura Sánchez','Sebastián Morales','Isabella Rojas','Felipe Castro','Natalia Gómez',
                  'David Ramírez','Daniela Ortiz','Miguel Ángel Silva','Paula Reyes','Tomás Díaz'];
const MESSAGES = [
  '¿Cuál es el estado de mi pedido #1042?',
  '¿Tienen disponible la talla M en negro?',
  'Quiero reservar una cita para el viernes',
  '¿Cuánto tarda el envío a Medellín?',
  '¿Aceptan pagos en cuotas?',
  'Me llegó el producto equivocado',
  '¿Cuál es la política de devoluciones?',
  'No puedo iniciar sesión en mi cuenta',
  '¿Tienen sucursal en Cali?',
  '¿El descuento del 20% aplica para nuevos clientes?',
  'Necesito factura electrónica de mi compra',
  '¿Cuándo sale el próximo despacho?',
];
const MODELS = [
  { id: 'claude-sonnet-4-5', label: 'Sonnet 4.5', provider: 'anthropic' },
  { id: 'claude-sonnet-4-5', label: 'Sonnet 4.5', provider: 'anthropic' },
  { id: 'claude-haiku-4-5',  label: 'Haiku 4.5',  provider: 'anthropic' },
  { id: 'claude-opus-4',     label: 'Opus 4',      provider: 'anthropic' },
  { id: 'gpt-4o',            label: 'GPT-4o',      provider: 'openai'    },
  { id: 'gpt-4o-mini',       label: 'GPT-4o mini', provider: 'openai'    },
];

function genConvId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return 'CNV-' + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] as T; }
function rand(min: number, max: number) { return min + Math.floor(Math.random() * (max - min + 1)); }

function makeHourDist(total: number): Record<number, number> {
  // Business hours peak distribution
  const weights: number[] = [0.2,0.1,0.1,0.1,0.1,0.2,0.5,1.2,2.0,2.5,2.8,2.6,
                               2.4,2.2,2.0,1.8,1.9,2.1,1.8,1.5,1.0,0.7,0.5,0.3];
  const totalWeight = weights.reduce((s, w) => s + w, 0);
  const result: Record<number, number> = {};
  let remaining = total;
  for (let h = 0; h < 24; h++) {
    if (h === 23) { result[h] = remaining; break; }
    const count = Math.round((weights[h]! / totalWeight) * total);
    result[h] = count;
    remaining -= count;
  }
  return result;
}

export async function POST() {
  try {
    const db = await getDb();

    // Idempotency check — only skip if BOTH analytics AND conversations are populated
    const [analyticsCount, convCount] = await Promise.all([
      db.collection('analytics_daily').countDocuments(),
      db.collection('conversations').countDocuments(),
    ]);
    if (analyticsCount >= 25 && convCount >= 50) {
      return Response.json({ ok: true, skipped: true, message: 'Seed ya ejecutado' });
    }

    const today = new Date();
    const analyticsToInsert = [];
    const conversationsToInsert = [];

    // ── 30 días de analytics ──────────────────────────────────────────────
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0]!;
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;

      const baseConv = rand(28, 52);
      const conversations = Math.floor(baseConv * (isWeekend ? 0.55 : 1));
      const resolved = Math.floor(conversations * (0.80 + Math.random() * 0.12));
      const escalated = conversations - resolved;

      const byChannel = {
        whatsapp:    Math.floor(conversations * 0.58),
        instagram:   Math.floor(conversations * 0.16),
        widget:      Math.floor(conversations * 0.11),
        facebook:    Math.floor(conversations * 0.09),
        woocommerce: Math.floor(conversations * 0.04),
        shopify:     conversations - Math.floor(conversations * 0.98),
      };

      analyticsToInsert.push({
        workspaceId: 'default',
        date: dateStr,
        conversations,
        resolved,
        escalated,
        byChannel,
        byHour: makeHourDist(conversations),
        avgResponseTime: Math.round((1.1 + Math.random() * 1.2) * 10) / 10,
        createdAt: d,
      });
    }

    // ── 60 conversaciones mock ────────────────────────────────────────────
    for (let i = 0; i < 60; i++) {
      const daysAgo = rand(0, 29);
      const d = new Date(today);
      d.setDate(d.getDate() - daysAgo);
      d.setHours(rand(8, 21), rand(0, 59), rand(0, 59));

      const name    = pick(NAMES);
      const email   = `${name.toLowerCase().replace(/\s+/g, '.')}@email.com`;
      const channel = pick(CHANNELS);
      const status  = pick(STATUSES);
      const model   = pick(MODELS);
      const msgCount = rand(2, 14);
      const tokInput  = msgCount * rand(80, 180) + rand(200, 800);
      const tokOutput = msgCount * rand(120, 280) + rand(100, 500);

      conversationsToInsert.push({
        workspaceId:    'default',
        conv_id:        genConvId(),
        user_name:      name,
        user_email:     email,
        last_message:   pick(MESSAGES),
        message_count:  msgCount,
        status,
        channel,
        agent:          pick(AGENTS),
        model:          model.id,
        model_label:    model.label,
        model_provider: model.provider,
        tokens: { input: tokInput, output: tokOutput, total: tokInput + tokOutput },
        duration_s: msgCount * rand(30, 90) + rand(60, 240),
        phone:   channel === 'whatsapp' ? `+57 ${rand(300, 321)} ${rand(100, 999)} ${rand(1000, 9999)}` : undefined,
        updatedAt: d.getTime(),
        createdAt: d,
      });
    }

    // ── MongoDB indexes (DBA best practices) ──────────────────────────────
    await db.collection('analytics_daily').createIndex(
      { date: 1 }, { unique: true, background: true }
    );
    await db.collection('analytics_daily').createIndex(
      { workspaceId: 1, date: -1 }, { background: true }
    );
    await db.collection('conversations').createIndex(
      { workspaceId: 1, updatedAt: -1 }, { background: true }
    );
    await db.collection('conversations').createIndex(
      { workspaceId: 1, channel: 1 }, { background: true }
    );
    await db.collection('conversations').createIndex(
      { workspaceId: 1, status: 1 }, { background: true }
    );
    await db.collection('conversations').createIndex(
      { user_name: 'text', last_message: 'text', user_email: 'text' },
      { background: true }
    );

    // ── Insert ────────────────────────────────────────────────────────────
    await db.collection('analytics_daily').insertMany(analyticsToInsert);
    await db.collection('conversations').insertMany(conversationsToInsert);

    // ── Config doc ────────────────────────────────────────────────────────
    await db.collection('config').updateOne(
      { _id: 'account' as any },
      { $setOnInsert: { plan: 'Starter', interactions_limit: 1000, business_name: 'Mi Negocio' } },
      { upsert: true }
    );

    return Response.json({
      ok: true,
      inserted: {
        analytics: analyticsToInsert.length,
        conversations: conversationsToInsert.length,
      },
      indexes: 'created',
    });
  } catch (e: any) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
