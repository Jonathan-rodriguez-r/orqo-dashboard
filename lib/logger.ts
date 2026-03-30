/**
 * LoggerService — Centralized Audit Trail for ORQO Dashboard
 *
 * Schema inspired by Elastic Common Schema (ECS) and OpenTelemetry conventions.
 * Writes to the `audit_logs` MongoDB collection with automatic TTL cleanup
 * via the `expiresAt` field (requires TTL index — run scripts/setup-log-indexes.mjs once).
 *
 * ─── USAGE ────────────────────────────────────────────────────────────────────
 *
 *   import { log, actorFromRequest } from '@/lib/logger';
 *
 *   // Basic log
 *   await log(db, {
 *     level:    'INFO',
 *     severity: 'LOW',
 *     category: 'users',
 *     action:   'USER_INVITED',
 *     message:  `${session.email} invitó a ${invitedEmail}`,
 *     actor:    actorFromRequest(req, { email: session.email, role: session.role }),
 *     target:   { type: 'user', email: invitedEmail },
 *     metadata: { after: { email: invitedEmail, role: assignedRole } },
 *   });
 *
 *   // With diff (for updates)
 *   import { log, actorFromRequest, computeDiff } from '@/lib/logger';
 *   const before = { role: 'viewer', name: 'Old Name' };
 *   const after  = { role: 'admin',  name: 'Old Name' };
 *   await log(db, {
 *     level: 'WARN', severity: 'MEDIUM', category: 'users', action: 'USER_UPDATED',
 *     message: `Rol cambiado de ${before.role} a ${after.role}`,
 *     metadata: { before, after, diff: computeDiff(before, after) },
 *   });
 *
 * ─── CORRELATION IDs ──────────────────────────────────────────────────────────
 *
 *   Generate ONE correlationId at the top of a multi-step flow and thread it
 *   through all related log() calls so they can be queried together:
 *
 *   const cid = randomUUID();
 *   await log(db, { ..., correlationId: cid, action: 'INVITE_START' });
 *   // ... send email ...
 *   await log(db, { ..., correlationId: cid, action: 'INVITE_EMAIL_SENT' });
 *
 * ─── LEVELS & SEVERITIES ──────────────────────────────────────────────────────
 *
 *   Level    | Severity | When to use
 *   ---------|----------|----------------------------------------------------
 *   INFO     | LOW      | Successful operations (login, create, read)
 *   INFO     | MEDIUM   | Notable but normal events
 *   WARN     | MEDIUM   | Blocked attempts, permission denials, soft failures
 *   WARN     | HIGH     | Security events (invalid tokens, suspicious access)
 *   ERROR    | HIGH     | Unexpected failures that affect the user
 *   FATAL    | CRITICAL | System-breaking failures requiring immediate attention
 *
 * ─── SETUP ────────────────────────────────────────────────────────────────────
 *
 *   Run once after deployment:
 *     node scripts/setup-log-indexes.mjs
 *
 *   TTL controlled by:
 *     LOG_RETENTION_DAYS=90  (default: 90)
 */

import { randomUUID } from 'crypto';
import type { Db } from 'mongodb';

// ── Types ─────────────────────────────────────────────────────────────────────

export type LogLevel    = 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
export type LogSeverity = 'LOW'  | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type LogCategory =
  | 'auth'
  | 'security'
  | 'users'
  | 'roles'
  | 'system'
  | 'billing'
  | 'connector'
  | 'agent'
  | 'conversation';

export interface AuditLogActor {
  id?:        string;  // user _id or 'system'
  email?:     string;
  role?:      string;
  ip?:        string;
  userAgent?: string;
}

export interface AuditLogTarget {
  type?:  string;  // 'user' | 'role' | 'agent' | 'conversation' | ...
  id?:    string;
  email?: string;
  label?: string;
}

