import { getDb } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { getWorkspaceConfig, setWorkspaceConfig } from '@/lib/workspace-config';
import { resolveScopedWorkspaceId } from '@/lib/access-control';

export const WIDGET_DEFAULTS = {
  widgetId: 'default',
  active: true,
  themeMode: 'auto',
  title: 'Hola soy ORQO',
  subtitle: 'Tu Asistente de Orquestacion',
  placeholder: '¿En que te puedo ayudar?',
  accentColor: '#2CB978',
  position: 'bottom-right',
  darkBg: '#0B100D',
  darkSurface: '#111812',
  lightBg: '#F4F7F4',
  lightSurface: '#FFFFFF',
  windowOpacity: 1.0,
  buttonOpacity: 1.0,
  iconMode: 'orqo',
  faviconUrl: '',
  agentPhoto: '',
  interactionLimit: 20,
  closeOnInactivity: true,
  inactivityCloseMinutes: 15,
  askForHelpfulnessOnClose: true,
  showBranding: true,
  soundEnabled: true,
  homeArticles: ['orqo-que-es', 'wp-connect', 'plugin-install', 'modelos-fallback'],
  articles: [
    {
      id: 'wp-connect',
      title: '¿Como conectar ORQO con WordPress?',
      category: 'Integraciones',
      date: 'Actualizado hace 3 dias',
      body: `<p>ORQO se conecta a tu WordPress a traves de nuestra <strong>API REST</strong> y el protocolo <strong>MCP (Model Context Protocol)</strong>. La conexion permite a ORQO leer y ejecutar acciones directamente sobre tu sitio.</p>
<h3>Requisitos previos</h3>
<ul>
  <li>WordPress 6.0 o superior</li>
  <li>Plugin ORQO instalado y activado</li>
  <li>API REST de WordPress habilitada (activa por defecto)</li>
  <li>Cuenta activa en dashboard.orqo.io</li>
</ul>
<h3>Pasos de conexion</h3>
<ol>
  <li>Entra a tu dashboard en <strong>dashboard.orqo.io</strong></li>
  <li>Ve a <strong>Integraciones → WordPress</strong></li>
  <li>Ingresa la URL de tu sitio (ej: https://mitienda.com)</li>
  <li>Copia el token generado y pegalo en el plugin de WordPress</li>
  <li>Haz clic en <strong>Verificar conexion</strong></li>
</ol>
<div class="art-note">La conexion se establece en segundos. Una vez verificada, ORQO puede leer productos, pedidos, formularios y ejecutar acciones en tu sitio en tiempo real.</div>
<h3>¿Que puede hacer ORQO en WordPress?</h3>
<p>Con la conexion activa, ORQO puede: consultar inventario de WooCommerce, crear pedidos, registrar usuarios, leer y enviar respuestas de formularios, y ejecutar cualquier endpoint de tu API REST personalizada.</p>`,
    },
    {
      id: 'whatsapp-setup',
      title: 'Configurar tu numero de WhatsApp Business',
      category: 'Integraciones',
      date: 'Actualizado hace 5 dias',
      body: `<p>ORQO usa la <strong>API oficial de WhatsApp Business</strong> para gestionar conversaciones. Puedes conectar el numero de tu empresa en pocos minutos.</p>
<h3>Requisitos</h3>
<ul>
  <li>Numero de telefono dedicado para tu negocio</li>
  <li>Cuenta de Meta Business verificada</li>
  <li>Acceso al dashboard de ORQO</li>
</ul>
<h3>Proceso de configuracion</h3>
<ol>
  <li>En el dashboard, ve a <strong>Integraciones → WhatsApp</strong></li>
  <li>Haz clic en <strong>Conectar numero</strong></li>
  <li>Inicia sesion con tu cuenta de Meta Business</li>
  <li>Selecciona el numero o registra uno nuevo</li>
  <li>Verifica el numero con el codigo SMS o llamada</li>
  <li>Configura el nombre del agente y el mensaje de bienvenida</li>
</ol>
<div class="art-note"><strong>Nota:</strong> Si ya usas WhatsApp Business App en ese numero, deberas desvincularlo antes de conectarlo a la API.</div>
<h3>Prueba de la integracion</h3>
<p>Una vez conectado, envia un mensaje de prueba desde otro numero. ORQO respondera automaticamente. Puedes ver la conversacion en tiempo real desde <strong>Conversaciones</strong>.</p>`,
    },
    {
      id: 'agents',
      title: 'Flujos y agentes disponibles',
      category: 'Agentes',
      date: 'Actualizado hace 1 semana',
      body: `<p>ORQO incluye agentes pre-configurados para los flujos mas comunes. Cada agente puede personalizarse desde el dashboard.</p>
<h3>Agentes incluidos</h3>
<ul>
  <li><strong>Agente de Pedidos:</strong> Consulta estado de pedidos WooCommerce, rastrea envios y gestiona devoluciones.</li>
  <li><strong>Agente de Soporte:</strong> Responde preguntas frecuentes, escala a humano cuando es necesario.</li>
  <li><strong>Agente de Reservas:</strong> Integrado con Bookly y Calendly para agendar citas.</li>
  <li><strong>Agente de Catalogo:</strong> Muestra productos, precios, disponibilidad.</li>
  <li><strong>Agente de Captacion:</strong> Registra leads desde WhatsApp hacia tu CRM.</li>
</ul>
<h3>Crear un agente personalizado</h3>
<p>En el dashboard ve a <strong>Agentes → Nuevo agente</strong>. Define el objetivo, instrucciones y skills. Puedes usar lenguaje natural para configurarlo.</p>
<div class="art-note">Los agentes son independientes entre si. Puedes tener multiples agentes activos para diferentes canales.</div>`,
    },
    {
      id: 'tokens',
      title: 'Limites de tokens e interacciones',
      category: 'Planes',
      date: 'Actualizado hace 2 semanas',
      body: `<p>ORQO mide el uso en <strong>interacciones</strong>. Una interaccion equivale a un mensaje de usuario mas la respuesta del agente.</p>
<h3>Limites por plan</h3>
<ul>
  <li><strong>Demo:</strong> 20 interacciones (version de prueba del widget)</li>
  <li><strong>Starter:</strong> 500 interacciones / mes</li>
  <li><strong>Pro:</strong> 2.000 interacciones / mes</li>
  <li><strong>Business:</strong> 10.000 interacciones / mes + soporte prioritario</li>
</ul>
<h3>Como revisar tu consumo</h3>
<p>En el dashboard, la seccion <strong>Resumen</strong> muestra cuantas interacciones has usado y cuantas te quedan.</p>
<div class="art-note"><strong>¿Llegaste al limite?</strong> Escribenos a hello@orqo.io para ampliar tu limite de inmediato.</div>`,
    },
    {
      id: 'plugin-install',
      title: 'Instalar el plugin ORQO en WordPress',
      category: 'Primeros pasos',
      date: 'Actualizado hace 4 dias',
      body: `<p>El plugin de ORQO es el puente entre tu WordPress y la plataforma. Se instala en menos de 10 minutos y no requiere codigo.</p>
<h3>Metodo 1: Desde el dashboard de WordPress</h3>
<ol>
  <li>Entra al panel de administracion de tu WordPress</li>
  <li>Ve a <strong>Plugins → Añadir nuevo</strong></li>
  <li>Busca <strong>"ORQO"</strong> en el buscador</li>
  <li>Haz clic en <strong>Instalar ahora</strong> y luego en <strong>Activar</strong></li>
</ol>
<h3>Metodo 2: Subir el archivo .zip</h3>
<ol>
  <li>Descarga el plugin desde tu dashboard en <strong>Integraciones → WordPress → Descargar plugin</strong></li>
  <li>En WordPress ve a <strong>Plugins → Añadir nuevo → Subir plugin</strong></li>
  <li>Selecciona el archivo <strong>orqo-connector.zip</strong></li>
  <li>Instala y activa</li>
</ol>
<h3>Configuracion inicial</h3>
<p>Despues de activar, ve a <strong>Ajustes → ORQO</strong> en tu WordPress. Pega el token de conexion del dashboard y guarda los cambios.</p>
<div class="art-note">El plugin requiere WordPress 6.0+ y PHP 7.4+.</div>`,
    },
    {
      id: 'orqo-que-es',
      title: 'Que es ORQO y como funciona',
      category: 'Ayuda',
      date: 'Actualizado hoy',
      body: `<p>ORQO es una capa de orquestacion para agentes IA conectados a tus canales (web widget, WhatsApp y otros) y a tus sistemas de negocio.</p>
<h3>Flujo resumido</h3>
<ol>
  <li>El usuario escribe en el canal</li>
  <li>ORQO identifica el agente y su configuracion</li>
  <li>Se intenta respuesta con los modelos/proveedores configurados</li>
  <li>Si un proveedor falla, ORQO aplica fallback controlado</li>
  <li>La conversacion se guarda para trazabilidad y seguimiento</li>
</ol>
<p>Esto permite mantener continuidad conversacional, observabilidad y control operativo desde el dashboard.</p>`,
    },
    {
      id: 'modelos-fallback',
      title: 'Modelos IA y fallback de continuidad',
      category: 'Ayuda',
      date: 'Actualizado hoy',
      body: `<p>En ORQO puedes configurar varios proveedores/modelos para mayor resiliencia.</p>
<h3>Buenas practicas recomendadas</h3>
<ul>
  <li>Configurar mas de un proveedor activo</li>
  <li>Definir modelos de respaldo para errores de cuota o API key</li>
  <li>Revisar logs por intento fallido para detectar causa raiz</li>
  <li>Configurar alertas para operaciones/propietario</li>
</ul>
<p>Con esto se reduce el riesgo de que el chat quede estatico ante fallos de un proveedor puntual.</p>`,
    },
  ],
  updatedAt: 0,
};

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const workspaceId = resolveScopedWorkspaceId(session, searchParams.get('workspaceId'));
    const db = await getDb();
    const cfg = await getWorkspaceConfig(db, workspaceId, 'widget', { defaults: WIDGET_DEFAULTS });
    return Response.json({ ...WIDGET_DEFAULTS, ...cfg, widgetId: 'default' });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const workspaceId = resolveScopedWorkspaceId(session, body.workspaceId ?? body.workspace_id ?? null);
    delete body.workspaceId;
    delete body.workspace_id;
    const payload = {
      ...WIDGET_DEFAULTS,
      ...(body ?? {}),
      updatedAt: Date.now(),
      widgetId: 'default',
    };

    const db = await getDb();
    await setWorkspaceConfig(db, workspaceId, 'widget', payload as any);

    await db.collection('activity_logs').insertOne({
      ts: Date.now(),
      workspaceId,
      level: 'info',
      source: 'widget-config',
      msg: 'Configuracion guardada',
      detail: `active:${payload.active} title:"${payload.title}"`,
    }).catch(() => {});

    return Response.json({ ok: true });
  } catch (e: any) {
    console.error('[ORQO] widget config POST error:', e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
