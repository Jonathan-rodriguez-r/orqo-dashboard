import { getDb } from '@/lib/mongodb';
import { randomUUID } from 'crypto';
import { getDefaultWorkspaceId } from '@/lib/tenant';
import { DEFAULT_CLIENT_ID, DEFAULT_CLIENT_NAME } from '@/lib/clients';

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
    const workspaceId = getDefaultWorkspaceId();

    // Idempotency check — only skip if BOTH analytics AND conversations are populated
    const [analyticsCount, convCount, logsCount] = await Promise.all([
      db.collection('analytics_daily').countDocuments(),
      db.collection('conversations').countDocuments(),
      db.collection('audit_logs').countDocuments(),
    ]);
    if (analyticsCount >= 25 && convCount >= 50 && logsCount >= 40) {
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
        workspaceId,
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
        workspaceId,
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

    // ── 50 audit log entries ──────────────────────────────────────────────
    const RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
    const DEMO_EMAILS  = ['owner@empresa.com', 'admin@empresa.com', 'analista@empresa.com'];
    const DEMO_IPS     = ['190.26.44.12', '181.51.23.8', '10.0.0.5'];

    const auditSeed = [
      // Auth events
      { level:'INFO',  severity:'LOW',    category:'auth',     action:'LOGIN_SUCCESS',           message:'owner@empresa.com inició sesión via Google OAuth',   actor:{ email:'owner@empresa.com', role:'owner', ip:DEMO_IPS[0] } },
      { level:'INFO',  severity:'LOW',    category:'auth',     action:'LOGIN_SUCCESS',           message:'admin@empresa.com inició sesión via magic link',      actor:{ email:'admin@empresa.com', role:'admin', ip:DEMO_IPS[1] } },
      { level:'INFO',  severity:'LOW',    category:'auth',     action:'MAGIC_LINK_SENT',         message:'Magic link enviado a analista@empresa.com',           actor:{ email:'analista@empresa.com', ip:DEMO_IPS[2] } },
      { level:'WARN',  severity:'MEDIUM', category:'auth',     action:'LOGIN_BLOCKED',           message:'Intento con correo no autorizado: intruso@hacker.com', actor:{ email:'intruso@hacker.com', ip:'45.33.32.156' } },
      { level:'INFO',  severity:'LOW',    category:'auth',     action:'LOGIN_SUCCESS',           message:'analista@empresa.com inició sesión via magic link',   actor:{ email:'analista@empresa.com', role:'analyst', ip:DEMO_IPS[2] } },
      { level:'INFO',  severity:'LOW',    category:'auth',     action:'GOOGLE_AUTH_SUCCESS',     message:'owner@empresa.com inició sesión via Google OAuth',   actor:{ email:'owner@empresa.com', role:'owner', ip:DEMO_IPS[0] } },
      // Security events
      { level:'WARN',  severity:'HIGH',   category:'security', action:'GOOGLE_AUTH_BLOCKED',     message:'Google OAuth rechazado — correo no autorizado: spam@example.com', actor:{ email:'spam@example.com', ip:'203.0.113.42' } },
      { level:'WARN',  severity:'HIGH',   category:'security', action:'UNAUTHORIZED_TOKEN_USE',  message:'Token de acceso inválido o ya utilizado',            actor:{ ip:'185.220.101.5' } },
      { level:'WARN',  severity:'MEDIUM', category:'security', action:'EXPIRED_TOKEN_USE',       message:'Intento de uso de token expirado (viewer@empresa.com)', actor:{ email:'viewer@empresa.com', ip:DEMO_IPS[1] } },
      { level:'WARN',  severity:'HIGH',   category:'security', action:'CSRF_VIOLATION',          message:'OAuth state mismatch — posible ataque CSRF en flujo Google', actor:{ ip:'104.21.33.78' } },
      // User events
      { level:'INFO',  severity:'LOW',    category:'users',    action:'USER_INVITED',            message:'owner@empresa.com invitó a admin@empresa.com con rol admin',
        actor:{ email:'owner@empresa.com', role:'owner', ip:DEMO_IPS[0] },
        target:{ type:'user', email:'admin@empresa.com', label:'Admin Principal' },
        metadata:{ after:{ email:'admin@empresa.com', name:'Admin Principal', role:'admin' }, extra:{ emailSent:true } } },
      { level:'INFO',  severity:'LOW',    category:'users',    action:'USER_INVITED',            message:'owner@empresa.com invitó a analista@empresa.com con rol analyst',
        actor:{ email:'owner@empresa.com', role:'owner', ip:DEMO_IPS[0] },
        target:{ type:'user', email:'analista@empresa.com', label:'María Analista' },
        metadata:{ after:{ email:'analista@empresa.com', name:'María Analista', role:'analyst' }, extra:{ emailSent:true } } },
      { level:'INFO',  severity:'LOW',    category:'users',    action:'USER_UPDATED',            message:'admin@empresa.com actualizó al usuario viewer@empresa.com',
        actor:{ email:'admin@empresa.com', role:'admin', ip:DEMO_IPS[1] },
        target:{ type:'user', email:'viewer@empresa.com' },
        metadata:{ before:{ name:'Juan Viewer', role:'viewer' }, after:{ name:'Juan Observer', role:'viewer' }, diff:{ name:{ from:'Juan Viewer', to:'Juan Observer' } } } },
      { level:'WARN',  severity:'MEDIUM', category:'users',    action:'USER_DELETED',            message:'owner@empresa.com eliminó al usuario temporal@empresa.com',
        actor:{ email:'owner@empresa.com', role:'owner', ip:DEMO_IPS[0] },
        target:{ type:'user', email:'temporal@empresa.com', label:'Usuario Temporal' },
        metadata:{ before:{ email:'temporal@empresa.com', name:'Usuario Temporal', role:'viewer' } } },
      // Role events
      { level:'INFO',  severity:'LOW',    category:'roles',    action:'ROLE_CREATED',            message:'admin@empresa.com creó el rol "Soporte Senior" (soporte_senior)',
        actor:{ email:'admin@empresa.com', role:'admin', ip:DEMO_IPS[1] },
        target:{ type:'role', id:'soporte_senior', label:'Soporte Senior' },
        metadata:{ after:{ slug:'soporte_senior', label:'Soporte Senior', permissions:['conversations.view','dashboard.view'] } } },
      { level:'WARN',  severity:'MEDIUM', category:'roles',    action:'ROLE_PERMISSIONS_UPDATED', message:'owner@empresa.com actualizó permisos del rol "admin"',
        actor:{ email:'owner@empresa.com', role:'owner', ip:DEMO_IPS[0] },
        target:{ type:'role', id:'admin', label:'Administrador' },
        metadata:{ before:{ permissions:['dashboard.view','conversations.view'] }, after:{ permissions:['dashboard.view','conversations.view','admin.logs'] }, extra:{ added:['admin.logs'], removed:[] } } },
      { level:'WARN',  severity:'MEDIUM', category:'roles',    action:'ROLE_DELETED',            message:'owner@empresa.com eliminó el rol "soporte_senior"',
        actor:{ email:'owner@empresa.com', role:'owner', ip:DEMO_IPS[0] },
        target:{ type:'role', id:'soporte_senior', label:'Soporte Senior' } },
      // System events
      { level:'INFO',  severity:'LOW',    category:'system',   action:'SEED_EXECUTED',           message:'Datos de demostración generados exitosamente',         actor:{ email:'owner@empresa.com', role:'owner', ip:DEMO_IPS[0] } },
      { level:'ERROR', severity:'HIGH',   category:'system',   action:'DB_CONNECTION_ERROR',     message:'MongoDB connection timeout — reconectando automáticamente', metadata:{ error:{ message:'MongoServerSelectionError: connect ETIMEDOUT', code:'ETIMEDOUT' } } },
      { level:'INFO',  severity:'LOW',    category:'system',   action:'DB_RECONNECTED',          message:'Conexión con MongoDB restaurada exitosamente' },
      // Agent events
      { level:'INFO',  severity:'LOW',    category:'agent',    action:'AGENT_ACTIVATED',         message:'Agente "Soporte WhatsApp" activado por admin@empresa.com',
        actor:{ email:'admin@empresa.com', role:'admin', ip:DEMO_IPS[1] },
        target:{ type:'agent', label:'Soporte WhatsApp' } },
      { level:'WARN',  severity:'MEDIUM', category:'agent',    action:'AGENT_QUOTA_WARNING',     message:'Agente "Catálogo" alcanzó 85% del límite de tokens mensual',
        target:{ type:'agent', label:'Catálogo' } },
      // Conversation events
      { level:'INFO',  severity:'LOW',    category:'conversation', action:'CONVERSATION_ESCALATED', message:'Conversación CNV-A3F7KP escalada a humano (límite de intentos)',
        target:{ type:'conversation', id:'CNV-A3F7KP' } },
      // Billing
      { level:'INFO',  severity:'LOW',    category:'billing',  action:'PLAN_RENEWAL',            message:'Plan Starter renovado automáticamente' },
      { level:'WARN',  severity:'HIGH',   category:'billing',  action:'PAYMENT_FAILED',          message:'Pago fallido — reintentar en 24h',
        metadata:{ error:{ message:'card_declined', code:'insufficient_funds' } } },
    ] as any[];

    // Spread events over last 30 days with varied timestamps
    const auditToInsert = auditSeed.map((entry, idx) => {
      const daysAgo = Math.floor(idx / 2);
      const d = new Date(today);
      d.setDate(d.getDate() - Math.min(daysAgo, 29));
      d.setHours(rand(7, 22), rand(0, 59), rand(0, 59));
      return {
        correlationId: randomUUID(),
        ...entry,
        http: entry.http ?? undefined,
        createdAt: d,
        expiresAt: new Date(d.getTime() + RETENTION_MS),
      };
    });

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
    if (analyticsCount < 25)  await db.collection('analytics_daily').insertMany(analyticsToInsert);
    if (convCount < 50)       await db.collection('conversations').insertMany(conversationsToInsert);
    if (logsCount < 40)       await db.collection('audit_logs').insertMany(auditToInsert);

    // TTL index on audit_logs
    await db.collection('audit_logs').createIndex(
      { expiresAt: 1 }, { expireAfterSeconds: 0, background: true }
    );
    await db.collection('audit_logs').createIndex(
      { createdAt: -1 }, { background: true }
    );

    // ── Config doc ────────────────────────────────────────────────────────
    await db.collection('workspace_configs').updateOne(
      { workspaceId, key: 'account' },
      {
        $setOnInsert: {
          workspaceId,
          key: 'account',
          plan: 'Starter',
          interactions_limit: 1000,
          business_name: 'Mi Negocio',
          clientId: DEFAULT_CLIENT_ID,
          clientName: DEFAULT_CLIENT_NAME,
          createdAt: new Date(),
        },
        $set: { updatedAt: new Date() },
      },
      { upsert: true }
    );

    return Response.json({
      ok: true,
      inserted: {
        analytics: analyticsCount < 25 ? analyticsToInsert.length : 0,
        conversations: convCount < 50 ? conversationsToInsert.length : 0,
        auditLogs: logsCount < 40 ? auditToInsert.length : 0,
      },
      indexes: 'created',
    });
  } catch (e: any) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
