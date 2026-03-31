import { getDb } from '@/lib/mongodb';

export const WIDGET_DEFAULTS = {
  widgetId: 'default',
  active: true,
  themeMode: 'auto', // 'auto' | 'dark' | 'light'
  // Texts
  title: 'Hola soy ORQO',
  subtitle: 'Tu Asistente de OrquestaciÃ³n',
  placeholder: 'Â¿En quÃ© te puedo ayudar?',
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
  soundEnabled: true,
  // Home screen articles (ordered list of article ids)
  homeArticles: ['orqo-que-es', 'wp-connect', 'plugin-install', 'modelos-fallback'],
  // Articles
  articles: [
    {
      id: 'wp-connect',
      title: 'Â¿CÃ³mo conectar ORQO con WordPress?',
      category: 'Integraciones',
      date: 'Actualizado hace 3 dÃ­as',
      body: `<p>ORQO se conecta a tu WordPress a travÃ©s de nuestra <strong>API REST</strong> y el protocolo <strong>MCP (Model Context Protocol)</strong>. La conexiÃ³n permite a ORQO leer y ejecutar acciones directamente sobre tu sitio.</p>
<h3>Requisitos previos</h3>
<ul>
  <li>WordPress 6.0 o superior</li>
  <li>Plugin ORQO instalado y activado</li>
  <li>API REST de WordPress habilitada (activa por defecto)</li>
  <li>Cuenta activa en dashboard.orqo.io</li>
</ul>
<h3>Pasos de conexiÃ³n</h3>
<ol>
  <li>Entra a tu dashboard en <strong>dashboard.orqo.io</strong></li>
  <li>Ve a <strong>Integraciones â†’ WordPress</strong></li>
  <li>Ingresa la URL de tu sitio (ej: https://mitienda.com)</li>
  <li>Copia el token generado y pÃ©galo en el plugin de WordPress</li>
  <li>Haz clic en <strong>Verificar conexiÃ³n</strong></li>
</ol>
<div class="art-note">La conexiÃ³n se establece en segundos. Una vez verificada, ORQO puede leer productos, pedidos, formularios y ejecutar acciones en tu sitio en tiempo real.</div>
<h3>Â¿QuÃ© puede hacer ORQO en WordPress?</h3>
<p>Con la conexiÃ³n activa, ORQO puede: consultar inventario de WooCommerce, crear pedidos, registrar usuarios, leer y enviar respuestas de formularios, y ejecutar cualquier endpoint de tu API REST personalizada.</p>`
    },
    {
      id: 'whatsapp-setup',
      title: 'Configurar tu nÃºmero de WhatsApp Business',
      category: 'Integraciones',
      date: 'Actualizado hace 5 dÃ­as',
      body: `<p>ORQO usa la <strong>API oficial de WhatsApp Business</strong> para gestionar conversaciones. Puedes conectar el nÃºmero de tu empresa en pocos minutos.</p>
<h3>Requisitos</h3>
<ul>
  <li>NÃºmero de telÃ©fono dedicado para tu negocio</li>
  <li>Cuenta de Meta Business verificada</li>
  <li>Acceso al dashboard de ORQO</li>
</ul>
<h3>Proceso de configuraciÃ³n</h3>
<ol>
  <li>En el dashboard, ve a <strong>Integraciones â†’ WhatsApp</strong></li>
  <li>Haz clic en <strong>Conectar nÃºmero</strong></li>
  <li>Inicia sesiÃ³n con tu cuenta de Meta Business</li>
  <li>Selecciona el nÃºmero o registra uno nuevo</li>
  <li>Verifica el nÃºmero con el cÃ³digo SMS o llamada</li>
  <li>Configura el nombre del agente y el mensaje de bienvenida</li>
</ol>
<div class="art-note"><strong>Nota:</strong> Si ya usas WhatsApp Business App en ese nÃºmero, deberÃ¡s desvincularlo antes de conectarlo a la API.</div>
<h3>Prueba de la integraciÃ³n</h3>
<p>Una vez conectado, envÃ­a un mensaje de prueba desde otro nÃºmero. ORQO responderÃ¡ automÃ¡ticamente. Puedes ver la conversaciÃ³n en tiempo real desde <strong>Conversaciones</strong>.</p>`
    },
    {
      id: 'agents',
      title: 'Flujos y agentes disponibles',
      category: 'Agentes',
      date: 'Actualizado hace 1 semana',
      body: `<p>ORQO incluye agentes pre-configurados para los flujos mÃ¡s comunes. Cada agente puede personalizarse desde el dashboard.</p>
<h3>Agentes incluidos</h3>
<ul>
  <li><strong>Agente de Pedidos:</strong> Consulta estado de pedidos WooCommerce, rastrea envÃ­os y gestiona devoluciones.</li>
  <li><strong>Agente de Soporte:</strong> Responde preguntas frecuentes, escala a humano cuando es necesario.</li>
  <li><strong>Agente de Reservas:</strong> Integrado con Bookly y Calendly para agendar citas.</li>
  <li><strong>Agente de CatÃ¡logo:</strong> Muestra productos, precios, disponibilidad.</li>
  <li><strong>Agente de CaptaciÃ³n:</strong> Registra leads desde WhatsApp hacia tu CRM.</li>
</ul>
<h3>Crear un agente personalizado</h3>
<p>En el dashboard ve a <strong>Agentes â†’ Nuevo agente</strong>. Define el objetivo, instrucciones y skills. Puedes usar lenguaje natural para configurarlo.</p>
<div class="art-note">Los agentes son independientes entre sÃ­. Puedes tener mÃºltiples agentes activos para diferentes canales.</div>`
    },
    {
      id: 'tokens',
      title: 'LÃ­mites de tokens e interacciones',
      category: 'Planes',
      date: 'Actualizado hace 2 semanas',
      body: `<p>ORQO mide el uso en <strong>interacciones</strong>. Una interacciÃ³n equivale a un mensaje de usuario mÃ¡s la respuesta del agente.</p>
<h3>LÃ­mites por plan</h3>
<ul>
  <li><strong>Demo:</strong> 20 interacciones (versiÃ³n de prueba del widget)</li>
  <li><strong>Starter:</strong> 500 interacciones / mes</li>
  <li><strong>Pro:</strong> 2.000 interacciones / mes</li>
  <li><strong>Business:</strong> 10.000 interacciones / mes + soporte prioritario</li>
</ul>
<h3>CÃ³mo revisar tu consumo</h3>
<p>En el dashboard, la secciÃ³n <strong>Resumen</strong> muestra cuÃ¡ntas interacciones has usado y cuÃ¡ntas te quedan.</p>
<div class="art-note"><strong>Â¿Llegaste al lÃ­mite?</strong> EscrÃ­benos a hello@orqo.io para ampliar tu lÃ­mite de inmediato.</div>`
    },
    {
      id: 'plugin-install',
      title: 'Instalar el plugin ORQO en WordPress',
      category: 'Primeros pasos',
      date: 'Actualizado hace 4 dÃ­as',
      body: `<p>El plugin de ORQO es el puente entre tu WordPress y la plataforma. Se instala en menos de 10 minutos y no requiere cÃ³digo.</p>
<h3>MÃ©todo 1: Desde el dashboard de WordPress</h3>
<ol>
  <li>Entra al panel de administraciÃ³n de tu WordPress</li>
  <li>Ve a <strong>Plugins â†’ AÃ±adir nuevo</strong></li>
  <li>Busca <strong>"ORQO"</strong> en el buscador</li>
  <li>Haz clic en <strong>Instalar ahora</strong> y luego en <strong>Activar</strong></li>
</ol>
<h3>MÃ©todo 2: Subir el archivo .zip</h3>
<ol>
  <li>Descarga el plugin desde tu dashboard en <strong>Integraciones â†’ WordPress â†’ Descargar plugin</strong></li>
  <li>En WordPress ve a <strong>Plugins â†’ AÃ±adir nuevo â†’ Subir plugin</strong></li>
  <li>Selecciona el archivo <strong>orqo-connector.zip</strong></li>
  <li>Instala y activa</li>
</ol>
<h3>ConfiguraciÃ³n inicial</h3>
<p>DespuÃ©s de activar, ve a <strong>Ajustes â†’ ORQO</strong> en tu WordPress. Pega el token de conexiÃ³n del dashboard y guarda los cambios.</p>
<div class="art-note">El plugin requiere WordPress 6.0+ y PHP 7.4+.</div>`
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
<p>Esto permite mantener continuidad conversacional, observabilidad y control operativo desde el dashboard.</p>`
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
<p>Con esto se reduce el riesgo de que el chat quede estatico ante fallos de un proveedor puntual.</p>`
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
    const payload = {
      ...WIDGET_DEFAULTS,
      ...(body ?? {}),
      updatedAt: Date.now(),
      widgetId: 'default',
    };

    const db = await getDb();
    await db.collection('widget_config').updateOne(
      { widgetId: 'default' },
      { $set: payload },
      { upsert: true }
    );

    await db.collection('activity_logs').insertOne({
      ts: Date.now(),
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
