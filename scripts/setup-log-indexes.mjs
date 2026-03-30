/**
 * scripts/setup-log-indexes.mjs
 *
 * Creates MongoDB indexes for the `audit_logs` collection, including
 * the TTL index that automatically deletes old log entries.
 *
 * Run ONCE after deployment (or whenever LOG_RETENTION_DAYS changes):
 *   node scripts/setup-log-indexes.mjs
 *
 * To change retention period, update LOG_RETENTION_DAYS in .env.local
 * and re-run this script.
 */

import { MongoClient } from 'mongodb';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));

let MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  try {
    const env = readFileSync(resolve(__dir, '../.env.local'), 'utf8');
    for (const line of env.split('\n')) {
      const [k, ...v] = line.split('=');
      if (k?.trim() === 'MONGODB_URI') {
        MONGODB_URI = v.join('=').trim().replace(/^["']|["']$/g, '');
        break;
      }
    }
  } catch { /* no .env.local */ }
}
if (!MONGODB_URI) { console.error('❌  MONGODB_URI no encontrado'); process.exit(1); }

const LOG_RETENTION_DAYS = parseInt(process.env.LOG_RETENTION_DAYS ?? '90', 10);

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db  = client.db('orqo');
  const col = db.collection('audit_logs');

  console.log(`\n🔍  ORQO — Configurando índices de audit_logs`);
  console.log(`    Retención: ${LOG_RETENTION_DAYS} días\n`);

  // ── TTL index on expiresAt (auto-delete after LOG_RETENTION_DAYS) ─────────
  // expireAfterSeconds: 0 means MongoDB deletes docs when Date.now() > expiresAt
  await col.createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0, name: 'idx_audit_logs_ttl', background: true }
  );
  console.log('✅  TTL index (expiresAt) — docs se auto-eliminan al vencer');

  // ── Query indexes ──────────────────────────────────────────────────────────
  await col.createIndex(
    { createdAt: -1 },
    { name: 'idx_audit_logs_created', background: true }
  );
  console.log('✅  createdAt desc — queries de orden cronológico');

  await col.createIndex(
    { category: 1, level: 1, createdAt: -1 },
    { name: 'idx_audit_logs_cat_level', background: true }
  );
  console.log('✅  (category, level, createdAt) — filtros combinados');

  await col.createIndex(
    { 'actor.email': 1, createdAt: -1 },
    { name: 'idx_audit_logs_actor_email', background: true }
  );
  console.log('✅  actor.email — búsquedas por usuario');

  await col.createIndex(
    { correlationId: 1 },
    { name: 'idx_audit_logs_correlation', background: true }
  );
  console.log('✅  correlationId — trazabilidad de flujos');

  await col.createIndex(
    { action: 1, createdAt: -1 },
    { name: 'idx_audit_logs_action', background: true }
  );
  console.log('✅  action — filtro por tipo de evento');

  console.log('\n🎉  Índices configurados correctamente\n');
  await client.close();
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
