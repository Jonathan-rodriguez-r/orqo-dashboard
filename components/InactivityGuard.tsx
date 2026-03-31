'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const INACTIVITY_MS = 4 * 60 * 60 * 1000; // 4 hours

export default function InactivityGuard() {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    function reset() {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login?reason=expired');
      }, INACTIVITY_MS);
    }

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, reset));
    };
  }, [router]);

  return null;
}
