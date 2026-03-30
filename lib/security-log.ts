/**
 * @deprecated Use lib/logger.ts directly.
 * Kept as compatibility shim — now delegates to the unified audit logger.
 * All new code should import { log, actorFromRequest } from '@/lib/logger'.
 */

import { log, actorFromRequest } from '@/lib/logger';
import type { Db } from 'mongodb';

export type SecurityEventType =
  | 'invalid_token'
  | 'expired_token'
  | 'unauthorized_email'
  | 'google_noaccess'
  | 'login_blocked'
  | 'csrf_violation'
  | 'session_invalid';

/** @deprecated Use log() from lib/logger.ts */
export async function logSecurityEvent(
  db: Db,
  req: Request,
  type: SecurityEventType,
  provider: 'magic_link' | 'google' | 'system',
  detail: string,
  email?: string,
): Promise<void> {
  const isCritical = type === 'csrf_violation' || type === 'session_invalid';

  await log(db, {
    level:    isCritical ? 'WARN' : 'WARN',
    severity: isCritical ? 'HIGH' : 'MEDIUM',
    category: 'security',
    action:   type.toUpperCase(),
    message:  detail,
    actor:    actorFromRequest(req, { email }),
    metadata: { extra: { provider } },
  });
}
