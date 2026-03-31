'use client';

import { useMemo, useState } from 'react';

type Tab = 'manual' | 'faq' | 'diagnostico' | 'changelog';

type DiagResult = {
  label: string;
  status: 'ok' | 'warn' | 'error' | 'loading';
  detail: string;
};

// â”€â”€ Manual sections â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const MANUAL = [
  {
    title: '1. Primeros pasos â€” configura tu espacio de trabajo',
    body: 'Al iniciar sesiÃ³n por primera vez, tu cuenta se crea automÃ¡ticamente como Propietario con acceso total. Desde ConfiguraciÃ³n â†’ Accesos puedes invitar colaboradores asignÃ¡ndoles un rol antes de enviar la invitaciÃ³n.\n\nEl primer paso recomendado es ir a ConfiguraciÃ³n â†’ Widget para personalizar el asistente antes de instalarlo en tu sitio.',
    note: 'El enlace de invitaciÃ³n es vÃ¡lido 72 horas. Si expira, el administrador puede reenviar una nueva invitaciÃ³n desde la misma pantalla.',
  },
  {
    title: '2. Instala el widget en tu sitio web',
    body: 'WordPress / WooCommerce: ve a Plugins â†’ AÃ±adir nuevo, busca "ORQO", instala y activa. Copia el token de ConfiguraciÃ³n â†’ Integraciones â†’ WordPress y pÃ©galo en Ajustes â†’ ORQO.\n\nCualquier sitio web: ve a ConfiguraciÃ³n â†’ Integraciones â†’ CÃ³digo de integraciÃ³n. Copia el snippet de una lÃ­nea y pÃ©galo antes del </body> de tu HTML. El widget cargarÃ¡ la configuraciÃ³n del dashboard en tiempo real.',
    note: 'El widget solo se muestra si el switch "Widget activo" estÃ¡ en ON en ConfiguraciÃ³n â†’ Widget.',
  },
  {
    title: '3. Personaliza el widget',
    body: 'En ConfiguraciÃ³n â†’ Widget puedes cambiar:\nâ€¢ Nombre y subtÃ­tulo del asistente\nâ€¢ Colores de acento y fondo\nâ€¢ Icono (10 presets o foto de agente real)\nâ€¢ PosiciÃ³n en pantalla (5 opciones)\nâ€¢ TipografÃ­a y radio de bordes\nâ€¢ LÃ­mite de interacciones por sesiÃ³n\nâ€¢ ArtÃ­culos de ayuda (hasta 6, con tÃ­tulo y URL)\nâ€¢ Mensaje de bienvenida y placeholder\n\nGuarda los cambios y presiona "Guardar y abrir" para ver la vista previa en orqo.io.',
  },
  {
    title: '4. Conecta WhatsApp Business',
    body: 'Ve a ConfiguraciÃ³n â†’ Integraciones â†’ WhatsApp Business. Haz clic en "Conectar nÃºmero" e inicia sesiÃ³n con tu cuenta Meta Business. Selecciona o registra el nÃºmero, verifica con SMS/voz y configura el mensaje de bienvenida.\n\nUna vez conectado, las conversaciones de WhatsApp aparecerÃ¡n en la secciÃ³n Conversaciones con el Ã­cono de WhatsApp.',
    note: 'Si el nÃºmero ya estÃ¡ en la app de WhatsApp Business (no API), debes desvincularlo antes de conectarlo. Este proceso elimina el historial previo del nÃºmero.',
  },
  {
    title: '5. Crea y activa agentes IA',
    body: 'Ve a Agentes â†’ Nuevo agente. Define:\nâ€¢ Objetivo en lenguaje natural (ej: "Atiende consultas de soporte sobre pedidos en WooCommerce")\nâ€¢ Proveedor de IA y modelo (Anthropic, OpenAI, Google)\nâ€¢ Skills disponibles (mÃ¡x. 8 por agente)\nâ€¢ Canales donde debe operar (Widget, WhatsApp, Instagram, etc.)\n\nActÃ­valo con el switch. El agente comenzarÃ¡ a responder en los canales seleccionados de inmediato.',
  },
  {
    title: '6. Gestiona conversaciones',
    body: 'En Conversaciones puedes ver el historial completo de interacciones. Cada fila muestra:\nâ€¢ Canal de origen (WhatsApp, Instagram, Widget web, etc.)\nâ€¢ Modelo de IA que atendiÃ³ la conversaciÃ³n\nâ€¢ Tokens estimados (total Â· â†‘ entrada Â· â†“ salida)\nâ€¢ ID Ãºnico de conversaciÃ³n (Ãºtil para auditorÃ­as)\nâ€¢ DuraciÃ³n y nÃºmero de mensajes\n\nUsa los filtros por canal, estado, modelo y bÃºsqueda de texto para encontrar conversaciones especÃ­ficas.',
  },
  {
    title: '7. Analiza el rendimiento en Informes',
    body: 'La secciÃ³n Informes muestra mÃ©tricas de rendimiento con selector de perÃ­odo (7, 30 o 90 dÃ­as):\nâ€¢ Tasa de resoluciÃ³n (conversaciones cerradas sin escalar)\nâ€¢ Tasa de desvÃ­o a humano\nâ€¢ Tiempo promedio de respuesta\nâ€¢ EstimaciÃ³n de ROI (horas de trabajo ahorradas)\nâ€¢ Tabla de rendimiento diario\n\nLa Vista General muestra las mÃ©tricas mÃ¡s importantes en grÃ¡ficas interactivas: tendencia diaria, distribuciÃ³n por canal y horas pico.',
  },
  {
    title: '8. Gestiona el equipo (Propietarios y Administradores)',
    body: 'En ConfiguraciÃ³n â†’ Accesos puedes:\nâ€¢ Invitar usuarios ingresando su correo y asignando un rol\nâ€¢ Cambiar el rol o nombre de un usuario existente\nâ€¢ Eliminar accesos (no puedes eliminarte a ti mismo)\n\nEn ConfiguraciÃ³n â†’ Roles puedes ver los permisos de cada rol y modificar los roles personalizados. Los roles del sistema (Propietario, Administrador, Analista, Observador, Operaciones, Gestor de Agentes) no se pueden eliminar.',
  },
  {
    title: '9. AuditorÃ­a y logs del sistema',
    body: 'La secciÃ³n Logs & AuditorÃ­a (visible solo para roles con permiso admin.logs) muestra un registro completo de todas las acciones del sistema:\nâ€¢ Inicios de sesiÃ³n exitosos y fallidos\nâ€¢ Invitaciones y cambios de usuario\nâ€¢ Modificaciones de roles y permisos\nâ€¢ Intentos de acceso no autorizados\nâ€¢ Errores del sistema\n\nPuedes filtrar por nivel (INFO/WARN/ERROR/FATAL), categorÃ­a, fecha y buscar por texto. Cada entrada es expandible para ver los datos completos incluyendo antes/despuÃ©s de cambios.',
    note: 'Los logs se retienen segÃºn la variable de entorno LOG_RETENTION_DAYS (por defecto 90 dÃ­as). Se eliminan automÃ¡ticamente al vencer.',
  },
  {
    title: '10. DiagnÃ³stico del sistema',
    body: 'En el tab DiagnÃ³stico de esta misma secciÃ³n puedes verificar:\nâ€¢ Estado de la API pÃºblica del widget (CORS)\nâ€¢ Si hay configuraciÃ³n guardada en MongoDB\nâ€¢ Si el widget estÃ¡ activo\nâ€¢ Si el endpoint privado responde (sesiÃ³n activa)\n\nUsa esta herramienta si el widget no aparece en tu sitio o si ves comportamientos inesperados.',
  },
];

