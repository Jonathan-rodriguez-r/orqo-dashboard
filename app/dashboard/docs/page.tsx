'use client';

import { useMemo, useState } from 'react';

type Tab = 'manual' | 'faq' | 'diagnostico' | 'changelog';

type DiagResult = {
  label: string;
  status: 'ok' | 'warn' | 'error' | 'loading';
  detail: string;
};

// Ã¢â€â‚¬Ã¢â€â‚¬ Manual sections Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
const MANUAL = [
  {
    title: '1. Primeros pasos — configura tu espacio de trabajo',
    body: 'Al iniciar sesión por primera vez, tu cuenta se crea automáticamente como Propietario con acceso total. Desde Configuración → Accesos puedes invitar colaboradores asignándoles un rol antes de enviar la invitación.\n\nEl primer paso recomendado es ir a Configuración → Widget para personalizar el asistente antes de instalarlo en tu sitio.',
    note: 'El enlace de invitación es válido 72 horas. Si expira, el administrador puede reenviar una nueva invitación desde la misma pantalla.',
  },
  {
    title: '2. Instala el widget en tu sitio web',
    body: 'WordPress / WooCommerce: ve a Plugins → Añadir nuevo, busca "ORQO", instala y activa. Copia el token de Configuración → Integraciones → WordPress y pégalo en Ajustes → ORQO.\n\nCualquier sitio web: ve a Configuración → Integraciones → Código de integración. Copia el snippet de una línea y pégalo antes del </body> de tu HTML. El widget cargará la configuración del dashboard en tiempo real.',
    note: 'El widget solo se muestra si el switch "Widget activo" está en ON en Configuración → Widget.',
  },
  {
    title: '3. Personaliza el widget',
    body: 'En Configuración → Widget puedes cambiar:\n• Nombre y subtítulo del asistente\n• Colores de acento y fondo\n• Icono (10 presets o foto de agente real)\n• Posición en pantalla (5 opciones)\n• Tipografía y radio de bordes\n• Límite de interacciones por sesión\n• Artículos de ayuda (hasta 6, con título y URL)\n• Mensaje de bienvenida y placeholder\n\nGuarda los cambios y presiona "Guardar y abrir" para ver la vista previa en orqo.io.',
  },
  {
    title: '4. Conecta WhatsApp Business',
    body: 'Ve a Configuración → Integraciones → WhatsApp Business. Haz clic en "Conectar número" e inicia sesión con tu cuenta Meta Business. Selecciona o registra el número, verifica con SMS/voz y configura el mensaje de bienvenida.\n\nUna vez conectado, las conversaciones de WhatsApp aparecerán en la sección Conversaciones con el ícono de WhatsApp.',
    note: 'Si el número ya está en la app de WhatsApp Business (no API), debes desvincularlo antes de conectarlo. Este proceso elimina el historial previo del número.',
  },
  {
    title: '5. Crea y activa agentes IA',
    body: 'Ve a Agentes → Nuevo agente. Define:\n• Objetivo en lenguaje natural (ej: "Atiende consultas de soporte sobre pedidos en WooCommerce")\n• Proveedor de IA y modelo (Anthropic, OpenAI, Google)\n• Skills disponibles (máx. 8 por agente)\n• Canales donde debe operar (Widget, WhatsApp, Instagram, etc.)\n\nActívalo con el switch. El agente comenzará a responder en los canales seleccionados de inmediato.',
  },
  {
    title: '6. Gestiona conversaciones',
    body: 'En Conversaciones puedes ver el historial completo de interacciones. Cada fila muestra:\n• Canal de origen (WhatsApp, Instagram, Widget web, etc.)\n• Modelo de IA que atendió la conversación\n• Tokens estimados (total · ↑ entrada · ↓ salida)\n• ID único de conversación (útil para auditorías)\n• Duración y número de mensajes\n\nUsa los filtros por canal, estado, modelo y búsqueda de texto para encontrar conversaciones específicas.',
  },
  {
    title: '7. Analiza el rendimiento en Informes',
    body: 'La sección Informes muestra métricas de rendimiento con selector de período (7, 30 o 90 días):\n• Tasa de resolución (conversaciones cerradas sin escalar)\n• Tasa de desvío a humano\n• Tiempo promedio de respuesta\n• Estimación de ROI (horas de trabajo ahorradas)\n• Tabla de rendimiento diario\n\nLa Vista General muestra las métricas más importantes en gráficas interactivas: tendencia diaria, distribución por canal y horas pico.',
  },
  {
    title: '8. Gestiona el equipo (Propietarios y Administradores)',
    body: 'En Configuración → Accesos puedes:\n• Invitar usuarios ingresando su correo y asignando un rol\n• Cambiar el rol o nombre de un usuario existente\n• Eliminar accesos (no puedes eliminarte a ti mismo)\n\nEn Configuración → Roles puedes ver los permisos de cada rol y modificar los roles personalizados. Los roles del sistema (Propietario, Administrador, Analista, Observador, Operaciones, Gestor de Agentes) no se pueden eliminar.',
  },
  {
    title: '9. Auditoría y logs del sistema',
    body: 'La sección Logs & Auditoría (visible solo para roles con permiso admin.logs) muestra un registro completo de todas las acciones del sistema:\n• Inicios de sesión exitosos y fallidos\n• Invitaciones y cambios de usuario\n• Modificaciones de roles y permisos\n• Intentos de acceso no autorizados\n• Errores del sistema\n\nPuedes filtrar por nivel (INFO/WARN/ERROR/FATAL), categoría, fecha y buscar por texto. Cada entrada es expandible para ver los datos completos incluyendo antes/después de cambios.',
    note: 'Los logs se retienen según la variable de entorno LOG_RETENTION_DAYS (por defecto 90 días). Se eliminan automáticamente al vencer.',
  },
  {
    title: '10. Diagnóstico del sistema',
    body: 'En el tab Diagnóstico de esta misma sección puedes verificar:\n• Estado de la API pública del widget (CORS)\n• Si hay configuración guardada en MongoDB\n• Si el widget está activo\n• Si el endpoint privado responde (sesión activa)\n\nUsa esta herramienta si el widget no aparece en tu sitio o si ves comportamientos inesperados.',
  },
];

