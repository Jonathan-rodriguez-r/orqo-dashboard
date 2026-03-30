'use client';

import { useState, Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

function genChallenge() {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  return { a, b, answer: a + b };
}

type Step = 'email' | 'sent' | 'error';

function Notice() {
  const params = useSearchParams();
  const reason = params.get('reason');
  const err    = params.get('error');

  if (!reason && !err) return null;

  const isSecurityError = err === 'unauthorized' || err === 'invalid_state';

  const msg =
    reason === 'unauthenticated'    ? 'Inicia sesión para continuar.' :
    reason === 'expired'            ? 'Tu sesión cerró por inactividad. Inicia sesión de nuevo.' :
    err === 'unauthorized'          ? 'No autorizado. Este acceso ha sido registrado.' :
    err === 'expired'               ? 'El enlace de acceso expiró. Solicita uno nuevo.' :
    err === 'noaccess'              ? 'Este correo no tiene acceso al dashboard.' :
    err === 'google_cancelled'      ? 'Inicio con Google cancelado.' :
    err === 'invalid_state'         ? 'Acceso denegado. El evento fue registrado.' :
    err === 'google_token'          ? 'Error al conectar con Google. Intenta de nuevo.' :
                                      'Enlace inválido. Solicita uno nuevo.';

  return (
    <div style={{
      background: isSecurityError ? 'rgba(239,68,68,0.08)' : 'rgba(234,179,8,0.08)',
      border: `1px solid ${isSecurityError ? 'var(--red)' : 'var(--yellow)'}`,
      borderRadius: 'var(--radius-sm)',
      padding: '10px 14px',
      marginBottom: '16px',
      fontSize: '13px',
      color: isSecurityError ? 'var(--red)' : 'var(--yellow)',
    }}>
      {msg}
    </div>
  );
}

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
    <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
);

