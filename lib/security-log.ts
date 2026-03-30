import type { Db } from 'mongodb';

export type SecurityEventType =
  | 'invalid_token'          // token no existe o ya fue usado
  | 'expired_token'          // token existe pero venció
  | 'unauthorized_email'     // email no está en la lista de usuarios
  | 'google_noaccess'        // Google OAuth pero email no autorizado
  | 'login_blocked'          // intento de solicitar magic link sin acceso
  | 'csrf_violation'         // state OAuth no coincide
  | 'session_invalid';       // JWT sin permissions[] (sesión vieja)

export type SecurityLogEntry = {
  type:       SecurityEventType;
  category:   'security';
  email?:     string;
  ip?:        string;
  userAgent?: string;
  provider:   'magic_link' | 'google' | 'system';
  detail:     string;
  createdAt:  Date;
};

/**
 * Writes a security event to the `security_logs` collection.
 * Never throws — log failures must not break auth flows.
 */
export async function logSecurityEvent(
  db: Db,
  req: Request,
  type: SecurityEventType,
  provider: SecurityLogEntry['provider'],
  detail: string,
  email?: string,
) {
  try {
    const ip        = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
                      ?? req.headers.get('x-real-ip')
                      ?? 'unknown';
    const userAgent = req.headers.get('user-agent') ?? 'unknown';

    const entry: SecurityLogEntry = {
      type,
      category: 'security',
      email,
      ip,
      userAgent,
      provider,
      detail,
      createdAt: new Date(),
    };

    await db.collection('security_logs').insertOne(entry);

    // Always mirror to server logs
    console.warn(`[SECURITY] ${type} | ${provider} | email=${email ?? '—'} | ip=${ip} | ${detail}`);
  } catch (e) {
    console.error('[security-log] failed to write log:', e);
  }
}