// Ã¢â€â‚¬Ã¢â€â‚¬ FAQ by role Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
const FAQ_GROUPS = [
  {
    role: 'Propietario',
    slug: 'owner',
    color: '#2CB978',
    items: [
      {
        q: '¿Qué puede hacer el Propietario que los demás no pueden?',
        a: 'El Propietario tiene acceso total al sistema, incluyendo facturación, asignación del rol "Propietario" a otros usuarios, y eliminación de cualquier tipo de cuenta. Solo el Propietario puede modificar el rol owner en la sección de Roles.',
      },
      {
        q: '¿Cómo invito al primer colaborador?',
        a: 'Ve a Configuración → Accesos → Invitar usuario. Ingresa el correo, selecciona el rol y haz clic en Invitar. Se enviará un correo con un enlace de activación válido 72 horas. El enlace también aparece en pantalla para que lo copies manualmente si el correo tarda.',
      },
      {
        q: '¿Puedo cambiar mi propio rol?',
        a: 'No. El sistema impide que cambies tu propio rol para evitar que el Propietario se bloquee el acceso accidentalmente. Si necesitas cambiar tu rol, otro Propietario debe hacerlo.',
      },
      {
        q: '¿Los logs de auditoría son permanentes?',
        a: 'No, los logs tienen un tiempo de retención configurable (variable LOG_RETENTION_DAYS, por defecto 90 días). Se eliminan automáticamente de MongoDB cuando vence su fecha de expiración. Para retención permanente, aumenta este valor antes de desplegar.',
      },
    ],
  },
  {
    role: 'Administrador',
    slug: 'admin',
    color: '#60A5FA',
    items: [
      {
        q: '¿Qué no puede hacer el Administrador?',
        a: 'El Administrador no puede: acceder a Facturación, crear/eliminar roles del sistema, ni asignar el rol de Propietario. Tiene acceso total al resto del sistema incluyendo gestión de usuarios, agentes, configuración del widget e integraciones.',
      },
      {
        q: '¿Puedo modificar los permisos de un rol del sistema?',
        a: 'Solo si eres Propietario o si tienes el permiso "settings.roles". Los Administradores normalmente no tienen este permiso por defecto. Para cambiar esto, el Propietario debe modificar el rol admin en Configuración → Roles.',
      },
      {
        q: '¿Cómo creo un rol personalizado?',
        a: 'Ve a Configuración → Roles → Nuevo rol. Define un nombre, ID (slug) y descripción. Luego asigna los permisos específicos usando las casillas por módulo. Los roles personalizados se pueden eliminar, los del sistema no.',
      },
      {
        q: '¿El Administrador puede ver los logs de auditoría?',
        a: 'Sí, por defecto el rol admin incluye el permiso "admin.logs" que da acceso a Logs & Auditoría. Si este permiso fue removido manualmente, el Propietario debe restaurarlo en Configuración → Roles.',
      },
    ],
  },
  {
    role: 'Analista',
    slug: 'analyst',
    color: '#A78BFA',
    items: [
      {
        q: '¿Qué puede ver el Analista?',
        a: 'El Analista tiene acceso de solo lectura a Conversaciones e Informes. Puede ver métricas, gráficas y tablas de rendimiento, pero no puede modificar configuraciones, agentes ni usuarios.',
      },
      {
        q: '¿El Analista puede exportar datos?',
        a: 'Depende de la configuración. El permiso "conversations.export" permite descargar conversaciones. Por defecto el rol Analista incluye este permiso. El Propietario o Administrador puede quitarlo en Configuración → Roles si es necesario restringir las exportaciones.',
      },
      {
        q: '¿Por qué no veo la sección de Configuración?',
        a: 'El rol Analista no incluye permisos de Configuración. Si necesitas acceso a alguna configuración específica, solicita al Administrador que cambie tu rol o cree un rol personalizado con los permisos necesarios.',
      },
      {
        q: '¿Puedo filtrar conversaciones por modelo de IA?',
        a: 'Sí. En la sección Conversaciones usa el filtro "Modelo" para ver solo las conversaciones atendidas por un modelo específico (Claude Sonnet, GPT-4o, Gemini, etc.). También puedes buscar por texto, canal, estado y fecha.',
      },
    ],
  },
  {
    role: 'Observador',
    slug: 'viewer',
    color: '#94A3B8',
    items: [
      {
        q: '¿Qué puede ver el Observador?',
        a: 'El Observador tiene acceso de solo lectura al Dashboard (Vista General) y a las Conversaciones. No puede ver Informes, Agentes, Configuración ni Logs. Es el rol con menos privilegios del sistema.',
      },
      {
        q: '¿Por qué no puedo ver Informes ni Agentes?',
        a: 'El rol Observador está diseñado para personas que solo necesitan monitorear el estado general sin acceso a configuraciones ni análisis detallados. Solicita al Administrador que te asigne el rol Analista si necesitas ver informes.',
      },
      {
        q: '¿Puedo exportar conversaciones como Observador?',
        a: 'No. El rol Observador solo tiene "dashboard.view" y "conversations.view". La exportación requiere el permiso "conversations.export" que pertenece al Analista o roles superiores.',
      },
    ],
  },
  {
    role: 'Operaciones e Infraestructura',
    slug: 'operations',
    color: '#FB923C',
    items: [
      {
        q: '¿Cuál es el enfoque del rol Operaciones?',
        a: 'Operaciones está diseñado para personal técnico que gestiona integraciones, canales y configuración operativa del sistema, sin necesidad de acceder a análisis de negocio ni gestión de usuarios. Incluye permisos sobre Widget, Integraciones y Agentes.',
      },
      {
        q: '¿El rol Operaciones puede conectar integraciones (WhatsApp, WordPress, etc.)?',
        a: 'Sí, el permiso "settings.integrations" permite conectar y configurar todos los canales disponibles. Si este permiso no aparece habilitado, el Propietario debe habilitarlo en Configuración → Roles → operations.',
      },
      {
        q: '¿Operaciones puede crear o eliminar agentes?',
        a: 'Sí, con el permiso "agents.manage" que viene incluido en este rol. Puede crear, editar, activar y desactivar agentes. No puede ver los Informes de rendimiento ni gestionar usuarios.',
      },
      {
        q: '¿Por qué el equipo de infraestructura debería usar este rol y no admin?',
        a: 'El principio de mínimo privilegio reduce el riesgo. El rol Operaciones da acceso solo a lo que necesita el equipo técnico (integraciones, agentes, widget) sin exponer datos sensibles de negocio, usuarios o facturación.',
      },
    ],
  },
];

