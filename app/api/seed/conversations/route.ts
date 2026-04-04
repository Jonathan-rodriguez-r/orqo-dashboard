import { getDb } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { getWorkspaceClient } from '@/lib/clients';

/**
 * POST /api/seed/conversations
 * Inserts 60 realistic dummy conversations for demo purposes.
 * Requires: authenticated session (any role).
 */
export async function POST() {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const db = await getDb();
  const workspaceId = String(session.workspaceId ?? 'default');
  const client = await getWorkspaceClient(db, workspaceId);

  const now = Date.now();
  const hr  = 3_600_000;
  const day = 86_400_000;

  const MODELS = [
    { id: 'claude-sonnet-4-5',  label: 'Sonnet 4.5',  provider: 'anthropic' },
    { id: 'claude-haiku-4-5',   label: 'Haiku 4.5',   provider: 'anthropic' },
    { id: 'claude-opus-4',      label: 'Opus 4',       provider: 'anthropic' },
    { id: 'gpt-4o',             label: 'GPT-4o',       provider: 'openai'    },
    { id: 'gpt-4o-mini',        label: 'GPT-4o mini',  provider: 'openai'    },
    { id: 'gemini-1.5-pro',     label: 'Gemini 1.5 Pro', provider: 'google'  },
  ];

  const AGENTS = ['Asistente General', 'Soporte Técnico', 'Ventas ORQO', 'Bot Tienda', 'FAQ Bot'];

  const CHANNELS = [
    { id: 'whatsapp',    weight: 40 },
    { id: 'widget',      weight: 25 },
    { id: 'instagram',   weight: 15 },
    { id: 'facebook',    weight: 12 },
    { id: 'woocommerce', weight: 5  },
    { id: 'shopify',     weight: 3  },
  ];

  const STATUSES = [
    { id: 'resolved',  weight: 55 },
    { id: 'open',      weight: 25 },
    { id: 'escalated', weight: 12 },
    { id: 'closed',    weight: 8  },
  ];

  const USERS = [
    { name: 'Valentina Torres',    email: 'vtorres@gmail.com',       phone: '+57 301 234 5678' },
    { name: 'Carlos Mendoza',      email: 'cmendoza@empresa.co',     phone: '+57 310 987 6543' },
    { name: 'Sofía Ramírez',       email: 'sofia.r@hotmail.com',     phone: '+57 320 456 7890' },
    { name: 'Diego Hernández',     email: 'dhernandez@outlook.com',  phone: '+57 315 321 0987' },
    { name: 'Laura Castillo',      email: 'lcastillo@empresa.com',   phone: '+57 300 654 3210' },
    { name: 'Andrés Morales',      email: 'amorales@gmail.com',      phone: '+57 312 789 0123' },
    { name: 'Isabella Vargas',     email: 'ivargas@correo.co',       phone: '+57 318 012 3456' },
    { name: 'Sebastián López',     email: 'slopez@tech.io',          phone: '+57 305 345 6789' },
    { name: 'Camila Jiménez',      email: 'cjimenez@negocio.co',     phone: '+57 311 678 9012' },
    { name: 'Miguel Ángel Rojas',  email: 'marojas@gmail.com',       phone: '+57 316 901 2345' },
    { name: 'Visitante',           email: '',                         phone: ''                 },
    { name: 'Natalia Gómez',       email: 'ngomez@empresa.co',       phone: '+57 304 234 5670' },
    { name: 'Felipe Martínez',     email: 'fmartinez@corp.com',      phone: '+57 322 567 8901' },
    { name: 'Luciana Peña',        email: 'lpena@store.co',          phone: '+57 307 890 1234' },
    { name: 'Tomás Díaz',          email: 'tdiaz@gmail.com',         phone: '+57 313 123 4560' },
  ];

  const MESSAGES = [
    'Hola, necesito ayuda con mi pedido #4521',
    'Buenos días, ¿cuáles son los horarios de atención?',
    'Quiero saber el estado de mi envío',
    'Tengo un problema con el pago, me rechazó la tarjeta',
    'Me gustaría información sobre sus planes empresariales',
    '¿Pueden hacer una integración con mi sistema actual?',
    'El producto que recibí está defectuoso, ¿cómo hago la devolución?',
    'Necesito cancelar mi suscripción',
    '¿Tienen descuentos para volumen de mensajes?',
    'No puedo iniciar sesión en mi cuenta',
    '¿Cómo configuro el widget en mi sitio web?',
    'Quiero actualizar mis datos de facturación',
    'El agente no está respondiendo correctamente mis preguntas',
    'Necesito exportar el historial de conversaciones',
    '¿Cuánto cuesta el plan Pro?',
    'Me interesa hacer una demo del producto',
    '¿Integran con Shopify?',
    'Tengo preguntas sobre el RGPD y privacidad de datos',
    'Necesito agregar más usuarios a mi cuenta',
    'El tiempo de respuesta del bot es muy lento',
  ];

  function pick<T extends { weight: number }>(arr: T[]): T {
    const total = arr.reduce((s, x) => s + x.weight, 0);
    let r = Math.random() * total;
    for (const x of arr) { r -= x.weight; if (r <= 0) return x; }
    return arr[0]!;
  }

  function randInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function genConvId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return 'CNV-' + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  const docs = [];
  for (let i = 0; i < 60; i++) {
    const ageDays  = i < 5 ? 0 : i < 15 ? randInt(0, 2) : i < 35 ? randInt(1, 14) : randInt(7, 60);
    const ageMs    = ageDays * day + randInt(0, 23) * hr + randInt(0, 59) * 60_000;
    const updatedAt = now - ageMs;
    const createdAt = updatedAt - randInt(2, 45) * 60_000;
    const duration_s = Math.round((updatedAt - createdAt) / 1000);

    const msgCount  = randInt(2, 24);
    const model     = MODELS[randInt(0, MODELS.length - 1)]!;
    const channel   = pick(CHANNELS);
    const status    = pick(STATUSES);
    const agent     = AGENTS[randInt(0, AGENTS.length - 1)]!;
    const user      = USERS[randInt(0, USERS.length - 1)]!;

    // Token estimate: ~120 input + ~200 output per message exchange, with variance
    const tokensInput  = msgCount * randInt(80, 180) + randInt(200, 800);
    const tokensOutput = msgCount * randInt(120, 280) + randInt(100, 500);

    const doc: Record<string, any> = {
      workspaceId,
      clientId: client.clientId,
      clientName: client.clientName,
      conv_id:       genConvId(),
      user_name:     user.name,
      channel:       channel.id,
      status:        status.id,
      agent,
      model:         model.id,
      model_label:   model.label,
      model_provider: model.provider,
      message_count: msgCount,
      last_message:  MESSAGES[randInt(0, MESSAGES.length - 1)],
      tokens: {
        input:  tokensInput,
        output: tokensOutput,
        total:  tokensInput + tokensOutput,
      },
      duration_s,
      createdAt,
      updatedAt,
    };

    if (user.email) doc.user_email = user.email;
    if (user.phone && (channel.id === 'whatsapp' || channel.id === 'instagram')) doc.phone = user.phone;

    docs.push(doc);
  }

  await db.collection('conversations').insertMany(docs);

  // Ensure index on conv_id
  await db.collection('conversations').createIndex({ workspaceId: 1, clientId: 1, conv_id: 1 }, { unique: false });
  await db.collection('conversations').createIndex({ workspaceId: 1, clientId: 1, channel: 1 });
  await db.collection('conversations').createIndex({ workspaceId: 1, clientId: 1, status: 1 });
  await db.collection('conversations').createIndex({ workspaceId: 1, clientId: 1, model: 1 });
  await db.collection('conversations').createIndex({ workspaceId: 1, clientId: 1, updatedAt: -1 });

  return Response.json({ ok: true, inserted: docs.length });
}
