/**
 * RBAC - Role-Based Access Control
 */

export const PERMISSIONS = {
  DASHBOARD_VIEW: 'dashboard.view',

  CONV_VIEW: 'conversations.view',
  CONV_EXPORT: 'conversations.export',
  CONV_DELETE: 'conversations.delete',

  AGENTS_VIEW: 'agents.view',
  AGENTS_MANAGE: 'agents.manage',

  REPORTS_VIEW: 'reports.view',
  REPORTS_EXPORT: 'reports.export',

  SETTINGS_WIDGET: 'settings.widget',
  SETTINGS_INTEGRATIONS: 'settings.integrations',
  SETTINGS_USERS: 'settings.users',
  SETTINGS_ROLES: 'settings.roles',
  SETTINGS_BILLING: 'settings.billing',

  ADMIN_CLIENTS: 'admin.clients',
  ADMIN_LOGS: 'admin.logs',
  ADMIN_SEED: 'admin.seed',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export type SystemModule = {
  slug: Permission;
  label: string;
  description: string;
  group: string;
};

export const SYSTEM_MODULES: SystemModule[] = [
  { slug: 'dashboard.view', label: 'Ver Dashboard', description: 'Acceso a vista principal', group: 'Dashboard' },
  { slug: 'conversations.view', label: 'Ver Conversaciones', description: 'Listar y leer conversaciones', group: 'Conversaciones' },
  { slug: 'conversations.export', label: 'Exportar Conversaciones', description: 'Descargar conversaciones', group: 'Conversaciones' },
  { slug: 'conversations.delete', label: 'Eliminar Conversaciones', description: 'Borrar conversaciones', group: 'Conversaciones' },
  { slug: 'agents.view', label: 'Ver Agentes', description: 'Listar agentes', group: 'Agentes' },
  { slug: 'agents.manage', label: 'Gestionar Agentes', description: 'Crear/editar/desactivar agentes', group: 'Agentes' },
  { slug: 'reports.view', label: 'Ver Informes', description: 'Acceder a analitica e informes', group: 'Informes' },
  { slug: 'reports.export', label: 'Exportar Informes', description: 'Descargar PDF/XLSX', group: 'Informes' },
  { slug: 'settings.widget', label: 'Config Widget', description: 'Configurar widget', group: 'Configuracion' },
  { slug: 'settings.integrations', label: 'Config Integraciones', description: 'Configurar conectores', group: 'Configuracion' },
  { slug: 'settings.users', label: 'Gestionar Usuarios', description: 'Invitar/editar usuarios', group: 'Configuracion' },
  { slug: 'settings.roles', label: 'Gestionar Roles', description: 'Crear/modificar roles', group: 'Configuracion' },
  { slug: 'settings.billing', label: 'Facturacion', description: 'Plan y facturacion', group: 'Configuracion' },
  { slug: 'admin.clients', label: 'Gestionar Clientes', description: 'Modulo de clientes y cuentas', group: 'Admin' },
  { slug: 'admin.logs', label: 'Logs', description: 'Auditoria y logs', group: 'Admin' },
  { slug: 'admin.seed', label: 'Seed', description: 'Datos demo/seed', group: 'Admin' },
];

export type RoleDefinition = {
  slug: string;
  label: string;
  description: string;
  permissions: Permission[];
};

const ALL: Permission[] = SYSTEM_MODULES.map((m) => m.slug);

export const DEFAULT_ROLES: RoleDefinition[] = [
  {
    slug: 'owner',
    label: 'Propietario',
    description: 'Acceso total',
    permissions: ALL,
  },
  {
    slug: 'admin',
    label: 'Administrador',
    description: 'Acceso alto sin billing/roles/clientes',
    permissions: ALL.filter((p) => !['settings.billing', 'settings.roles', 'admin.clients'].includes(p)),
  },
  {
    slug: 'analyst',
    label: 'Analista',
    description: 'Lectura de conversaciones e informes',
    permissions: ['dashboard.view', 'conversations.view', 'conversations.export', 'reports.view', 'reports.export'],
  },
  {
    slug: 'agent_manager',
    label: 'Gestor de Agentes',
    description: 'Gestiona agentes y revisa conversaciones',
    permissions: ['dashboard.view', 'conversations.view', 'agents.view', 'agents.manage'],
  },
  {
    slug: 'viewer',
    label: 'Observador',
    description: 'Solo lectura basica',
    permissions: ['dashboard.view', 'conversations.view', 'reports.view'],
  },
  {
    slug: 'operations',
    label: 'Operaciones',
    description: 'Operaciones del cliente',
    permissions: ['dashboard.view', 'conversations.view', 'agents.view', 'reports.view', 'admin.logs'],
  },
  {
    slug: 'orqo_operator',
    label: 'Operador ORQO',
    description: 'Equipo ORQO para operar cuentas cliente',
    permissions: [
      'dashboard.view',
      'conversations.view',
      'conversations.export',
      'agents.view',
      'agents.manage',
      'reports.view',
      'reports.export',
      'settings.widget',
      'settings.integrations',
      'settings.users',
      'settings.roles',
      'admin.logs',
      'admin.clients',
    ],
  },
  {
    slug: 'orqo_success',
    label: 'Customer Success ORQO',
    description: 'Seguimiento y mejora continua en cuentas cliente',
    permissions: [
      'dashboard.view',
      'conversations.view',
      'reports.view',
      'reports.export',
      'agents.view',
      'settings.widget',
      'admin.logs',
      'admin.clients',
    ],
  },
  {
    slug: 'orqo_support',
    label: 'Soporte ORQO',
    description: 'Soporte tecnico y monitoreo operativo',
    permissions: [
      'dashboard.view',
      'conversations.view',
      'agents.view',
      'reports.view',
      'admin.logs',
      'admin.clients',
    ],
  },
];

export function hasPermission(userPermissions: string[], required: Permission): boolean {
  return userPermissions.includes(required);
}

export function hasAllPermissions(userPermissions: string[], required: Permission[]): boolean {
  return required.every((p) => userPermissions.includes(p));
}

export function hasAnyPermission(userPermissions: string[], required: Permission[]): boolean {
  return required.some((p) => userPermissions.includes(p));
}

export function getDefaultPermissions(roleSlug: string): Permission[] {
  return DEFAULT_ROLES.find((r) => r.slug === roleSlug)?.permissions ?? ['dashboard.view'];
}

export const ROUTE_PERMISSIONS: Array<{ pattern: RegExp; permission: Permission }> = [
  { pattern: /^\/dashboard\/clients/, permission: 'admin.clients' },
  { pattern: /^\/dashboard\/settings\/roles/, permission: 'settings.roles' },
  { pattern: /^\/dashboard\/settings\/billing/, permission: 'settings.billing' },
  { pattern: /^\/dashboard\/settings\/users/, permission: 'settings.users' },
  { pattern: /^\/dashboard\/settings\/integrations/, permission: 'settings.integrations' },
  { pattern: /^\/dashboard\/settings/, permission: 'settings.widget' },
  { pattern: /^\/dashboard\/logs/, permission: 'admin.logs' },
  { pattern: /^\/dashboard\/reports/, permission: 'reports.view' },
  { pattern: /^\/dashboard\/agents/, permission: 'agents.view' },
  { pattern: /^\/dashboard\/conversations/, permission: 'conversations.view' },
  { pattern: /^\/dashboard/, permission: 'dashboard.view' },
  { pattern: /^\/api\/clients/, permission: 'admin.clients' },
  { pattern: /^\/api\/logs/, permission: 'admin.logs' },
  { pattern: /^\/api\/analytics/, permission: 'reports.view' },
  { pattern: /^\/api\/seed/, permission: 'admin.seed' },
];
