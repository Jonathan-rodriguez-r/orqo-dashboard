import { getDb } from '@/lib/mongodb';

export const WIDGET_DEFAULTS = {
  widgetId: 'default',
  active: true,
  // Texts
  title: 'Hola soy ORQO',
  subtitle: 'Tu Asistente de Orquestación',
  placeholder: '¿En qué te puedo ayudar?',
  // Appearance
  accentColor: '#2CB978',
  position: 'bottom-right',
  darkBg: '#0B100D',
  darkSurface: '#111812',
  lightBg: '#F4F7F4',
  lightSurface: '#FFFFFF',
  windowOpacity: 1.0,
  buttonOpacity: 1.0,
  // Icon / avatar
  iconMode: 'orqo',      // 'orqo' | 'favicon' | 'photo'
  faviconUrl: '',
  agentPhoto: '',         // '' | preset key | custom URL
  // Behavior
  interactionLimit: 20,
  showBranding: true,
  // Home screen articles (ordered list of article ids)
  homeArticles: ['wp-connect', 'plugin-install', 'whatsapp-setup', 'agents'],
  // Articles
  articles: [
    {
      id: 'wp-connect',
      title: '¿Cómo conectar ORQO con WordPress?',
      category: 'Integraciones',
      date: 'Actualizado hace 3 días',
      body: `<p>ORQO se conecta a tu WordPress a través de nuestra <strong>API REST</strong> y el protocolo <strong>MCP (Model Context Protocol)</strong>. La conexión permite a ORQO leer y ejecutar acciones directamente sobre tu sitio.</p>
<h3>Requisitos previos</h3>
<ul>
  <li>WordPress 6.0 o superior</li>
  <li>Plugin ORQO instalado y activado</li>
  <li>API REST de WordPress habilitada (activa por defecto)</li>
  <li>Cuenta activa en dashboard.orqo.io</li>
</ul>
<h3>Pasos de conexión</h3>
<ol>
  <li>Entra a tu dashboard en <strong>dashboard.orqo.io</strong></li>
  <li>Ve a <strong>Integraciones → WordPress</strong></li>
  <li>Ingresa la URL de tu sitio (ej: https://mitienda.com)</li>
  <li>Copia el token generado y pégalo en el plugin de WordPress</li>
  <li>Haz clic en <strong>Verificar conexión</strong></li>
</ol>
<div class="art-note">La conexión se establece en segundos. Una vez verificada, ORQO puede leer productos, pedidos, formularios y ejecutar acciones en tu sitio en tiempo real.</div>
<h3>¿Qué puede hacer ORQO en WordPress?</h3>
<p>Con la conexión activa, ORQO puede: consultar inventario de WooCommerce, crear pedidos, registrar usuarios, leer y enviar respuestas de formularios, y ejecutar cualquier endpoint de tu API REST personalizada.</p>`
    },
    {
      id: 'whatsapp-setup',
      title: 'Configurar tu número de WhatsApp Business',
      category: 'Integraciones',
      date: 'Actualizado hace 5 días',
      body: `<p>ORQO usa la <strong>API oficial de WhatsApp Business</strong> para gestionar conversaciones. Puedes conectar el número de tu empresa en pocos minutos.</p>
<h3>Requisitos</h3>
<ul>
  <li>Número de teléfono dedicado para tu negocio</li>
  <li>Cuenta de Meta Business verificada</li>
  <li>Acceso al dashboard de ORQO</li>
</ul>
<h3>Proceso de configuración</h3>
<ol>
  <li>En el dashboard, ve a <strong>Integraciones → WhatsApp</strong></li>
  <li>Haz clic en <strong>Conectar número</strong></li>
  <li>Inicia sesión con tu cuenta de Meta Business</li>
  <li>Selecciona el número o registra uno nuevo</li>
  <li>Verifica el número con el código SMS o llamada</li>
  <li>Configura el nombre del agente y el mensaje de bienvenida</li>
</ol>
<div class="art-note"><strong>Nota:</strong> Si ya usas WhatsApp Business App en ese número, deberás desvincularlo antes de conectarlo a la API.</div>
<h3>Prueba de la integración</h3>
<p>Una vez conectado, envía un mensaje de prueba desde otro número. ORQO responderá automáticamente. Puedes ver la conversación en tiempo real desde <strong>Conversaciones</strong>.</p>`
    },
    {
      id: 'agents',
      title: 'Flujos y agentes disponibles',
      category: 'Agentes',
      date: 'Actualizado hace 1 semana',
      body: `<p>ORQO incluye agentes pre-configurados para los flujos más comunes. Cada agente puede personalizarse desde el dashboard.</p>
<h3>Agentes incluidos</h3>
<ul>
  <li><strong>Agente de Pedidos:</strong> Consulta estado de pedidos WooCommerce, rastrea envíos y gestiona devoluciones.</li>
  <li><strong>Agente de Soporte:</strong> Responde preguntas frecuentes, escala a humano cuando es necesario.</li>
  <li><strong>Agente de Reservas:</strong> Integrado con Bookly y Calendly para agendar citas.</li>
  <li><strong>Agente de Catálogo:</strong> Muestra productos, precios, disponibilidad.</li>
  <li><strong>Agente de Captación:</strong> Registra leads desde WhatsApp hacia tu CRM.</li>
</ul>
<h3>Crear un agente personalizado</h3>
<p>En el dashboard ve a <strong>Agentes → Nuevo agente</strong>. Define el objetivo, instrucciones y skills. Puedes usar lenguaje natural para configurarlo.</p>
<div class="art-note">Los agentes son independientes entre sí. Puedes tener múltiples agentes activos para diferentes canales.</div>`
    },
    {
      id: 'tokens',
      title: 'Límites de tokens e interacciones',
      category: 'Planes',
      date: 'Actualizado hace 2 semanas',
      body: `<p>ORQO mide el uso en <strong>interacciones</strong>. Una interacción equivale a un mensaje de usuario más la respuesta del agente.</p>
<h3>Límites por plan</h3>
<ul>
  <li><strong>Demo:</strong> 20 interacciones (versión de prueba del widget)</li>
  <li><strong>Starter:</strong> 500 interacciones / mes</li>
  <li><strong>Pro:</strong> 2.000 interacciones / mes</li>
  <li><strong>Business:</strong> 10.000 interacciones / mes + soporte prioritario</li>
</ul>
<h3>Cómo revisar tu consumo</h3>
<p>En el dashboard, la sección <strong>Resumen</strong> muestra cuántas interacciones has usado y cuántas te quedan.</p>
<div class="art-note"><strong>¿Llegaste al límite?</strong> Escríbenos a hola@orqo.io para ampliar tu límite de inmediato.</div>`
    },
    {
      id: 'plugin-install',
      title: 'Instalar el plugin ORQO en WordPress',
      category: 'Primeros pasos',
      date: 'Actualizado hace 4 días',
      body: `<p>El plugin de ORQO es el puente entre tu WordPress y la plataforma. Se instala en menos de 10 minutos y no requiere código.</p>
<h3>Método 1: Desde el dashboard de WordPress</h3>
<ol>
  <li>Entra al panel de administración de tu WordPress</li>
  <li>Ve a <strong>Plugins → Añadir nuevo</strong></li>
  <li>Busca <strong>"ORQO"</strong> en el buscador</li>
  <li>Haz clic en <strong>Instalar ahora</strong> y luego en <strong>Activar</strong></li>
</ol>
<h3>Método 2: Subir el archivo .zip</h3>
<ol>
  <li>Descarga el plugin desde tu dashboard en <strong>Integraciones → WordPress → Descargar plugin</strong></li>
  <li>En WordPress ve a <strong>Plugins → Añadir nuevo → Subir plugin</strong></li>
  <li>Selecciona el archivo <strong>orqo-connector.zip</strong></li>
  <li>Instala y activa</li>
</ol>
<h3>Configuración inicial</h3>
<p>Después de activar, ve a <strong>Ajustes → ORQO</strong> en tu WordPress. Pega el token de conexión del dashboard y guarda los cambios.</p>
<div class="art-note">El plugin requiere WordPress 6.0+ y PHP 7.4+.</div>`
    }
  ],
  updatedAt: 0,
};

export async function GET() {
  try {
    const db = await getDb();
    const doc = await db.collection('widget_config').findOne({ widgetId: 'default' });
    if (!doc) {
      const newDoc = { ...WIDGET_DEFAULTS, updatedAt: Date.now() };
      await db.collection('widget_config').insertOne(newDoc);
      return Response.json(WIDGET_DEFAULTS);
    }
    const { _id, ...rest } = doc;
    return Response.json(rest);
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    body.updatedAt = Date.now();
    body.widgetId = 'default';
    const db = await getDb();
    await db.collection('widget_config').updateOne(
      { widgetId: 'default' },
      { $set: body },
      { upsert: true }
    );
    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