export default function LoginPage() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [showMagicLink, setShowMagicLink] = useState(false);

  const [challenge, setChallenge] = useState(genChallenge);
  const [captchaVal, setCaptchaVal] = useState('');
  const [captchaErr, setCaptchaErr] = useState(false);

  const googleConfigured = !!process.env.NEXT_PUBLIC_GOOGLE_CONFIGURED;

  useEffect(() => { setChallenge(genChallenge()); }, []);

  async function submitMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    if (parseInt(captchaVal, 10) !== challenge.answer) {
      setCaptchaErr(true);
      setChallenge(genChallenge());
      setCaptchaVal('');
      return;
    }
    setCaptchaErr(false);
    setLoading(true);
    setErrMsg('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrMsg(data.error ?? 'Error al enviar el correo');
        setStep('error');
      } else {
        setStep('sent');
      }
    } catch {
      setErrMsg('Error de conexión');
      setStep('error');
    } finally {
      setLoading(false);
    }
  }

  function handleGoogle() {
    setGoogleLoading(true);
    window.location.href = '/api/auth/google';
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--g00)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <svg width="52" height="52" viewBox="0 0 72 72" fill="none" style={{ margin: '0 auto 14px', display: 'block' }}>
            <circle cx="36" cy="36" r="30" stroke="#1D2920" strokeWidth="2"/>
            <path d="M52 59.5 A30 30 0 1 1 59.5 52" stroke="#E9EDE9" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
            <line x1="59.5" y1="52" x2="66" y2="58" stroke="#E9EDE9" strokeWidth="3.5" strokeLinecap="round"/>
            <circle cx="66" cy="58" r="4" fill="#2CB978"/>
          </svg>
          <div style={{ fontFamily: 'var(--f-disp)', fontWeight: 800, fontSize: '26px', color: 'var(--g08)', letterSpacing: '-0.5px' }}>
            OR<span style={{ color: 'var(--acc)' }}>QO</span>
          </div>
          <div style={{ color: 'var(--g05)', fontSize: '13px', marginTop: '4px' }}>Dashboard</div>
        </div>

        {/* Notices */}
        <Suspense fallback={null}>
          <Notice />
        </Suspense>

        {/* Card */}
        <div style={{
          background: 'var(--g01)',
          border: '1px solid var(--g03)',
          borderRadius: 'var(--radius-lg)',
          padding: '32px',
        }}>

          {step === 'email' && (
            <>
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontFamily: 'var(--f-disp)', fontWeight: 700, fontSize: '18px', color: 'var(--g08)', marginBottom: '6px' }}>
                  Iniciar sesión
                </div>
                <div style={{ color: 'var(--g05)', fontSize: '13px' }}>
                  Accede a tu workspace de ORQO.
                </div>
              </div>

              {/* ── Google SSO (primary) ── */}
              <button
                onClick={handleGoogle}
                disabled={googleLoading}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  padding: '11px 16px',
                  background: 'var(--g02)',
                  border: '1px solid var(--g03)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--g07)',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: googleLoading ? 'wait' : 'pointer',
                  transition: 'border-color .15s, background .15s',
                  marginBottom: '20px',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--g04)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--g03)')}
              >
                <GoogleIcon />
                {googleLoading ? 'Redirigiendo…' : 'Continuar con Google'}
              </button>

              {/* ── Divider ── */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '20px' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--g03)' }}/>
                <span style={{ color: 'var(--g05)', fontSize: '12px' }}>o</span>
                <div style={{ flex: 1, height: 1, background: 'var(--g03)' }}/>
              </div>

              {/* ── Magic Link toggle ── */}
              {!showMagicLink ? (
                <button
                  className="btn btn-ghost"
                  style={{ width: '100%', justifyContent: 'center', fontSize: '13.5px' }}
                  onClick={() => setShowMagicLink(true)}
                >
                  Usar enlace mágico por correo
                </button>
              ) : (
                <form onSubmit={submitMagicLink}>
                  <div className="field">
                    <label className="label">Correo electrónico</label>
                    <input
                      className="input"
                      type="email"
                      placeholder="tu@correo.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <div className="field" style={{ marginBottom: '12px' }}>
                    <label className="label">
                      Verificación — ¿cuánto es {challenge.a} + {challenge.b}?
                    </label>
                    <input
                      className="input"
                      type="number"
                      placeholder="Respuesta"
                      value={captchaVal}
                      onChange={e => { setCaptchaVal(e.target.value); setCaptchaErr(false); }}
                      required
                      style={captchaErr ? { borderColor: 'var(--red)' } : {}}
                    />
                    {captchaErr && (
                      <div style={{ color: 'var(--red)', fontSize: '12px', marginTop: '5px' }}>
                        Respuesta incorrecta. Intenta de nuevo.
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                    style={{ width: '100%', justifyContent: 'center', marginTop: '4px' }}
                  >
                    {loading ? 'Enviando…' : 'Enviar enlace →'}
                  </button>
                </form>
              )}
            </>
          )}

          {step === 'sent' && (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%', background: 'rgba(44,185,120,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px', fontSize: '22px',
              }}>
                ✉️
              </div>
              <div style={{ fontFamily: 'var(--f-disp)', fontWeight: 700, fontSize: '17px', color: 'var(--g08)', marginBottom: '8px' }}>
                Revisa tu correo
              </div>
              <div style={{ color: 'var(--g05)', fontSize: '13px', lineHeight: '1.7' }}>
                Enviamos un enlace de acceso a<br/>
                <strong style={{ color: 'var(--g07)' }}>{email}</strong>.<br/>
                Expira en 15 minutos.
              </div>
              <button
                className="btn btn-ghost btn-sm"
                style={{ marginTop: '20px' }}
                onClick={() => { setStep('email'); setEmail(''); }}
              >
                Usar otro correo
              </button>
            </div>
          )}

          {step === 'error' && (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ color: 'var(--red)', fontSize: '13.5px', marginBottom: '16px' }}>{errMsg}</div>
              <button className="btn btn-secondary" onClick={() => setStep('email')}>
                Intentar de nuevo
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ marginTop: '32px', borderTop: '1px solid var(--g03)', paddingTop: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              ['orqo.io', 'https://orqo.io'],
              ['Changelog', 'https://orqo.io/changelog'],
              ['Privacidad', 'https://orqo.io/privacy'],
              ['hello@orqo.io', 'mailto:hello@orqo.io'],
            ].map(([label, href]) => (
              <a key={href} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener"
                style={{ fontSize: '12px', color: 'var(--g05)', textDecoration: 'none' }}>
                {label}
              </a>
            ))}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--g04)', textAlign: 'center', lineHeight: 1.7 }}>
            Un producto de{' '}
            <a href="https://bacatadm.com" target="_blank" rel="noopener" style={{ color: 'inherit' }}>
              Bacata Digital Media
            </a>
            {' · '}
            <a href="https://wa.me/573013211669" target="_blank" rel="noopener" style={{ color: 'inherit' }}>
              +57 301 321 1669
            </a>
            {' · '}🇨🇴 Orgullosamente colombiano
          </div>
          <div style={{ fontSize: '10.5px', color: 'var(--g04)' }}>© 2026 ORQO · orqo.io</div>
        </div>

      </div>
    </div>
  );
}