// â”€â”€ FAQ by role â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const FAQ_GROUPS = [
  {
    role: 'Propietario',
    slug: 'owner',
    color: '#2CB978',
    items: [
      {
        q: 'Â¿QuÃ© puede hacer el Propietario que los demÃ¡s no pueden?',
        a: 'El Propietario tiene acceso total al sistema, incluyendo facturaciÃ³n, asignaciÃ³n del rol "Propietario" a otros usuarios, y eliminaciÃ³n de cualquier tipo de cuenta. Solo el Propietario puede modificar el rol owner en la secciÃ³n de Roles.',
      },
      {
        q: 'Â¿CÃ³mo invito al primer colaborador?',
        a: 'Ve a ConfiguraciÃ³n â†’ Accesos â†’ Invitar usuario. Ingresa el correo, selecciona el rol y haz clic en Invitar. Se enviarÃ¡ un correo con un enlace de activaciÃ³n vÃ¡lido 72 horas. El enlace tambiÃ©n aparece en pantalla para que lo copies manualmente si el correo tarda.',
      },
      {
        q: 'Â¿Puedo cambiar mi propio rol?',
        a: 'No. El sistema impide que cambies tu propio rol para evitar que el Propietario se bloquee el acceso accidentalmente. Si necesitas cambiar tu rol, otro Propietario debe hacerlo.',
      },
      {
        q: 'Â¿Los logs de auditorÃ­a son permanentes?',
        a: 'No, los logs tienen un tiempo de retenciÃ³n configurable (variable LOG_RETENTION_DAYS, por defecto 90 dÃ­as). Se eliminan automÃ¡ticamente de MongoDB cuando vence su fecha de expiraciÃ³n. Para retenciÃ³n permanente, aumenta este valor antes de desplegar.',
      },
    ],
  },
  {
    role: 'Administrador',
    slug: 'admin',
    color: '#60A5FA',
    items: [
      {
        q: 'Â¿QuÃ© no puede hacer el Administrador?',
        a: 'El Administrador no puede: acceder a FacturaciÃ³n, crear/eliminar roles del sistema, ni asignar el rol de Propietario. Tiene acceso total al resto del sistema incluyendo gestiÃ³n de usuarios, agentes, configuraciÃ³n del widget e integraciones.',
      },
      {
        q: 'Â¿Puedo modificar los permisos de un rol del sistema?',
        a: 'Solo si eres Propietario o si tienes el permiso "settings.roles". Los Administradores normalmente no tienen este permiso por defecto. Para cambiar esto, el Propietario debe modificar el rol admin en ConfiguraciÃ³n â†’ Roles.',
      },
      {
        q: 'Â¿CÃ³mo creo un rol personalizado?',
        a: 'Ve a ConfiguraciÃ³n â†’ Roles â†’ Nuevo rol. Define un nombre, ID (slug) y descripciÃ³n. Luego asigna los permisos especÃ­ficos usando las casillas por mÃ³dulo. Los roles personalizados se pueden eliminar, los del sistema no.',
      },
      {
        q: 'Â¿El Administrador puede ver los logs de auditorÃ­a?',
        a: 'SÃ­, por defecto el rol admin incluye el permiso "admin.logs" que da acceso a Logs & AuditorÃ­a. Si este permiso fue removido manualmente, el Propietario debe restaurarlo en ConfiguraciÃ³n â†’ Roles.',
      },
    ],
  },
  {
    role: 'Analista',
    slug: 'analyst',
    color: '#A78BFA',
    items: [
      {
        q: 'Â¿QuÃ© puede ver el Analista?',
        a: 'El Analista tiene acceso de solo lectura a Conversaciones e Informes. Puede ver mÃ©tricas, grÃ¡ficas y tablas de rendimiento, pero no puede modificar configuraciones, agentes ni usuarios.',
      },
      {
        q: 'Â¿El Analista puede exportar datos?',
        a: 'Depende de la configuraciÃ³n. El permiso "conversations.export" permite descargar conversaciones. Por defecto el rol Analista incluye este permiso. El Propietario o Administrador puede quitarlo en ConfiguraciÃ³n â†’ Roles si es necesario restringir las exportaciones.',
      },
      {
        q: 'Â¿Por quÃ© no veo la secciÃ³n de ConfiguraciÃ³n?',
        a: 'El rol Analista no incluye permisos de ConfiguraciÃ³n. Si necesitas acceso a alguna configuraciÃ³n especÃ­fica, solicita al Administrador que cambie tu rol o cree un rol personalizado con los permisos necesarios.',
      },
      {
        q: 'Â¿Puedo filtrar conversaciones por modelo de IA?',
        a: 'SÃ­. En la secciÃ³n Conversaciones usa el filtro "Modelo" para ver solo las conversaciones atendidas por un modelo especÃ­fico (Claude Sonnet, GPT-4o, Gemini, etc.). TambiÃ©n puedes buscar por texto, canal, estado y fecha.',
      },
    ],
  },
  {
    role: 'Observador',
    slug: 'viewer',
    color: '#94A3B8',
    items: [
      {
        q: 'Â¿QuÃ© puede ver el Observador?',
        a: 'El Observador tiene acceso de solo lectura al Dashboard (Vista General) y a las Conversaciones. No puede ver Informes, Agentes, ConfiguraciÃ³n ni Logs. Es el rol con menos privilegios del sistema.',
      },
      {
        q: 'Â¿Por quÃ© no puedo ver Informes ni Agentes?',
        a: 'El rol Observador estÃ¡ diseÃ±ado para personas que solo necesitan monitorear el estado general sin acceso a configuraciones ni anÃ¡lisis detallados. Solicita al Administrador que te asigne el rol Analista si necesitas ver informes.',
      },
      {
        q: 'Â¿Puedo exportar conversaciones como Observador?',
        a: 'No. El rol Observador solo tiene "dashboard.view" y "conversations.view". La exportaciÃ³n requiere el permiso "conversations.export" que pertenece al Analista o roles superiores.',
      },
    ],
  },
  {
    role: 'Operaciones e Infraestructura',
    slug: 'operations',
    color: '#FB923C',
    items: [
      {
        q: 'Â¿CuÃ¡l es el enfoque del rol Operaciones?',
        a: 'Operaciones estÃ¡ diseÃ±ado para personal tÃ©cnico que gestiona integraciones, canales y configuraciÃ³n operativa del sistema, sin necesidad de acceder a anÃ¡lisis de negocio ni gestiÃ³n de usuarios. Incluye permisos sobre Widget, Integraciones y Agentes.',
      },
      {
        q: 'Â¿El rol Operaciones puede conectar integraciones (WhatsApp, WordPress, etc.)?',
        a: 'SÃ­, el permiso "settings.integrations" permite conectar y configurar todos los canales disponibles. Si este permiso no aparece habilitado, el Propietario debe habilitarlo en ConfiguraciÃ³n â†’ Roles â†’ operations.',
      },
      {
        q: 'Â¿Operaciones puede crear o eliminar agentes?',
        a: 'SÃ­, con el permiso "agents.manage" que viene incluido en este rol. Puede crear, editar, activar y desactivar agentes. No puede ver los Informes de rendimiento ni gestionar usuarios.',
      },
      {
        q: 'Â¿Por quÃ© el equipo de infraestructura deberÃ­a usar este rol y no admin?',
        a: 'El principio de mÃ­nimo privilegio reduce el riesgo. El rol Operaciones da acceso solo a lo que necesita el equipo tÃ©cnico (integraciones, agentes, widget) sin exponer datos sensibles de negocio, usuarios o facturaciÃ³n.',
      },
    ],
  },
];

