/**
 * RBAC — Role-Based Access Control
 *
 * Single source of truth for system modules, default roles and permission helpers.
 * Used by:
 *   - seed route  → writes to MongoDB
 *   - proxy.ts    → route-level check (Edge, no DB)
 *   - API routes  → server-side guards
 *   - hooks/usePermissions → client-side UI guards
 */

// ─── Permission strings ────────────────────────────────────────────────────────

export const PERMISSIONS = {
  // General
  DASHBOARD_VIEW: 'dashboard.view',

  // Conversations
  CONV_VIEW:   'conversations.view',
  CONV_EXPORT: 'conversations.export',
  CONV_DELETE: 'conversations.delete',

  // Agents
  AGENTS_VIEW:   'agents.view',
  AGENTS_MANAGE: 'agents.manage',

  // Reports
  REPORTS_VIEW:   'reports.view',
  REPORTS_EXPORT: 'reports.export',

  // Settings
  SETTINGS_WIDGET:       'settings.widget',
  SETTINGS_INTEGRATIONS: 'settings.integrations',
  SETTINGS_USERS:        'settings.users',
  SETTINGS_ROLES:        'settings.roles',
  SETTINGS_BILLING:      'settings.billing',

  // Admin
  ADMIN_LOGS: 'admin.logs',
  ADMIN_SEED: 'admin.seed',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ─── System modules catalog (seeded to DB) ────────────────────────────────────

export type SystemModule = {
  slug: Permission;
  label: string;
  description: string;
  group: string;
};

export const SYSTEM_MODULES: SystemModule[] = [
  { slug: 'dashboard.view',         label: 'Ver Dashboard',           description: 'Acceso a la página principal con métricas',            group: 'Dashboard' },
  { slug: 'conversations.view',     label: 'Ver Conversaciones',      description: 'Listar y leer conversaciones',                         group: 'Conversaciones' },
  { slug: 'conversations.export',   label: 'Exportar Conversaciones', description: 'Descargar conversaciones en CSV/JSON',                  group: 'Conversaciones' },
  { slug: 'conversations.delete',   label: 'Eliminar Conversaciones', description: 'Borrar conversaciones permanentemente',                 group: 'Conversaciones' },
  { slug: 'agents.view',            label: 'Ver Agentes',             description: 'Listar agentes configurados',                           group: 'Agentes' },
  { slug: 'agents.manage',          label: 'Gestionar Agentes',       description: 'Crear, editar y desactivar agentes',                    group: 'Agentes' },
  { slug: 'reports.view',           label: 'Ver Informes',            description: 'Acceder a análisis y métricas de rendimiento',          group: 'Informes' },
  { slug: 'reports.export',         label: 'Exportar Informes',       description: 'Descargar reportes en PDF/Excel',                      group: 'Informes' },
  { slug: 'settings.widget',        label: 'Widget',                  description: 'Configurar apariencia y comportamiento del widget',     group: 'Configuración' },
  { slug: 'settings.integrations',  label: 'Integraciones',           description: 'Conectar canales, CRMs y fuentes de datos',            group: 'Configuración' },
  { slug: 'settings.users',         label: 'Usuarios',                description: 'Invitar y gestionar miembros del equipo',              group: 'Configuración' },
  { slug: 'settings.roles',         label: 'Roles y Permisos',        description: 'Crear y modificar roles',                              group: 'Configuración' },
  { slug: 'settings.billing',       label: 'Facturación',             description: 'Plan, pagos y datos de facturación',                   group: 'Configuración' },
  { slug: 'admin.logs',             label: 'Logs de Sistema',         description: 'Ver registros de actividad y auditoría',               group: 'Admin' },
  { slug: 'admin.seed',             label: 'Datos de Prueba',         description: 'Ejecutar seed de datos de demostración',               group: 'Admin' },
];

// ─── Default roles ─────────────────────────────────────────────────────────────

export type RoleDefinition = {
  slug: string;
  label: string;
  description: string;
  permissions: Permission[];
};

const ALL: Permission[] = SYSTEM_MODULES.map(m => m.slug);

export const DEFAULT_ROLES: RoleDefinition[] = [
  {
    slug: 'owner',
    label: 'Propietario',
    description: 'Acceso total — propietario de la cuenta',
    permissions: ALL,
  },
  {
    slug: 'admin',
    label: 'Administrador',
    description: 'Acceso completo excepto facturación y roles',
    permissions: ALL.filter(p => !['settings.billing', 'settings.roles'].includes(p)),
  },
  {
    slug: 'analyst',
    label: 'Analista',
    description: 'Lectura de conversaciones e informes, sin gestión',
    permissions: [
      'dashboard.view',
      'conversations.view',
      'conversations.export',
      'reports.view',
      'reports.export',
    ],
  },
  {
    slug: 'agent_manager',
    label: 'Gestor de Agentes',
    description: 'Gestiona agentes y revisa conversaciones',
    permissions: [
      'dashboard.view',
      'conversations.view',
      'agents.view',
      'agents.manage',
    ],
  },
  {
    slug: 'viewer',
    label: 'Observador',
    description: 'Solo lectura del dashboard y conversaciones',
    permissions: [
      'dashboard.view',
      'conversations.view',
      'reports.view',
    ],
  },
];

// ─── Permission helpers ────────────────────────────────────────────────────────

/** Check if a permission list includes the required permission */
export function hasPermission(
  userPermissions: string[],
  required: Permission
): boolean {
  return userPermissions.includes(required);
}

/** Check if all required permissions are present */
export function hasAllPermissions(
  userPermissions: string[],
  required: Permission[]
): boolean {
  return required.every(p => userPermissions.includes(p));
}

/** Check if at least one required permission is present */
export function hasAnyPermission(
  userPermissions: string[],
  required: Permission[]
): boolean {
  return required.some(p => userPermissions.includes(p));
}

/** Get permissions for a role slug (from default roles — works without DB) */
export function getDefaultPermissions(roleSlug: string): Permission[] {
  return DEFAULT_ROLES.find(r => r.slug === roleSlug)?.permissions ?? ['dashboard.view'];
}

// ─── Route → required permission map (used in proxy.ts) ───────────────────────

export const ROUTE_PERMISSIONS: Array<{ pattern: RegExp; permission: Permission }> = [
  { pattern: /^\/dashboard\/settings\/roles/,        permission: 'settings.roles' },
  { pattern: /^\/dashboard\/settings\/billing/,      permission: 'settings.billing' },
  { pattern: /^\/dashboard\/settings\/users/,        permission: 'settings.users' },
  { pattern: /^\/dashboard\/settings\/integrations/, permission: 'settings.integrations' },
  { pattern: /^\/dashboard\/settings/,               permission: 'settings.widget' },
  { pattern: /^\/dashboard\/logs/,                   permission: 'admin.logs' },
  { pattern: /^\/dashboard\/reports/,                permission: 'reports.view' },
  { pattern: /^\/dashboard\/agents/,                 permission: 'agents.view' },
  { pattern: /^\/dashboard\/conversations/,          permission: 'conversations.view' },
  { pattern: /^\/dashboard/,                         permission: 'dashboard.view' },
  { pattern: /^\/api\/logs/,                         permission: 'admin.logs' },
  { pattern: /^\/api\/analytics/,                    permission: 'reports.view' },
  { pattern: /^\/api\/seed/,                         permission: 'admin.seed' },
];
