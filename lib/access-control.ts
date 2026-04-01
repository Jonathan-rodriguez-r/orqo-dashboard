import type { SessionPayload } from '@/lib/auth';

export function isOrqoRole(role: string | undefined | null) {
  return String(role ?? '').startsWith('orqo_');
}

export function isGlobalOperatorRole(role: string | undefined | null) {
  const clean = String(role ?? '');
  return clean === 'owner' || isOrqoRole(clean);
}

export function isProtectedRoleSlug(slug: string | undefined | null) {
  const clean = String(slug ?? '').trim();
  return clean === 'owner' || isOrqoRole(clean);
}

export function canAccessProtectedRoles(session: SessionPayload | null) {
  if (!session) return false;
  return isGlobalOperatorRole(session.role);
}

export function resolveScopedWorkspaceId(
  session: SessionPayload,
  requestedWorkspaceId?: string | null
) {
  const requested = String(requestedWorkspaceId ?? '').trim();
  if (requested && isGlobalOperatorRole(session.role)) return requested;
  return session.workspaceId;
}