// â”€â”€ Changelog data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CHANGELOG = [
  {
    version: 'v1.7',
    date: 'Mar 2026',
    label: 'Actual',
    items: [
      'Centro de ayuda redisenado con manual guiado y experiencia de lectura ampliada',
      'FAQ por rol ahora incluye buscador y filtros para resolver incidencias mas rapido',
      'Diagnostico mezcla checks locales del navegador con checks de servidor en una sola corrida',
      'Se agrego vista visual tipo pantallazo operativo para entrenar equipos de onboarding',
      'Landing publica ahora incluye seccion dedicada de manual + FAQ para clientes nuevos',
    ],
  },
  {
    version: 'v1.4',
    date: 'Mar 2026',
    label: null,
    items: [
      'Agentes: arquitectura Master-Detail â€” lista lateral de agentes + panel de configuraciÃ³n con 4 bloques (Identidad, Canales, Skills, Avanzado)',
      'Agentes: simulador de chat (Vista Previa) con conversaciÃ³n mock adaptada al perfil y personalidad del agente',
      'Agentes: soporte multi-agente real con CRUD completo persistido en MongoDB (colecciÃ³n agents_v2)',
      'OrquestaciÃ³n IA: nueva secciÃ³n en ConfiguraciÃ³n para gestionar proveedores (OpenAI, Anthropic, Google, Grok), lÃ­mites de tokens y estrategia multi-modelo',
      'API /api/agents (GET/POST) y /api/agents/[id] (GET/PATCH/DELETE) â€” schema multi-tenant por workspaceId',
      'API /api/settings/workspace (GET/PUT) â€” configuraciÃ³n global de workspace (proveedores, orquestaciÃ³n, tokens)',
      'Canales: 6 canales configurables por agente (WhatsApp, Instagram, Messenger, Web Widget, WooCommerce, Shopify)',
      'Skills: sistema de capacidades por agente con mÃ¡ximo 8 skills, agrupadas por categorÃ­a',
      'Avanzado: zona horaria, horarios de atenciÃ³n, geocercas y configuraciÃ³n de escalamiento por agente',
      'Topbar: eliminado botÃ³n de Asistente; Feedback eliminado del menÃº lateral',
      'Sidebar: nuevo Ã­tem "OrquestaciÃ³n IA" en secciÃ³n Sistema con icono de IA',
    ],
  },
  {
    version: 'v1.3',
    date: 'Mar 2026',
    label: null,
    items: [
      'Cuenta: logo del cliente en la barra lateral (upload por archivo â‰¤512KB o URL), nombre del dashboard personalizable',
      'Cuenta: campos adicionales â€” industria, telÃ©fono, direcciÃ³n, email de soporte',
      'Centro de ayuda: manual completo (10 secciones), FAQ agrupado por rol (Propietario/Admin/Analista/Observador/Operaciones)',
      'Centro de ayuda: changelog siempre actualizado; tab "Logs" eliminado (reemplazado por secciÃ³n dedicada)',
      'Logs & AuditorÃ­a: error 403 muestra aviso claro con link de re-login (sesiÃ³n anterior sin permiso admin.logs)',
      'Seed: genera 25 entradas demo de audit_logs con todas las categorÃ­as y niveles para visualizaciÃ³n inmediata',
      'Fix: changelog e identidad de marca en orqo.io ahora siguen preferencia dark/light del usuario (localStorage)',
    ],
  },
  {
    version: 'v1.2',
    date: 'Mar 2026',
    label: null,
    items: [
      'Sistema de observabilidad y auditorÃ­a completo â€” audit_logs con TTL en MongoDB',
      'Logs & AuditorÃ­a: UI con filtros combinables (nivel, categorÃ­a, fecha, texto), acordeÃ³n expandible con JSON before/after',
      'LoggerService centralizado (lib/logger.ts) â€” schema ECS-inspired con correlationId, severity, actor/target, diff',
      'Auto-log de todos los eventos: inicios de sesiÃ³n, invitaciones, cambios de usuario/rol, intentos no autorizados',
      'Conversaciones: columna de Modelo (badge por proveedor), Tokens (â†‘/â†“), ID de conversaciÃ³n, duraciÃ³n',
      'Datos de demostraciÃ³n enriquecidos: 60 conversaciones con modelos variados (Claude, GPT-4o, Gemini)',
      'Fix: empty state en Vista General, Informes y Conversaciones ya muestra el botÃ³n de datos demo',
      'Fix: correo no autorizado muestra "No autorizado" con log de seguridad WARN/HIGH',
      'Roles del sistema protegidos de eliminaciÃ³n: owner, admin, analyst, agent_manager, viewer, operations',
      'Link de activaciÃ³n copiable en pantalla al invitar usuario (ademÃ¡s del correo)',
    ],
  },
  {
    version: 'v1.1',
    date: 'Mar 2026',
    label: null,
    items: [
      'Google OAuth 2.0 (SSO) â€” inicio de sesiÃ³n con cuenta Google via Authorization Code Flow',
      'JWT con permisos embebidos â€” SessionPayload con sub, email, role, permissions[], jti, provider',
      'UI Enterprise de Login â€” Google SSO como primario + magic link en acordeÃ³n',
      'RBAC completo: 15 mÃ³dulos, 5 roles predeterminados, Edge Middleware sub-ms en Vercel',
      'PermissionGate + usePermissions â€” componente y hook para UI reactiva por permisos',
      'API RBAC: GET/POST/DELETE /api/users, GET/PATCH /api/roles, POST /api/seed/rbac',
      'Tabla de usuarios con avatar Google, badge de rol y Ãºltimo acceso',
    ],
  },
  {
    version: 'v1.0',
    date: 'Mar 2026',
    label: null,
    items: [
      'Dashboard Mobile-First â€” sidebar off-canvas con hamburguesa, overlay y animaciÃ³n fluida',
      'Vista General con mÃ©tricas de ROI â€” AreaChart, PieChart, BarChart con recharts',
      'PÃ¡gina de Informes â€” anÃ¡lisis de rendimiento con selector de perÃ­odo (7/30/90 dÃ­as)',
      'ConfiguraciÃ³n consolidada â€” 4 pestaÃ±as: Widget, Integraciones, Accesos y Cuenta',
      'CatÃ¡logo de integraciones MCP â€” Meta, bases de datos, fuentes de datos y sistemas core',
      'Iconos de canal en Conversaciones â€” filtros en pills por WhatsApp, Instagram, FB, etc.',
      'MongoDB analytics_daily + seed de 30 dÃ­as y 60 conversaciones mock',
      'API /api/analytics con agregaciÃ³n de totales, tendencia y distribuciÃ³n por canal',
    ],
  },
  {
    version: 'v0.9',
    date: 'Mar 2026',
    label: null,
    items: [
      'Fix CORS: /api/public/widget exento del middleware de auth (307 â†’ 200)',
      'Fix tema claro/oscuro: inyecciÃ³n de <style> en lugar de inline styles',
      'Posiciones arriba-centro y abajo-centro en el widget',
      'Contador de interacciones actualizado desde config de API',
      'Logs de actividad en activity_logs (MongoDB)',
      'Centro de ayuda & DiagnÃ³stico en dashboard',
      'Landing: secciÃ³n ImplementaciÃ³n en 3 pasos y Perfiles & Skills',
    ],
  },
  {
    version: 'v0.8',
    date: 'Feb 2026',
    label: null,
    items: [
      'Widget embebible: widget.js + API key + endpoint /api/public/widget',
      'SecciÃ³n Integraciones con cÃ³digo embed y botÃ³n copiar',
      'PÃ¡gina de identidad de marca adaptada con nav/footer',
      'Footer consistente en login, index y manual de marca',
      'Email actualizado a hello@orqo.io',
    ],
  },
  {
    version: 'v0.7',
    date: 'Feb 2026',
    label: null,
    items: [
      'Dashboard widget: preview dark/light, posiciÃ³n como select',
      'Favicon presets: 10 iconos SVG seleccionables',
      'Fotos de agente: 8 retratos reales (randomuser.me)',
      'Opacidad de ventana y botÃ³n configurables',
      'Fuente y radio de bordes personalizables',
    ],
  },
  {
    version: 'v0.6',
    date: 'Ene 2026',
    label: null,
    items: [
      'Auth magic link con JWT y Resend',
      'Middleware de sesiÃ³n (proxy.ts)',
      'Timeout de sesiÃ³n 5 min con aviso',
      'Lista de usuarios con acceso al dashboard',
      'Captcha matemÃ¡tico en login',
    ],
  },
  {
    version: 'v0.5',
    date: 'Ene 2026',
    label: null,
    items: [
      'Proyecto inicial Next.js + MongoDB Atlas',
      'Widget de chat ORQO en landing page',
      'Dashboard bÃ¡sico con sidebar',
      'SecciÃ³n hero y ticker en landing',
    ],
  },
];

