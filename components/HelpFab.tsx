'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function HelpFab() {
  const pathname = usePathname();
  // Don't show on the docs page itself
  if (pathname === '/dashboard/docs') return null;

  return (
    <Link href="/dashboard/docs" className="help-fab" title="Centro de ayuda">
      ?
    </Link>
  );
}
