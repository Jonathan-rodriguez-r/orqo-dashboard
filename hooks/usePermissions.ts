'use client';

import { useEffect, useState } from 'react';
import type { Permission } from '@/lib/rbac';

type SessionInfo = {
  email: string;
  name: string;
  avatar?: string;
  role: string;
  permissions: string[];
  provider: string;
};

let cache: SessionInfo | null | undefined = undefined; // undefined = not fetched yet

export function useSession() {
  const [session, setSession] = useState<SessionInfo | null | undefined>(cache);

  useEffect(() => {
    if (cache !== undefined) {
      setSession(cache);
      return;
    }
    fetch('/api/auth/me')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        cache = d ?? null;
        setSession(cache);
      })
      .catch(() => {
        cache = null;
        setSession(null);
      });
  }, []);

  return session;
}

export function usePermissions() {
  const session = useSession();
  return session?.permissions ?? [];
}

export function useHasPermission(permission: Permission): boolean | undefined {
  const session = useSession();
  if (session === undefined) return undefined; // loading
  return session?.permissions.includes(permission) ?? false;
}

export function useRole(): string | undefined {
  return useSession()?.role;
}