export default function DocsPage() {
  const [tab, setTab] = useState<Tab>('manual');
  const [manualFocus, setManualFocus] = useState(0);
  const [diagResults, setDiagResults] = useState<DiagResult[]>([]);
  const [diagRunning, setDiagRunning] = useState(false);
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [openGroup, setOpenGroup] = useState<string>('all');
  const [faqQuery, setFaqQuery] = useState('');

  const activeManual = MANUAL[manualFocus] ?? MANUAL[0];
  const activeManualLines = activeManual.body.split('\n').map((line: string) => line.trim()).filter(Boolean);
  const activeManualBullets = activeManualLines.filter((line: string) => line.startsWith('â€¢') || line.startsWith('•'));

  const visibleFaqGroups = useMemo(() => {
    const query = faqQuery.trim().toLowerCase();
    return FAQ_GROUPS
      .filter((group: any) => (openGroup === 'all' ? true : group.slug === openGroup))
      .map((group: any) => {
        if (!query) return group;
        return {
          ...group,
          items: group.items.filter((item: any) => `${item.q} ${item.a}`.toLowerCase().includes(query)),
        };
      })
      .filter((group: any) => group.items.length > 0);
  }, [faqQuery, openGroup]);

  async function runDiag() {
    setDiagRunning(true);

    const localChecks: DiagResult[] = [
      {
        label: 'Estado del navegador',
        status: navigator.onLine ? 'ok' : 'warn',
        detail: navigator.onLine ? 'Conectado a internet.' : 'Sin conexion o red inestable.',
      },
    ];

    try {
      localStorage.setItem('orqo_diag_probe', 'ok');
      localStorage.removeItem('orqo_diag_probe');
      localChecks.push({
        label: 'Persistencia local',
        status: 'ok',
        detail: 'localStorage disponible para historial y configuracion del widget.',
      });
    } catch {
      localChecks.push({
        label: 'Persistencia local',
        status: 'warn',
        detail: 'No fue posible usar localStorage; el navegador puede estar restringido.',
      });
    }

    setDiagResults([
      ...localChecks,
      { label: 'Diagnostico de servidor', status: 'loading', detail: 'Ejecutando verificaciones...' },
    ]);

    try {
      const res = await fetch('/api/docs/diagnostics', { method: 'POST', cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        setDiagResults([
          ...localChecks,
          { label: 'Diagnostico de servidor', status: 'error', detail: data?.error ?? `HTTP ${res.status}` },
        ]);
        setDiagRunning(false);
        return;
      }

      const mapped: DiagResult[] = Array.isArray(data.results)
        ? data.results.map((r: any) => ({
            label: String(r?.label ?? 'Check'),
            status: r?.status === 'ok' || r?.status === 'warn' || r?.status === 'error' ? r.status : 'warn',
            detail: String(r?.detail ?? ''),
          }))
        : [];

      setDiagResults([...localChecks, ...mapped]);
    } catch (e: any) {
      setDiagResults([
        ...localChecks,
        { label: 'Diagnostico de servidor', status: 'error', detail: `Error ejecutando diagnostico: ${e.message}` },
      ]);
    }
    setDiagRunning(false);
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'manual', label: 'Manual' },
    { id: 'faq', label: 'FAQ por rol' },
    { id: 'diagnostico', label: 'Diagnostico' },
    { id: 'changelog', label: 'Changelog' },
  ];

  const statusColor = (s: DiagResult['status']) =>
    s === 'ok' ? 'var(--acc)' : s === 'warn' ? 'var(--yellow)' : s === 'error' ? 'var(--red)' : 'var(--g05)';
  const statusIcon = (s: DiagResult['status']) =>
    s === 'ok' ? 'OK' : s === 'warn' ? 'WARN' : s === 'error' ? 'ERR' : '...';

  return (
    <div className="dash-content" style={{ maxWidth: 1120 }}>
      <div
        style={{
          marginBottom: 22,
          border: '1px solid var(--g03)',
          borderRadius: 'var(--radius-xl)',
          background: 'linear-gradient(135deg, rgba(44,185,120,0.12), rgba(11,16,13,0.65))',
          padding: 22,
          display: 'flex',
          justifyContent: 'space-between',
          gap: 14,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ fontFamily: 'var(--f-disp)', fontWeight: 800, fontSize: 26, color: 'var(--g08)', letterSpacing: '-0.3px' }}>
            Centro de ayuda
          </div>
          <div style={{ color: 'var(--g05)', fontSize: 13, marginTop: 4, maxWidth: 680 }}>
            Manual ampliado, FAQ util por rol, diagnostico operativo y changelog consolidado para un uso empresarial.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {['Onboarding guiado', 'Operacion asistida', 'Listo para auditoria'].map((item) => (
            <span key={item} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--acc)', background: 'rgba(44,185,120,0.11)', border: '1px solid rgba(44,185,120,0.35)', borderRadius: 999, padding: '6px 10px' }}>
              {item}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--g03)', paddingBottom: 12, flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              background: tab === t.id ? 'rgba(44,185,120,0.12)' : 'var(--g01)',
              border: `1px solid ${tab === t.id ? 'rgba(44,185,120,0.4)' : 'var(--g03)'}`,
              cursor: 'pointer',
              padding: '8px 14px',
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 600,
              color: tab === t.id ? 'var(--acc)' : 'var(--g05)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'manual' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 320px) minmax(0, 1fr)', gap: 14 }}>
          <div style={{ background: 'var(--g01)', border: '1px solid var(--g03)', borderRadius: 'var(--radius-lg)', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--g04)', letterSpacing: '0.09em', textTransform: 'uppercase', padding: '2px 4px 6px' }}>
              Ruta operativa
            </div>
            {MANUAL.map((step, idx) => (
              <button
                key={step.title}
                onClick={() => setManualFocus(idx)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: idx === manualFocus ? 'rgba(44,185,120,0.11)' : 'var(--g00)',
                  border: `1px solid ${idx === manualFocus ? 'rgba(44,185,120,0.4)' : 'var(--g03)'}`,
                  borderRadius: 10,
                  padding: '9px 10px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ color: idx === manualFocus ? 'var(--acc)' : 'var(--g07)', fontSize: 12.5, fontWeight: 700, lineHeight: 1.35 }}>
                  {step.title}
                </div>
              </button>
            ))}
          </div>

          <div style={{ background: 'var(--g01)', border: '1px solid var(--g03)', borderRadius: 'var(--radius-lg)', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ border: '1px solid var(--g03)', borderRadius: 12, padding: 14, background: 'linear-gradient(180deg, rgba(44,185,120,0.11), rgba(44,185,120,0.03))' }}>
              <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--g08)', marginBottom: 6 }}>{activeManual.title}</div>
              <div style={{ color: 'var(--g05)', fontSize: 13.5, lineHeight: 1.7, whiteSpace: 'pre-line' }}>{activeManual.body}</div>
              {activeManual.note && (
                <div style={{ marginTop: 10, background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.26)', borderRadius: 8, padding: '8px 10px', fontSize: 12, color: 'var(--yellow)' }}>
                  Nota: {activeManual.note}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
              <div style={{ border: '1px solid var(--g03)', borderRadius: 12, background: 'var(--g00)', padding: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--g04)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 9 }}>
                  Checklist rapido
                </div>
                <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(activeManualBullets.length ? activeManualBullets : activeManualLines.slice(0, 5)).map((line: string) => (
                    <li key={line} style={{ color: 'var(--g06)', fontSize: 12.5, lineHeight: 1.5 }}>{line.replace('â€¢', '').replace('•', '').trim()}</li>
                  ))}
                </ul>
              </div>

              <div style={{ border: '1px solid var(--g03)', borderRadius: 12, background: 'var(--g00)', padding: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--g04)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 9 }}>
                  Pantallazo operativo
                </div>
                <div style={{ border: '1px solid rgba(44,185,120,0.2)', borderRadius: 10, padding: 8, background: 'linear-gradient(180deg, rgba(17,24,18,0.96), rgba(11,16,13,0.96))', minHeight: 168 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.8fr', gap: 8, minHeight: 150 }}>
                    <div style={{ display: 'grid', gap: 7 }}>
                      <div style={{ borderRadius: 8, border: '1px solid rgba(44,185,120,0.2)', background: 'rgba(44,185,120,0.16)' }} />
                      <div style={{ borderRadius: 8, border: '1px solid rgba(44,185,120,0.2)', background: 'rgba(44,185,120,0.08)' }} />
                    </div>
                    <div style={{ display: 'grid', gap: 7 }}>
                      <div style={{ height: 20, borderRadius: 8, border: '1px solid rgba(44,185,120,0.22)', background: 'rgba(44,185,120,0.08)' }} />
                      <div style={{ height: 20, borderRadius: 8, border: '1px solid rgba(44,185,120,0.22)', background: 'rgba(44,185,120,0.08)' }} />
                      <div style={{ height: 20, width: '70%', borderRadius: 8, border: '1px solid rgba(44,185,120,0.22)', background: 'rgba(44,185,120,0.08)' }} />
                      <div style={{ marginTop: 'auto', height: 58, display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6 }}>
                        {[42, 58, 36, 69, 52].map((h) => (
                          <span key={h} style={{ borderRadius: 4, alignSelf: 'end', height: `${h}%`, background: 'linear-gradient(180deg, rgba(44,185,120,0.3), rgba(44,185,120,0.92))' }} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'faq' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'var(--g01)', border: '1px solid var(--g03)', borderRadius: 'var(--radius-lg)', padding: 12 }}>
            <input
              value={faqQuery}
              onChange={(e) => setFaqQuery(e.target.value)}
              placeholder="Buscar por pregunta, error, proceso o rol"
              style={{ width: '100%', background: 'var(--g00)', border: '1px solid var(--g03)', borderRadius: 8, color: 'var(--g07)', padding: '10px 12px', fontSize: 13, marginBottom: 10 }}
            />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => setOpenGroup('all')} style={{ border: `1px solid ${openGroup === 'all' ? 'rgba(44,185,120,0.42)' : 'var(--g03)'}`, background: openGroup === 'all' ? 'rgba(44,185,120,0.12)' : 'var(--g00)', color: openGroup === 'all' ? 'var(--acc)' : 'var(--g05)', borderRadius: 999, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}>
                Todos
              </button>
              {FAQ_GROUPS.map((group) => (
                <button
                  key={group.slug}
                  onClick={() => setOpenGroup(group.slug)}
                  style={{ border: `1px solid ${openGroup === group.slug ? `${group.color}66` : 'var(--g03)'}`, background: openGroup === group.slug ? `${group.color}22` : 'var(--g00)', color: openGroup === group.slug ? group.color : 'var(--g05)', borderRadius: 999, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}
                >
                  {group.role}
                </button>
              ))}
            </div>
          </div>

          {visibleFaqGroups.length === 0 && (
            <div style={{ background: 'var(--g01)', border: '1px solid var(--g03)', borderRadius: 'var(--radius-lg)', padding: 20, color: 'var(--g05)', fontSize: 13 }}>
              No hay resultados para la busqueda actual.
            </div>
          )}

          {visibleFaqGroups.map((group: any) => (
            <div key={group.slug} style={{ background: 'var(--g01)', border: `1px solid ${group.color}44`, borderRadius: 'var(--radius-lg)', padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: group.color }} />
                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--g07)' }}>{group.role}</span>
                <div style={{ flex: 1, height: 1, background: 'var(--g03)' }} />
                <span style={{ fontSize: 11, color: 'var(--g04)' }}>{group.items.length} preguntas</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {group.items.map((item: any, i: number) => {
                  const key = `${group.slug}-${i}`;
                  const isOpen = openFaq === key;
                  return (
                    <div key={key} style={{ background: 'var(--g00)', border: `1px solid ${isOpen ? `${group.color}66` : 'var(--g03)'}`, borderRadius: 10, overflow: 'hidden' }}>
                      <button
                        onClick={() => setOpenFaq(isOpen ? null : key)}
                        style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', padding: '12px 14px', textAlign: 'left', display: 'flex', justifyContent: 'space-between', gap: 10, color: 'var(--g07)', fontWeight: 600, fontSize: 13, lineHeight: 1.45 }}
                      >
                        <span>{item.q}</span>
                        <span style={{ color: 'var(--g05)' }}>{isOpen ? '-' : '+'}</span>
                      </button>
                      {isOpen && (
                        <div style={{ padding: '0 14px 12px', borderTop: '1px solid var(--g03)', color: 'var(--g05)', fontSize: 13, lineHeight: 1.7 }}>
                          {item.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'diagnostico' && (
        <div>
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={runDiag} disabled={diagRunning} style={{ justifyContent: 'center' }}>
              {diagRunning ? 'Ejecutando...' : 'Ejecutar diagnostico completo'}
            </button>
            <span style={{ fontSize: 12, color: 'var(--g04)' }}>Valida browser, CORS, MongoDB y estado del widget.</span>
          </div>

          {diagResults.length === 0 && (
            <div style={{ background: 'var(--g01)', border: '1px solid var(--g03)', borderRadius: 'var(--radius-lg)', padding: 24, color: 'var(--g05)', fontSize: 13 }}>
              Ejecuta el diagnostico para validar infraestructura, conectividad y configuracion operativa.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {diagResults.map((r, i) => (
              <div key={i} style={{ background: 'var(--g01)', border: '1px solid var(--g03)', borderRadius: 'var(--radius-lg)', padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{ minWidth: 46, height: 24, borderRadius: 999, background: `${statusColor(r.status)}22`, border: `1px solid ${statusColor(r.status)}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 10, fontWeight: 700, color: statusColor(r.status), marginTop: 2 }}>
                  {statusIcon(r.status)}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--g08)', marginBottom: 3 }}>{r.label}</div>
                  <div style={{ fontSize: 12, color: statusColor(r.status) }}>{r.detail || '-'}</div>
                </div>
              </div>
            ))}
          </div>

          {diagResults.length > 0 && (
            <div style={{ marginTop: 18, background: 'var(--g01)', border: '1px solid var(--g03)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--g06)', marginBottom: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Recomendaciones operativas
              </div>
              <ul style={{ fontSize: 12, color: 'var(--g05)', lineHeight: 1.9, paddingLeft: 16, margin: 0 }}>
                <li><strong style={{ color: 'var(--g06)' }}>Errores de modelos:</strong> clasifica por quota, api_key o model_not_found y deja evidencia por cada intento.</li>
                <li><strong style={{ color: 'var(--g06)' }}>Fallback:</strong> deja al menos un modelo alterno activo para evitar respuestas estaticas.</li>
                <li><strong style={{ color: 'var(--g06)' }}>Script embebido:</strong> valida key, agent id y token cuando el widget no levante en sitios externos.</li>
                <li><strong style={{ color: 'var(--g06)' }}>Alertamiento:</strong> configura eventos criticos para rol Operaciones y Propietario.</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {tab === 'changelog' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 }}>
          {CHANGELOG.map((v, i) => (
            <div key={i} style={{ background: 'var(--g01)', border: '1px solid var(--g03)', borderRadius: 'var(--radius-lg)', padding: '18px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontFamily: 'var(--f-mono)', fontWeight: 700, fontSize: 13, color: 'var(--acc)' }}>{v.version}</span>
                <span style={{ fontSize: 11, color: 'var(--g04)' }}>{v.date}</span>
                {v.label && (
                  <span style={{ marginLeft: 'auto', fontSize: 10, background: 'rgba(44,185,120,0.1)', color: 'var(--acc)', border: '1px solid rgba(44,185,120,0.3)', borderRadius: 20, padding: '2px 8px', fontWeight: 600 }}>
                    {v.label}
                  </span>
                )}
              </div>
              <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {v.items.map((item, j) => (
                  <li key={j} style={{ fontSize: 12.5, color: 'var(--g05)', lineHeight: 1.58 }}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
