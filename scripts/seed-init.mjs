/**
 * scripts/seed-init.mjs
 * Seed inicial de ORQO: roles del sistema + usuarios base.
 * Ejecutar una sola vez: node scripts/seed-init.mjs
 * Requiere MONGODB_URI en .env.local o como variable de entorno.
 */

import { MongoClient } from 'mongodb';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));

// ── Leer .env.local ──────────────────────────────────────────────────────────
let MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  try {
    const env = readFileSync(resolve(__dir, '../.env.local'), 'utf8');
    for (const line of env.split('\n')) {
      const [k, ...v] = line.split('=');
      if (k?.trim() === 'MONGODB_URI') { MONGODB_URI = v.join('=').trim().replace(/^["']|["']$/g, ''); break; }
    }
  } catch { /* no .env.local */ }
}
if (!MONGODB_URI) { console.error('❌  MONGODB_URI no encontrado'); process.exit(1); }

// ── Módulos del sistema ──────────────────────────────────────────────────────
const SYSTEM_MODULES = [
  { slug: 'dashboard.view',         label: 'Ver Dashboard',           group: 'Dashboard' },
  { slug: 'conversations.view',     label: 'Ver Conversaciones',      group: 'Conversaciones' },
  { slug: 'conversations.export',   label: 'Exportar Conversaciones', group: 'Conversaciones' },
  { slug: 'conversations.delete',   label: 'Eliminar Conversaciones', group: 'Conversaciones' },
  { slug: 'agents.view',            label: 'Ver Agentes',             group: 'Agentes' },
  { slug: 'agents.manage',          label: 'Gestionar Agentes',       group: 'Agentes' },
  { slug: 'reports.view',           label: 'Ver Informes',            group: 'Informes' },
  { slug: 'reports.export',         label: 'Exportar Informes',       group: 'Informes' },
  { slug: 'settings.widget',        label: 'Widget',                  group: 'Configuración' },
  { slug: 'settings.integrations',  label: 'Integraciones',           group: 'Configuración' },
  { slug: 'settings.users',         label: 'Usuarios',                group: 'Configuración' },
  { slug: 'settings.roles',         label: 'Roles y Permisos',        group: 'Configuración' },
  { slug: 'settings.billing',       label: 'Facturación',             group: 'Configuración' },
  { slug: 'admin.logs',             label: 'Logs de Sistema',         group: 'Admin' },
  { slug: 'admin.seed',             label: 'Datos de Prueba',         group: 'Admin' },
];
const ALL = SYSTEM_MODULES.map(m => m.slug);

// ── Roles ────────────────────────────────────────────────────────────────────
const ROLES = [
  {
    slug: 'owner',
    label: 'Propietario',
    description: 'Acceso total — propietario de la cuenta',
    permissions: ALL,
  },
  {
    slug: 'admin',
    label: 'Administrador',
    description: 'Acceso completo excepto facturación y gestión de roles',
    permissions: ALL.filter(p => !['settings.billing', 'settings.roles'].includes(p)),
  },
  {
    slug: 'operations',
    label: 'Operaciones',
    description: 'Gestiona conversaciones, agentes e integraciones. Sin acceso financiero.',
    permissions: [
      'dashboard.view',
      'conversations.view', 'conversations.export',
      'agents.view', 'agents.manage',
      'reports.view',
      'settings.widget', 'settings.integrations',
    ],
  },
  {
    slug: 'analyst',
    label: 'Analista',
    description: 'Lectura y exportación de datos. Sin capacidad de modificar configuración.',
    permissions: [
      'dashboard.view',
      'conversations.view', 'conversations.export',
      'reports.view', 'reports.export',
    ],
  },
  {
    slug: 'agent_manager',
    label: 'Gestor de Agentes',
    description: 'Crea y configura agentes, revisa conversaciones.',
    permissions: [
      'dashboard.view',
      'conversations.view',
      'agents.view', 'agents.manage',
    ],
  },
  {
    slug: 'viewer',
    label: 'Observador',
    description: 'Solo lectura. Ideal para clientes o stakeholders externos.',
    permissions: [
      'dashboard.view',
      'conversations.view',
      'reports.view',
    ],
  },
];

// ── Usuarios iniciales ───────────────────────────────────────────────────────
const USERS = [
  {
    email:       'hello@orqo.io',
    name:        'Jonathan Rodríguez',
    role:        'owner',
    workspaceId: 'default',
    avatar:      null,
  },
  {
    email:       'operaciones@orqo.io',
    name:        'Equipo Operaciones',
    role:        'operations',
    workspaceId: 'default',
    avatar:      null,
  },
  {
    email:       'analytics@orqo.io',
    name:        'Analista ORQO',
    role:        'analyst',
    workspaceId: 'default',
    avatar:      null,
  },
];

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db('orqo');

  console.log('\n🌱  ORQO — Seed inicial\n');

  // Módulos
  let modCount = 0;
  for (const m of SYSTEM_MODULES) {
    const r = await db.collection('system_modules').updateOne(
      { slug: m.slug },
      { $setOnInsert: { ...m, createdAt: new Date() } },
      { upsert: true }
    );
    if (r.upsertedCount) modCount++;
  }
  console.log(`✅  system_modules: ${modCount} nuevos, ${SYSTEM_MODULES.length - modCount} ya existían`);

  // Roles
  let roleCount = 0;
  for (const r of ROLES) {
    const res = await db.collection('roles').updateOne(
      { slug: r.slug },
      {
        $setOnInsert: { slug: r.slug, label: r.label, description: r.description, createdAt: new Date() },
        $set: { permissions: r.permissions },
      },
      { upsert: true }
    );
    if (res.upsertedCount) roleCount++;
    console.log(`   ${res.upsertedCount ? '➕' : '🔄'}  ${r.slug.padEnd(16)} — ${r.permissions.length} permisos`);
  }
  console.log(`✅  roles: ${roleCount} creados, ${ROLES.length - roleCount} actualizados\n`);

  // Usuarios
  let userCount = 0;
  for (const u of USERS) {
    const roleDoc = await db.collection('roles').findOne({ slug: u.role });
    const permissions = roleDoc?.permissions ?? [];
    const res = await db.collection('users').updateOne(
      { email: u.email },
      {
        $set: { role: u.role, permissions, workspaceId: u.workspaceId },
        $setOnInsert: { name: u.name, avatar: u.avatar, createdAt: new Date(), lastLogin: null },
      },
      { upsert: true }
    );
    if (res.upsertedCount) {
      userCount++;
      console.log(`   ➕  ${u.email.padEnd(28)} — ${u.role}`);
    } else {
      console.log(`   ⏭   ${u.email.padEnd(28)} — ya existe`);
    }
  }
  console.log(`\n✅  usuarios: ${userCount} creados\n`);

  // Índices
  await Promise.all([
    db.collection('system_modules').createIndex({ slug: 1 }, { unique: true, background: true }),
    db.collection('roles').createIndex({ slug: 1 }, { unique: true, background: true }),
    db.collection('users').createIndex({ email: 1 }, { unique: true, background: true }),
    db.collection('users').createIndex({ workspaceId: 1 }, { background: true }),
    db.collection('auth_tokens').createIndex({ token: 1 }, { unique: true, background: true }),
    db.collection('auth_tokens').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, background: true }),
  ]);
  console.log('✅  Índices MongoDB actualizados\n');

  await client.close();
  console.log('🎉  Seed completado. Para ingresar al dashboard usa magic link con hello@orqo.io\n');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
