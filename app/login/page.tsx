'use client';

import { useState, Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

function genChallenge() {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  return { a, b, answer: a + b };
}

type Step = 'email' | 'sent' | 'error';

// Separated because useSearchParams() requires Suspense boundary
function Notice() {
  const params = useSearchParams();
  const reason = params.get('reason');
  const errorParam = params.get('error');

  if (!reason && !errorParam) return null;

  const msg = reason === 'timeout'
    ? 'Tu sesión cerró por inactividad (5 min). Inicia sesión de nuevo.'
    : errorParam === 'expired'
    ? 'El enlace de acceso expiró. Solicita uno nuevo.'
    : errorParam === 'noaccess'
    ? 'Este correo no tiene acceso al dashboard.'
    : 'Enlace inválido. Solicita uno nuevo.';

  return (
    <div style={{
      background: 'var(--yellow-g)',
      border: '1px solid var(--yellow)',
      borderRadius: 'var(--radius-sm)',
      padding: '10px 14px',
      marginBottom: '16px',
      fontSize: '13px',
      color: 'var(--yellow)',
    }}>
      {msg}
    </div>
  );
}

export default function LoginPage() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const [challenge, setChallenge] = useState(genChallenge);
  const [captchaVal, setCaptchaVal] = useState('');
  const [captchaErr, setCaptchaErr] = useState(false);

  useEffect(() => { setChallenge(genChallenge()); }, []);

  async function submit(e: React.FormEvent) {
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

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--g00)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{width: '100%', maxWidth: '400px'}}>

        {/* Logo */}
        <div style={{textAlign:'center', marginBottom:'40px'}}>
          <svg width="56" height="56" viewBox="0 0 72 72" fill="none" style={{margin:'0 auto 16px',display:'block'}}>
            <circle cx="36" cy="36" r="30" stroke="#1D2920" strokeWidth="2"/>
            <path d="M52 59.5 A30 30 0 1 1 59.5 52" stroke="#E9EDE9" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
            <line x1="59.5" y1="52" x2="66" y2="58" stroke="#E9EDE9" strokeWidth="3.5" strokeLinecap="round"/>
            <circle cx="66" cy="58" r="4" fill="#2CB978"/>
          </svg>
          <div style={{fontFamily:'var(--f-disp)',fontWeight:800,fontSize:'26px',color:'var(--g08)',letterSpacing:'-0.5px'}}>
            OR<span style={{color:'var(--acc)'}}>QO</span>
          </div>
          <div style={{color:'var(--g05)',fontSize:'13px',marginTop:'4px'}}>Dashboard</div>
        </div>

        {/* Notices from search params — needs Suspense */}
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
              <div style={{marginBottom:'24px'}}>
                <div style={{fontFamily:'var(--f-disp)',fontWeight:700,fontSize:'18px',color:'var(--g08)',marginBottom:'6px'}}>
                  Iniciar sesión
                </div>
                <div style={{color:'var(--g05)',fontSize:'13px'}}>
                  Te enviaremos un enlace mágico a tu correo.
                </div>
              </div>
              <form onSubmit={submit}>
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
                {/* Captcha */}
                <div className="field" style={{marginBottom:'12px'}}>
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
                    <div style={{color:'var(--red)',fontSize:'12px',marginTop:'5px'}}>
                      Respuesta incorrecta. Intenta de nuevo.
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                  style={{width:'100%',justifyContent:'center',marginTop:'4px'}}
                >
                  {loading ? 'Enviando…' : 'Enviar enlace →'}
                </button>
              </form>
            </>
          )}

          {step === 'sent' && (
            <div style={{textAlign:'center',padding:'8px 0'}}>
              <div style={{fontSize:'40px',marginBottom:'16px'}}>📬</div>
              <div style={{fontFamily:'var(--f-disp)',fontWeight:700,fontSize:'17px',color:'var(--g08)',marginBottom:'8px'}}>
                Revisa tu correo
              </div>
              <div style={{color:'var(--g05)',fontSize:'13px',lineHeight:'1.7'}}>
                Enviamos un enlace de acceso a<br/>
                <strong style={{color:'var(--g07)'}}>{email}</strong>.<br/>
                Expira en 15 minutos.
              </div>
              <button
                className="btn btn-ghost btn-sm"
                style={{marginTop:'20px'}}
                onClick={() => { setStep('email'); setEmail(''); }}
              >
                Usar otro correo
              </button>
            </div>
          )}

          {step === 'error' && (
            <div style={{textAlign:'center',padding:'8px 0'}}>
              <div style={{fontSize:'40px',marginBottom:'16px'}}>⚠️</div>
              <div style={{color:'var(--red)',fontSize:'13.5px',marginBottom:'16px'}}>{errMsg}</div>
              <button className="btn btn-secondary" onClick={() => setStep('email')}>
                Intentar de nuevo
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{marginTop:'40px',borderTop:'1px solid var(--g03)',paddingTop:'24px',display:'flex',flexDirection:'column',alignItems:'center',gap:'12px'}}>
          <div style={{display:'flex',gap:'20px',flexWrap:'wrap',justifyContent:'center'}}>
            <a href="https://orqo.io" target="_blank" rel="noopener" style={{fontSize:'12px',color:'var(--g05)',textDecoration:'none'}}>
              orqo.io
            </a>
            <a href="https://orqo.io/Marca/orqo-manual-marca-final.html" target="_blank" rel="noopener" style={{fontSize:'12px',color:'var(--g05)',textDecoration:'none'}}>
              Identidad de marca
            </a>
            <a href="https://orqo.io/privacy" target="_blank" rel="noopener" style={{fontSize:'12px',color:'var(--g05)',textDecoration:'none'}}>
              Privacidad
            </a>
            <a href="mailto:hello@orqo.io" style={{fontSize:'12px',color:'var(--g05)',textDecoration:'none'}}>
              hello@orqo.io
            </a>
          </div>
          <div style={{fontSize:'11px',color:'var(--g04)',textAlign:'center',lineHeight:1.7}}>
            Un producto de{' '}
            <a href="https://bacatadm.com" target="_blank" rel="noopener" style={{color:'inherit'}}>
              Bacata Digital Media
            </a>
            {' · '}
            <a href="https://wa.me/573013211669" target="_blank" rel="noopener" style={{color:'inherit'}}>
              +57 301 321 1669
            </a>
            {' · '}🇨🇴 Orgullosamente colombiano
          </div>
          <div style={{fontSize:'10.5px',color:'var(--g04)'}}>© 2026 ORQO · orqo.io</div>
        </div>

      </div>
    </div>
  );
}