// Ã¢â€â‚¬Ã¢â€â‚¬ Changelog data Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
const CHANGELOG = [
  {
    version: 'v1.8',
    date: 'Abr 2026',
    label: 'Actual',
    items: [
      'Dashboard conectado al motor de agentes — nuevo cliente HTTP tipado hacia orqo-core Management API (10s timeout, autenticacion interna)',
      'Provisioning de workspace en un clic — sección "Motor de Agentes" en Configuracion: provisiona, muestra API key una sola vez y confirma estado del motor',
      'Gestión de servidores MCP — UI completa para agregar, activar/desactivar y eliminar integraciones por workspace (WooCommerce, Shopify, Odoo, REST, custom)',
      'Catálogo visual de conectores — grid con templates disponibles, descripcion, tools incluidas y modal de credenciales por tipo',
      'Navegación directa — entrada "MCP / Integraciones" en sidebar (permiso settings.integrations)',
      'Fallback seguro — catalogo se sirve desde copia estatica embebida si el core no esta disponible',
    ],
  },
  {
    version: 'v1.7',
    date: 'Mar 2026',
    label: null,
    items: [
      'Centro de ayuda redisenado con manual guiado y experiencia de lectura ampliada',
      'FAQ por rol ahora incluye buscador y filtros para resolver incidencias mas rapido',
      'Diagnostico mezcla checks locales del navegador con checks de servidor en una sola corrida',
      'Se agrego una vista operativa interactiva para entrenar equipos de onboarding',
      'Landing publica ahora incluye seccion dedicada de manual + FAQ para clientes nuevos',
    ],
  },
  {
    version: 'v1.4',
    date: 'Mar 2026',
    label: null,
    items: [
      'Agentes: arquitectura Master-Detail — lista lateral de agentes + panel de configuración con 4 bloques (Identidad, Canales, Skills, Avanzado)',
      'Agentes: simulador de chat (Vista Previa) con conversación mock adaptada al perfil y personalidad del agente',
      'Agentes: soporte multi-agente real con CRUD completo persistido en MongoDB (colección agents_v2)',
      'Orquestación IA: nueva sección en Configuración para gestionar proveedores (OpenAI, Anthropic, Google, Grok), límites de tokens y estrategia multi-modelo',
      'API /api/agents (GET/POST) y /api/agents/[id] (GET/PATCH/DELETE) — schema multi-tenant por workspaceId',
      'API /api/settings/workspace (GET/PUT) — configuración global de workspace (proveedores, orquestación, tokens)',
      'Canales: 6 canales configurables por agente (WhatsApp, Instagram, Messenger, Web Widget, WooCommerce, Shopify)',
      'Skills: sistema de capacidades por agente con máximo 8 skills, agrupadas por categoría',
      'Avanzado: zona horaria, horarios de atención, geocercas y configuración de escalamiento por agente',
      'Topbar: eliminado botón de Asistente; Feedback eliminado del menú lateral',
      'Sidebar: nuevo ítem "Orquestación IA" en sección Sistema con icono de IA',
    ],
  },
  {
    version: 'v1.3',
    date: 'Mar 2026',
    label: null,
    items: [
      'Cuenta: logo del cliente en la barra lateral (upload por archivo ≤512KB o URL), nombre del dashboard personalizable',
      'Cuenta: campos adicionales — industria, teléfono, dirección, email de soporte',
      'Centro de ayuda: manual completo (10 secciones), FAQ agrupado por rol (Propietario/Admin/Analista/Observador/Operaciones)',
      'Centro de ayuda: changelog siempre actualizado; tab "Logs" eliminado (reemplazado por sección dedicada)',
      'Logs & Auditoría: error 403 muestra aviso claro con link de re-login (sesión anterior sin permiso admin.logs)',
      'Seed: genera 25 entradas demo de audit_logs con todas las categorías y niveles para visualización inmediata',
      'Fix: changelog e identidad de marca en orqo.io ahora siguen preferencia dark/light del usuario (localStorage)',
    ],
  },
  {
    version: 'v1.2',
    date: 'Mar 2026',
    label: null,
    items: [
      'Sistema de observabilidad y auditoría completo — audit_logs con TTL en MongoDB',
      'Logs & Auditoría: UI con filtros combinables (nivel, categoría, fecha, texto), acordeón expandible con JSON before/after',
      'LoggerService centralizado (lib/logger.ts) — schema ECS-inspired con correlationId, severity, actor/target, diff',
      'Auto-log de todos los eventos: inicios de sesión, invitaciones, cambios de usuario/rol, intentos no autorizados',
      'Conversaciones: columna de Modelo (badge por proveedor), Tokens (↑/↓), ID de conversación, duración',
      'Datos de demostración enriquecidos: 60 conversaciones con modelos variados (Claude, GPT-4o, Gemini)',
      'Fix: empty state en Vista General, Informes y Conversaciones ya muestra el botón de datos demo',
      'Fix: correo no autorizado muestra "No autorizado" con log de seguridad WARN/HIGH',
      'Roles del sistema protegidos de eliminación: owner, admin, analyst, agent_manager, viewer, operations',
      'Link de activación copiable en pantalla al invitar usuario (además del correo)',
    ],
  },
  {
    version: 'v1.1',
    date: 'Mar 2026',
    label: null,
    items: [
      'Google OAuth 2.0 (SSO) — inicio de sesión con cuenta Google via Authorization Code Flow',
      'JWT con permisos embebidos — SessionPayload con sub, email, role, permissions[], jti, provider',
      'UI Enterprise de Login — Google SSO como primario + magic link en acordeón',
      'RBAC completo: 15 módulos, 5 roles predeterminados, Edge Middleware sub-ms en Vercel',
      'PermissionGate + usePermissions — componente y hook para UI reactiva por permisos',
      'API RBAC: GET/POST/DELETE /api/users, GET/PATCH /api/roles, POST /api/seed/rbac',
      'Tabla de usuarios con avatar Google, badge de rol y último acceso',
    ],
  },
  {
    version: 'v1.0',
    date: 'Mar 2026',
    label: null,
    items: [
      'Dashboard Mobile-First — sidebar off-canvas con hamburguesa, overlay y animación fluida',
      'Vista General con métricas de ROI — AreaChart, PieChart, BarChart con recharts',
      'Página de Informes — análisis de rendimiento con selector de período (7/30/90 días)',
      'Configuración consolidada — 4 pestañas: Widget, Integraciones, Accesos y Cuenta',
      'Catálogo de integraciones MCP — Meta, bases de datos, fuentes de datos y sistemas core',
      'Iconos de canal en Conversaciones — filtros en pills por WhatsApp, Instagram, FB, etc.',
      'MongoDB analytics_daily + seed de 30 días y 60 conversaciones mock',
      'API /api/analytics con agregación de totales, tendencia y distribución por canal',
    ],
  },
  {
    version: 'v0.9',
    date: 'Mar 2026',
    label: null,
    items: [
      'Fix CORS: /api/public/widget exento del middleware de auth (307 → 200)',
      'Fix tema claro/oscuro: inyección de <style> en lugar de inline styles',
      'Posiciones arriba-centro y abajo-centro en el widget',
      'Contador de interacciones actualizado desde config de API',
      'Logs de actividad en activity_logs (MongoDB)',
      'Centro de ayuda & Diagnóstico en dashboard',
      'Landing: sección Implementación en 3 pasos y Perfiles & Skills',
    ],
  },
  {
    version: 'v0.8',
    date: 'Feb 2026',
    label: null,
    items: [
      'Widget embebible: widget.js + API key + endpoint /api/public/widget',
      'Sección Integraciones con código embed y botón copiar',
      'Página de identidad de marca adaptada con nav/footer',
      'Footer consistente en login, index y manual de marca',
      'Email actualizado a hello@orqo.io',
    ],
  },
  {
    version: 'v0.7',
    date: 'Feb 2026',
    label: null,
    items: [
      'Dashboard widget: preview dark/light, posición como select',
      'Favicon presets: 10 iconos SVG seleccionables',
      'Fotos de agente: 8 retratos reales (randomuser.me)',
      'Opacidad de ventana y botón configurables',
      'Fuente y radio de bordes personalizables',
    ],
  },
  {
    version: 'v0.6',
    date: 'Ene 2026',
    label: null,
    items: [
      'Auth magic link con JWT y Resend',
      'Middleware de sesión (proxy.ts)',
      'Timeout de sesión 5 min con aviso',
      'Lista de usuarios con acceso al dashboard',
      'Captcha matemático en login',
    ],
  },
  {
    version: 'v0.5',
    date: 'Ene 2026',
    label: null,
    items: [
      'Proyecto inicial Next.js + MongoDB Atlas',
      'Widget de chat ORQO en landing page',
      'Dashboard básico con sidebar',
      'Sección hero y ticker en landing',
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
  const activeManualBullets = activeManualLines.filter((line: string) => line.startsWith('•') || line.startsWith('•'));

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
    <div className="dash-content">
      <div className="page-header">
        <h1 className="page-title">Centro de ayuda</h1>
        <p className="page-sub">
          Manual ampliado, FAQ util por rol, diagnostico operativo y changelog consolidado para un uso empresarial.
        </p>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
              <div style={{ border: '1px solid var(--g03)', borderRadius: 12, background: 'var(--g00)', padding: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--g04)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 9 }}>
                  Checklist rapido
                </div>
                <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(activeManualBullets.length ? activeManualBullets : activeManualLines.slice(0, 5)).map((line: string) => (
                    <li key={line} style={{ color: 'var(--g06)', fontSize: 12.5, lineHeight: 1.5 }}>{line.replace('•', '').trim()}</li>
                  ))}
                </ul>
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
