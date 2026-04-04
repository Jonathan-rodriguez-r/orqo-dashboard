'use client';

/**
 * /meta-callback
 *
 * OAuth redirect URI for Meta Embedded Signup.
 * Meta redirects here after the user completes (or cancels) the signup flow.
 *
 * URL params: ?code=xxx&state=xxx  (or ?error=xxx&error_reason=yyy on cancel)
 *
 * Flow:
 *   1. Read code/error from URL
 *   2. Post message to window.opener (the dashboard integrations page)
 *   3. Close this window
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function MetaCallbackInner() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'done' | 'error'>('processing');

  useEffect(() => {
    const code  = searchParams.get('code');
    const error = searchParams.get('error');
    const errorReason = searchParams.get('error_reason');
    const state = searchParams.get('state');

    const payload = code
      ? { type: 'META_OAUTH_CALLBACK', code, state }
      : { type: 'META_OAUTH_CALLBACK', error: error ?? 'cancelled', errorReason: errorReason ?? '' };

    if (window.opener) {
      try {
        window.opener.postMessage(payload, window.location.origin);
        setStatus('done');
      } catch {
        setStatus('error');
      }
    } else {
      // Opened directly (no opener) — show a message
      setStatus('error');
    }

    // Close after a short delay so the user sees the status message
    const t = setTimeout(() => window.close(), 1500);
    return () => clearTimeout(t);
  }, [searchParams]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      fontFamily: 'system-ui, sans-serif',
      gap: '12px',
      color: '#1a1a1a',
      background: '#fafafa',
    }}>
      {status === 'processing' && (
        <>
          <span style={{ fontSize: 32 }}>⏳</span>
          <p style={{ margin: 0, fontWeight: 600 }}>Procesando…</p>
        </>
      )}
      {status === 'done' && (
        <>
          <span style={{ fontSize: 32 }}>✅</span>
          <p style={{ margin: 0, fontWeight: 600 }}>Conectado. Cerrando ventana…</p>
        </>
      )}
      {status === 'error' && (
        <>
          <span style={{ fontSize: 32 }}>⚠️</span>
          <p style={{ margin: 0, fontWeight: 600 }}>Esta ventana se puede cerrar.</p>
        </>
      )}
    </div>
  );
}

export default function MetaCallbackPage() {
  return (
    <Suspense>
      <MetaCallbackInner />
    </Suspense>
  );
}
