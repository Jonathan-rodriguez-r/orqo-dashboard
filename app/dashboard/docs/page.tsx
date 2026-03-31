'use client';

import { useState, useEffect } from 'react';

type Tab = 'manual' | 'faq' | 'diagnostico' | 'changelog';

type DiagResult = {
  label: string;
  status: 'ok' | 'warn' | 'error' | 'loading';
  detail: string;
};

// ── Manual sections ────────────────────────────────────────────────────────────
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

// ── FAQ by role ────────────────────────────────────────────────────────────────
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

// ── Changelog data ────────────────────────────────────────────────────────────
const CHANGELOG = [
  {
    version: 'v1.4',
    date: 'Mar 2026',
    label: 'Actual',
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
  const [diagResults, setDiagResults] = useState<DiagResult[]>([]);
  const [diagRunning, setDiagRunning] = useState(false);
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [openGroup, setOpenGroup] = useState<string>('owner');

  async function runDiag() {
    setDiagRunning(true);
    const results: DiagResult[] = [
      { label: 'API pública (CORS + respuesta)', status: 'loading', detail: '' },
      { label: 'Config en MongoDB', status: 'loading', detail: '' },
      { label: 'Widget activo', status: 'loading', detail: '' },
      { label: 'Endpoint privado (auth)', status: 'loading', detail: '' },
    ];
    setDiagResults([...results]);

    try {
      const t0 = Date.now();
      const res = await fetch('/api/public/widget', { cache: 'no-store' });
      const ms = Date.now() - t0;
      if (res.ok) {
        const data = await res.json();
        results[0] = { label: results[0].label, status: 'ok', detail: `HTTP 200 en ${ms}ms · CORS OK` };
        if (data._defaults) {
          results[1] = { label: results[1].label, status: 'warn', detail: 'No hay config guardada — sirviendo defaults. Guarda cambios en Widget.' };
        } else {
          results[1] = { label: results[1].label, status: 'ok', detail: `Config encontrada · title: "${data.title ?? '?'}" · updatedAt: ${data.updatedAt ? new Date(data.updatedAt).toLocaleString('es') : '?'}` };
        }
        if (data.active === false) {
          results[2] = { label: results[2].label, status: 'warn', detail: 'Widget marcado como INACTIVO. No se mostrará en orqo.io.' };
        } else {
          results[2] = { label: results[2].label, status: 'ok', detail: 'Widget activo — visible en orqo.io' };
        }
      } else {
        results[0] = { label: results[0].label, status: 'error', detail: `HTTP ${res.status}` };
        results[1] = { label: results[1].label, status: 'error', detail: 'No se pudo leer la config (API falló)' };
        results[2] = { label: results[2].label, status: 'error', detail: 'No se pudo verificar' };
      }
    } catch (e: any) {
      results[0] = { label: results[0].label, status: 'error', detail: `Error de red: ${e.message}. Posible CORS bloqueado.` };
      results[1] = { label: results[1].label, status: 'error', detail: 'No se pudo leer (API inaccesible)' };
      results[2] = { label: results[2].label, status: 'error', detail: 'No se pudo verificar' };
    }

    try {
      const res = await fetch('/api/config/widget', { cache: 'no-store' });
      if (res.ok) {
        results[3] = { label: results[3].label, status: 'ok', detail: `HTTP ${res.status} — sesión activa y MongoDB responde` };
      } else {
        results[3] = { label: results[3].label, status: 'warn', detail: `HTTP ${res.status}` };
      }
    } catch (e: any) {
      results[3] = { label: results[3].label, status: 'error', detail: `Error: ${e.message}` };
    }

    setDiagResults([...results]);
    setDiagRunning(false);
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'manual',      label: 'Manual' },
    { id: 'faq',         label: 'FAQ por rol' },
    { id: 'diagnostico', label: 'Diagnóstico' },
    { id: 'changelog',   label: 'Changelog' },
  ];

  const statusColor = (s: DiagResult['status']) =>
    s === 'ok' ? 'var(--acc)' : s === 'warn' ? 'var(--yellow)' : s === 'error' ? 'var(--red)' : 'var(--g05)';
  const statusIcon = (s: DiagResult['status']) =>
    s === 'ok' ? '✓' : s === 'warn' ? '⚠' : s === 'error' ? '✕' : '…';

  return (
    <div className="dash-content" style={{ maxWidth: 860 }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--f-disp)', fontWeight: 800, fontSize: 22, color: 'var(--g08)', letterSpacing: '-0.3px' }}>
          Centro de ayuda
        </div>
        <div style={{ color: 'var(--g05)', fontSize: 13, marginTop: 4 }}>
          Manual · FAQ por rol · Diagnóstico · Changelog
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--g03)', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '8px 16px', fontSize: 13, fontWeight: 600,
              color: tab === t.id ? 'var(--acc)' : 'var(--g05)',
              borderBottom: tab === t.id ? '2px solid var(--acc)' : '2px solid transparent',
              marginBottom: -1, transition: 'color 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── MANUAL ── */}
      {tab === 'manual' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {MANUAL.map((step, i) => (
            <div key={i} style={{ background: 'var(--g01)', border: '1px solid var(--g03)', borderRadius: 'var(--radius-lg)', padding: '20px 24px' }}>
              <div style={{ fontWeight: 700, color: 'var(--g08)', fontSize: 14, marginBottom: 8 }}>{step.title}</div>
              <div style={{ color: 'var(--g05)', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-line' }}>{step.body}</div>
              {step.note && (
                <div style={{ marginTop: 10, background: 'rgba(250,204,21,0.06)', border: '1px solid rgba(250,204,21,0.25)', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: 'var(--yellow)' }}>
                  ⚠ {step.note}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── FAQ POR ROL ── */}
      {tab === 'faq' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {FAQ_GROUPS.map((group) => (
            <div key={group.slug}>
              {/* Group header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: group.color, flexShrink: 0 }} />
                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--g07)' }}>{group.role}</span>
                <div style={{ flex: 1, height: 1, background: 'var(--g03)' }} />
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--g04)', letterSpacing: '0.08em' }}>{group.slug}</span>
              </div>

              {/* Questions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {group.items.map((item, i) => {
                  const key = `${group.slug}-${i}`;
                  const isOpen = openFaq === key;
                  return (
                    <div key={key} style={{ background: 'var(--g01)', border: `1px solid ${isOpen ? group.color + '44' : 'var(--g03)'}`, borderRadius: 10, overflow: 'hidden', transition: 'border-color 0.15s' }}>
                      <button
                        onClick={() => setOpenFaq(isOpen ? null : key)}
                        style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '13px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, textAlign: 'left' }}
                      >
                        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--g07)', lineHeight: 1.4 }}>{item.q}</span>
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: 'var(--g05)' }}>
                          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      {isOpen && (
                        <div style={{ padding: '0 16px 14px', fontSize: 13, color: 'var(--g05)', lineHeight: 1.7, borderTop: '1px solid var(--g03)' }}>
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

      {/* ── DIAGNÓSTICO ── */}
      {tab === 'diagnostico' && (
        <div>
          <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn btn-primary" onClick={runDiag} disabled={diagRunning} style={{ justifyContent: 'center' }}>
              {diagRunning ? 'Ejecutando…' : 'Ejecutar diagnóstico'}
            </button>
            <span style={{ fontSize: 12, color: 'var(--g04)' }}>Verifica conectividad, CORS, MongoDB y estado del widget</span>
          </div>

          {diagResults.length === 0 && (
            <div style={{ background: 'var(--g01)', border: '1px solid var(--g03)', borderRadius: 'var(--radius-lg)', padding: 24, color: 'var(--g05)', fontSize: 13 }}>
              Pulsa "Ejecutar diagnóstico" para verificar el estado del sistema.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {diagResults.map((r, i) => (
              <div key={i} style={{ background: 'var(--g01)', border: '1px solid var(--g03)', borderRadius: 'var(--radius-lg)', padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: `${statusColor(r.status)}22`, border: `1px solid ${statusColor(r.status)}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, fontWeight: 700, color: statusColor(r.status) }}>
                  {statusIcon(r.status)}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--g08)', marginBottom: 3 }}>{r.label}</div>
                  <div style={{ fontSize: 12, color: statusColor(r.status) }}>{r.detail || '—'}</div>
                </div>
              </div>
            ))}
          </div>

          {diagResults.length > 0 && (
            <div style={{ marginTop: 20, background: 'var(--g01)', border: '1px solid var(--g03)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
              <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--g06)', marginBottom: 10 }}>Causas comunes de error</div>
              <ul style={{ fontSize: 12, color: 'var(--g05)', lineHeight: 2, paddingLeft: 16, margin: 0 }}>
                <li><strong style={{ color: 'var(--g06)' }}>CORS 307:</strong> /api/public/widget no está en la lista PUBLIC del middleware (proxy.ts)</li>
                <li><strong style={{ color: 'var(--g06)' }}>Config defaults:</strong> No se ha guardado config o MongoDB no puede escribir. Revisa MONGODB_URI en Vercel.</li>
                <li><strong style={{ color: 'var(--g06)' }}>Widget inactivo:</strong> El switch de activo/inactivo en Configuración → Widget está en OFF.</li>
                <li><strong style={{ color: 'var(--g06)' }}>Theme override:</strong> Si los colores no cambian con el tema, verifica que no haya inline styles sobreescribiendo CSS.</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── CHANGELOG ── */}
      {tab === 'changelog' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {CHANGELOG.map((v, i) => (
            <div key={i} style={{ background: 'var(--g01)', border: '1px solid var(--g03)', borderRadius: 'var(--radius-lg)', padding: '18px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontFamily: 'var(--f-mono)', fontWeight: 700, fontSize: 13, color: 'var(--acc)' }}>{v.version}</span>
                <span style={{ fontSize: 11, color: 'var(--g04)' }}>{v.date}</span>
                {v.label && (
                  <span style={{ fontSize: 10, background: 'rgba(44,185,120,0.1)', color: 'var(--acc)', border: '1px solid rgba(44,185,120,0.3)', borderRadius: 20, padding: '2px 8px', fontWeight: 600 }}>
                    {v.label}
                  </span>
                )}
              </div>
              <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 5 }}>
                {v.items.map((item, j) => (
                  <li key={j} style={{ fontSize: 12.5, color: 'var(--g05)', lineHeight: 1.55 }}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
