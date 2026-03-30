'use client';

import { useHasPermission } from '@/hooks/usePermissions';
import type { Permission } from '@/lib/rbac';

type Props = {
  permission: Permission;
  /** Shown while the session is loading. Default: null */
  fallback?: React.ReactNode;
  /** Shown when the user lacks the permission. Default: null */
  denied?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * PermissionGate — renders children only when the current user
 * has the required permission. Zero flicker: stays null until
 * session loads (avoids showing gated content before check).
 *
 * Usage:
 *   <PermissionGate permission="settings.roles">
 *     <RolesPanel />
 *   </PermissionGate>
 */
export default function PermissionGate({ permission, fallback = null, denied = null, children }: Props) {
  const allowed = useHasPermission(permission);

  if (allowed === undefined) return <>{fallback}</>; // loading
  if (!allowed) return <>{denied}</>;
  return <>{children}</>;
}