export interface AuditLogMetadata {
  before?: Record<string, unknown>;
  after?:  Record<string, unknown>;
  diff?:   Record<string, unknown>;
  error?:  { message: string; stack?: string; code?: string };
  extra?:  Record<string, unknown>;
}

export interface AuditLogHttp {
  method?:     string;
  path?:       string;
  statusCode?: number;
  duration?:   number;
}

/** Full document stored in MongoDB `audit_logs` collection */
export interface AuditLogDoc {
  correlationId: string;
  level:         LogLevel;
  severity:      LogSeverity;
  category:      LogCategory;
  action:        string;   // SCREAMING_SNAKE_CASE event name (e.g. USER_INVITED)
  message:       string;   // Human-readable description for the log viewer
  actor?:        AuditLogActor;
  target?:       AuditLogTarget;
  metadata?:     AuditLogMetadata;
  http?:         AuditLogHttp;
  createdAt:     Date;
  expiresAt:     Date;     // TTL field — set from LOG_RETENTION_DAYS env var
}

/** Input type — auto-populated fields can be omitted */
export type LogInput = Omit<AuditLogDoc, 'createdAt' | 'expiresAt'> & {
  correlationId?: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function retentionMs(): number {
  const days = Math.max(1, parseInt(process.env.LOG_RETENTION_DAYS ?? '90', 10));
  return days * 24 * 60 * 60 * 1000;
}

/**
 * Extracts IP address and user-agent string from an incoming Request.
 * Merge with extra actor fields: actorFromRequest(req, { email, role })
 */
export function actorFromRequest(req: Request, extra?: Partial<AuditLogActor>): AuditLogActor {
  const ip        = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
                    ?? req.headers.get('x-real-ip')
                    ?? 'unknown';
  const userAgent = req.headers.get('user-agent') ?? 'unknown';
  return { ip, userAgent, ...extra };
}

/**
 * Computes a field-level diff between two plain objects.
 * Returns only keys where the value changed.
 *
 * @example
 * computeDiff({ role: 'viewer' }, { role: 'admin' })
 * // → { role: { from: 'viewer', to: 'admin' } }
 */
export function computeDiff(
  before: Record<string, unknown>,
  after:  Record<string, unknown>,
): Record<string, { from: unknown; to: unknown }> {
  const diff: Record<string, { from: unknown; to: unknown }> = {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      diff[key] = { from: before[key], to: after[key] };
    }
  }
  return diff;
}

// ── Core logger ───────────────────────────────────────────────────────────────

/**
 * Writes a structured audit entry to `audit_logs`.
 * **Never throws** — a logging failure must not break business logic.
 * Mirror-logs to server stdout for external aggregators (Vercel logs, Datadog).
 */
export async function log(db: Db, entry: LogInput): Promise<void> {
  try {
    const now = new Date();
    const doc: AuditLogDoc = {
      correlationId: entry.correlationId ?? randomUUID(),
      level:         entry.level,
      severity:      entry.severity,
      category:      entry.category,
      action:        entry.action,
      message:       entry.message,
      createdAt:     now,
      expiresAt:     new Date(now.getTime() + retentionMs()),
    };

    if (entry.actor)    doc.actor    = entry.actor;
    if (entry.target)   doc.target   = entry.target;
    if (entry.metadata) doc.metadata = entry.metadata;
    if (entry.http)     doc.http     = entry.http;

    await db.collection<AuditLogDoc>('audit_logs').insertOne(doc);

    // Mirror to server stdout
    const prefix = `[${entry.level}][${entry.category}] ${entry.action}`;
    if (entry.level === 'FATAL' || entry.level === 'ERROR') {
      console.error(prefix, entry.message, entry.metadata?.error ?? '');
    } else if (entry.level === 'WARN') {
      console.warn(prefix, entry.message);
    } else {
      console.log(prefix, entry.message);
    }
  } catch (e) {
    console.error('[logger] Failed to write audit log — business logic continues:', e);
  }
}
