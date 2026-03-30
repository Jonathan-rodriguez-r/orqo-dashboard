'use client';

import { useState, useEffect } from 'react';

type Tab = 'manual' | 'faq' | 'diagnostico' | 'logs' | 'changelog';

type LogEntry = {
  ts: number;
  level: 'info' | 'warn' | 'error';
  source: string;
  msg: string;
  detail?: string;
};

type DiagResult = {
  label: string;
  status: 'ok' | 'warn' | 'error' | 'loading';
  detail: string;
};

// ── FAQ data ──────────────────────────────────────────────────────────────────
const FAQ = [
  {
    q: '¿Por qué el widget no aplica mi configuración guardada?',
    a: 'La causa más común es CORS: el middleware estaba redirigiendo /api/public/widget al login. Verifica en Diagnóstico que el endpoint público responde 200. Si no, revisa proxy.ts y asegúrate de que /api/public esté en la lista PUBLIC.',
  },
  {
    q: '¿Por qué el tema claro/oscuro no funciona en el widget?',
    a: 'Si loadWidgetConfig() usa element.style.setProperty() para --g00/--g01, los inline styles anulan los selectores CSS [data-theme]. La solución es inyectar un <style> tag en lugar de estilos inline. Esto ya está corregido en la versión actual.',
  },
  {
    q: '¿Qué pasa si MongoDB falla al guardar la configuración?',
    a: 'El endpoint POST /api/config/widget devuelve { error: "..." } con status 500. El dashboard mostrará un alert. El error también queda en activity_logs. Revisa la cadena de conexión MONGODB_URI en las variables de entorno de Vercel.',
  },
  {
    q: '¿Cómo sé si el widget está activo en mi sitio?',
    a: 'Ve a Diagnóstico → "Widget público API". Si devuelve { active: true }, el widget debería verse. Si devuelve defaults (_defaults: true), la config no se encontró en MongoDB — guarda los cambios desde la sección Widget.',
  },
  {
    q: '¿Por qué el contador de interacciones siempre muestra 20/20?',
    a: 'TOTAL_INT era una constante hardcodeada en 20. La config de interactionLimit de la API se asignaba a window._ORQO_INT_LIMIT pero nunca se leía. Corregido: ahora TOTAL_INT es let y se actualiza desde loadWidgetConfig().',
  },
  {
    q: '¿Cómo integro el widget en una web que no es WordPress?',
    a: 'Copia el snippet de integración desde la sección Integraciones. Pégalo antes del </body> de tu HTML. El script lee tu API key, obtiene la config del dashboard y renderiza el widget automáticamente.',
  },
  {
    q: '¿Cómo funciona el magic link de login?',
    a: 'Al ingresar tu correo, el servidor genera un JWT firmado con SESSION_SECRET, lo embebe en un enlace y lo envía via Resend. El enlace expira en 15 min. Al hacer clic, el token se verifica y se crea una cookie de sesión httpOnly.',
  },
  {
    q: '¿Por qué el footer daba 404 en Identidad de marca y Changelog?',
    a: 'El vercel.json tiene outputDirectory: "Landing_Page". Los archivos fuera de esa carpeta no son accesibles. Solución: mover los archivos dentro de Landing_Page/ y usar rutas relativas simples (/marca, /changelog).',
  },
];

// ── Changelog data ────────────────────────────────────────────────────────────
const CHANGELOG = [
  {
    version: 'v0.9',
    date: 'Mar 2026',
    items: [
      'Fix CORS: /api/public/widget exento del middleware de auth (307 → 200)',
      'Fix tema claro/oscuro: inyección de <style> en lugar de inline styles',
      'Posiciones arriba-centro y abajo-centro en el widget',
      'Contador de interacciones actualizado desde config de API',
      'Footer: Changelog y Marca corregidos (outputDirectory Vercel)',
      'Logs de actividad: activity_logs en MongoDB',
      'Nueva página: Centro de ayuda & Diagnóstico en dashboard',
      'Landing: sección Implementación en 3 pasos y Perfiles & Skills',
    ],
  },
  {
    version: 'v0.8',
    date: 'Mar 2026',
    items: [
      'Widget embebable: widget.js + API key + endpoint /api/public/widget',
      'Sección Integraciones con código embed y botón copiar',
      'Página de identidad de marca adaptada con nav/footer',
      'Footer consistente en login, index y manual de marca',
      'Email actualizado a hello@orqo.io',
    ],
  },
  {
    version: 'v0.7',
    date: 'Feb 2026',
    items: [
      'Dashboard widget: preview dark/light, posición como select',
      'Favicon presets: 10 iconos SVG seleccionables',
      'Fotos de agente: 8 retratos reales (randomuser.me)',
      'Opacidad de ventana y botón configurables',
      'Fuente y radio de bordes personalizables',
    ],
  },
  {
    version: 'v0.6',
    date: 'Feb 2026',
    items: [
      'Auth magic link con JWT y Resend',
      'Middleware de sesión (proxy.ts)',
      'Timeout de sesión 5 min con aviso',
      'Lista de usuarios con acceso al dashboard',
      'Captcha matemático en login',
    ],
  },
  {
    version: 'v0.5',
    date: 'Ene 2026',
    items: [
      'Proyecto inicial Next.js + MongoDB Atlas',
      'Widget de chat ORQO en landing page',
      'Dashboard básico con sidebar',
      'Sección hero y ticker en landing',
    ],
  },
];

export default function DocsPage() {
  const [tab, setTab] = useState<Tab>('manual');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [diagResults, setDiagResults] = useState<DiagResult[]>([]);
  const [diagRunning, setDiagRunning] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [clearingLogs, setClearingLogs] = useState(false);

  async function loadLogs() {
    setLogsLoading(true);
    try {
      const res = await fetch('/api/admin/logs?limit=100');
      if (res.ok) setLogs(await res.json());
    } finally {
      setLogsLoading(false);
    }
  }

  async function clearLogs() {
    if (!confirm('¿Eliminar todos los logs?')) return;
    setClearingLogs(true);
    await fetch('/api/admin/logs', { method: 'DELETE' });
    setLogs([]);
    setClearingLogs(false);
  }

  useEffect(() => {
    if (tab === 'logs') loadLogs();
  }, [tab]);

  async function runDiag() {
    setDiagRunning(true);
    const results: DiagResult[] = [
      { label: 'API pública (CORS + respuesta)', status: 'loading', detail: '' },
      { label: 'Config en MongoDB', status: 'loading', detail: '' },
      { label: 'Widget activo', status: 'loading', detail: '' },
      { label: 'Endpoint privado (auth)', status: 'loading', detail: '' },
    ];
    setDiagResults([...results]);

    // Test 1: Public API CORS + response
    try {
      const t0 = Date.now();
      const res = await fetch('/api/public/widget', { cache: 'no-store' });
      const ms = Date.now() - t0;
      if (res.ok) {
        const data = await res.json();
        results[0] = { label: results[0].label, status: 'ok', detail: `HTTP 200 en ${ms}ms · CORS OK` };
        // Test 2: config in MongoDB
        if (data._defaults) {
          results[1] = { label: results[1].label, status: 'warn', detail: 'No hay config guardada — sirviendo defaults. Guarda cambios en Widget.' };
        } else {
          results[1] = { label: results[1].label, status: 'ok', detail: `Config encontrada · title: "${data.title ?? '?'}" · updatedAt: ${data.updatedAt ? new Date(data.updatedAt).toLocaleString('es') : '?'}` };
        }
        // Test 3: widget active
        if (data.active === false) {
          results[2] = { label: results[2].label, status: 'warn', detail: 'Widget marcado como INACTIVO en la config. El widget no se mostrará.' };
        } else {
          results[2] = { label: results[2].label, status: 'ok', detail: 'Widget activo — visible en orqo.io' };
        }
      } else {
        results[0] = { label: results[0].label, status: 'error', detail: `HTTP ${res.status}` };
        results[1] = { label: results[1].label, status: 'error', detail: 'No se pudo leer la config (API falló)' };
        results[2] = { label: results[2].label, status: 'error', detail: 'No se pudo verificar' };
      }
    } catch (e: any) {
      results[0] = { label: results[0].label, status: 'error', detail: `Error de red: ${e.message}. Posible CORS bloqueado.` };
      results[1] = { label: results[1].label, status: 'error', detail: 'No se pudo leer (API inaccesible)' };
      results[2] = { label: results[2].label, status: 'error', detail: 'No se pudo verificar' };
    }

    // Test 4: private config endpoint (auth required)
    try {
      const res = await fetch('/api/config/widget', { cache: 'no-store' });
      if (res.ok) {
        results[3] = { label: results[3].label, status: 'ok', detail: `HTTP ${res.status} — sesión activa y MongoDB responde` };
      } else {
        results[3] = { label: results[3].label, status: 'warn', detail: `HTTP ${res.status}` };
      }
    } catch (e: any) {
      results[3] = { label: results[3].label, status: 'error', detail: `Error: ${e.message}` };
    }

    setDiagResults([...results]);
    setDiagRunning(false);
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'manual', label: 'Manual' },
    { id: 'faq', label: 'FAQ' },
    { id: 'diagnostico', label: 'Diagnóstico' },
    { id: 'logs', label: 'Logs' },
    { id: 'changelog', label: 'Changelog' },
  ];

  const statusColor = (s: DiagResult['status']) =>
    s === 'ok' ? 'var(--acc)' : s === 'warn' ? 'var(--yellow)' : s === 'error' ? 'var(--red)' : 'var(--g05)';
  const statusIcon = (s: DiagResult['status']) =>
    s === 'ok' ? '✓' : s === 'warn' ? '⚠' : s === 'error' ? '✕' : '…';

  const logColor = (level: LogEntry['level']) =>
    level === 'error' ? 'var(--red)' : level === 'warn' ? 'var(--yellow)' : 'var(--g05)';

  return (
    <div style={{ padding: '28px 32px', maxWidth: 860 }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--f-disp)', fontWeight: 800, fontSize: 22, color: 'var(--g08)', letterSpacing: '-0.3px' }}>
          Centro de ayuda
        </div>
        <div style={{ color: 'var(--g05)', fontSize: 13, marginTop: 4 }}>
          Manual · FAQ · Diagnóstico · Logs · Changelog
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--g03)', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '8px 16px', fontSize: 13, fontWeight: 600,
              color: tab === t.id ? 'var(--acc)' : 'var(--g05)',
              borderBottom: tab === t.id ? '2px solid var(--acc)' : '2px solid transparent',
              marginBottom: -1, transition: 'color 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── MANUAL ── */}
      {tab === 'manual' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {[
            {
              title: '1. Conecta tu número de WhatsApp Business',
              body: 'Ve a Integraciones → WhatsApp. Haz clic en "Conectar número" e inicia sesión con tu cuenta Meta Business. Selecciona o registra el número, verifica con SMS y configura el mensaje de bienvenida.',
              note: 'Si el número ya está en WhatsApp Business App, debes desvincularlo antes de conectarlo a la API.',
            },
            {
              title: '2. Instala ORQO en tu sitio web',
              body: 'WordPress: ve a Plugins → Añadir nuevo → busca "ORQO" → Instalar y Activar. Copia el token de Integraciones → WordPress y pégalo en Ajustes → ORQO.\n\nCualquier web: copia el snippet de Integraciones y pégalo antes del </body> de tu HTML.',
            },
            {
              title: '3. Configura el widget',
              body: 'En la sección Widget puedes personalizar: nombre del asistente, colores, posición, icono, límite de interacciones, artículos de ayuda y más. Guarda y los cambios se reflejan en orqo.io en segundos.',
            },
            {
              title: '4. Crea y activa tus agentes',
              body: 'Ve a Agentes → Nuevo agente. Define el objetivo en lenguaje natural, las skills disponibles y los canales donde debe operar. Actívalo con el switch. ORQO comenzará a responder de inmediato.',
            },
            {
              title: '5. Revisa conversaciones y ajusta',
              body: 'En Conversaciones puedes ver el historial completo de interacciones. Usa los logs de actividad para detectar errores de configuración o fallas de integración.',
              note: 'El límite de interacciones se configura en Widget → Límite. Por defecto es 20 para el modo demo.',
            },
          ].map((step, i) => (
            <div key={i} style={{ background: 'var(--g01)', border: '1px solid var(--g03)', borderRadius: 'var(--radius-lg)', padding: '20px 24px' }}>
              <div style={{ fontWeight: 700, color: 'var(--g08)', fontSize: 14, marginBottom: 8 }}>{step.title}</div>
              <div style={{ color: 'var(--g05)', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-line' }}>{step.body}</div>
              {step.note && (
                <div style={{ marginTop: 10, background: 'var(--yellow-g)', border: '1px solid var(--yellow)', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: 'var(--yellow)' }}>
                  {step.note}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── FAQ ── */}
      {tab === 'faq' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {FAQ.map((item, i) => (
            <div key={i} style={{ background: 'var(--g01)', border: `1px solid ${openFaq === i ? 'var(--acc)' : 'var(--g03)'}`, borderRadius: 'var(--radius-lg)', overflow: 'hidden', transition: 'border-color 0.15s' }}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, textAlign: 'left' }}
              >
                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--g08)', lineHeight: 1.4 }}>{item.q}</span>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, transform: openFaq === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: 'var(--g05)' }}>
                  <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {openFaq === i && (
                <div style={{ padding: '0 18px 16px', fontSize: 13, color: 'var(--g05)', lineHeight: 1.7, borderTop: '1px solid var(--g03)' }}>
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── DIAGNÓSTICO ── */}
      {tab === 'diagnostico' && (
        <div>
          <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn btn-primary" onClick={runDiag} disabled={diagRunning} style={{ justifyContent: 'center' }}>
              {diagRunning ? 'Ejecutando…' : 'Ejecutar diagnóstico'}
            </button>
            <span style={{ fontSize: 12, color: 'var(--g04)' }}>Verifica conectividad, CORS, MongoDB y estado del widget</span>
          </div>

          {diagResults.length === 0 && (
            <div style={{ background: 'var(--g01)', border: '1px solid var(--g03)', borderRadius: 'var(--radius-lg)', padding: 24, color: 'var(--g05)', fontSize: 13 }}>
              Pulsa "Ejecutar diagnóstico" para verificar el estado del sistema.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {diagResults.map((r, i) => (
              <div key={i} style={{ background: 'var(--g01)', border: '1px solid var(--g03)', borderRadius: 'var(--radius-lg)', padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: `${statusColor(r.status)}22`, border: `1px solid ${statusColor(r.status)}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, fontWeight: 700, color: statusColor(r.status) }}>
                  {statusIcon(r.status)}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--g08)', marginBottom: 3 }}>{r.label}</div>
                  <div style={{ fontSize: 12, color: statusColor(r.status) }}>{r.detail || '—'}</div>
                </div>
              </div>
            ))}
          </div>

          {diagResults.length > 0 && (
            <div style={{ marginTop: 20, background: 'var(--g01)', border: '1px solid var(--g03)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
              <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--g06)', marginBottom: 10 }}>Posibles causas de error</div>
              <ul style={{ fontSize: 12, color: 'var(--g05)', lineHeight: 2, paddingLeft: 16, margin: 0 }}>
                <li><strong style={{ color: 'var(--g06)' }}>CORS 307:</strong> /api/public/widget no está en la lista PUBLIC del middleware (proxy.ts)</li>
                <li><strong style={{ color: 'var(--g06)' }}>Config defaults:</strong> No se ha guardado config o MongoDB no puede escribir. Revisa MONGODB_URI en Vercel.</li>
                <li><strong style={{ color: 'var(--g06)' }}>Widget inactivo:</strong> El switch de activo/inactivo en Widget está en OFF.</li>
                <li><strong style={{ color: 'var(--g06)' }}>Theme override:</strong> Si los colores no cambian con el tema, verifica que no haya inline styles sobreescribiendo CSS.</li>
                <li><strong style={{ color: 'var(--g06)' }}>Contador fijo en 20:</strong> TOTAL_INT no actualizado desde la API. Verifica loadWidgetConfig() en index.html.</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── LOGS ── */}
      {tab === 'logs' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <button className="btn btn-ghost btn-sm" onClick={loadLogs} disabled={logsLoading}>
              {logsLoading ? 'Cargando…' : '↻ Actualizar'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={clearLogs} disabled={clearingLogs} style={{ color: 'var(--red)' }}>
              Limpiar logs
            </button>
            <span style={{ fontSize: 11, color: 'var(--g04)', marginLeft: 'auto' }}>{logs.length} entradas</span>
          </div>

          {logs.length === 0 && !logsLoading && (
            <div style={{ background: 'var(--g01)', border: '1px solid var(--g03)', borderRadius: 'var(--radius-lg)', padding: 24, color: 'var(--g05)', fontSize: 13 }}>
              No hay logs. Interactúa con el widget o guarda configuración para generar entradas.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {logs.map((log, i) => (
              <div key={i} style={{ background: 'var(--g01)', border: '1px solid var(--g03)', borderRadius: 8, padding: '10px 14px', display: 'flex', gap: 12, alignItems: 'flex-start', fontFamily: 'var(--f-mono)', fontSize: 11 }}>
                <span style={{ color: 'var(--g04)', flexShrink: 0 }}>{new Date(log.ts).toLocaleString('es', { hour12: false })}</span>
                <span style={{ color: logColor(log.level), fontWeight: 600, flexShrink: 0, width: 40 }}>{log.level.toUpperCase()}</span>
                <span style={{ color: 'var(--g06)', flexShrink: 0 }}>[{log.source}]</span>
                <span style={{ color: 'var(--g07)' }}>{log.msg}</span>
                {log.detail && <span style={{ color: 'var(--g04)', marginLeft: 'auto', flexShrink: 0 }}>{log.detail}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CHANGELOG ── */}
      {tab === 'changelog' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {CHANGELOG.map((v, i) => (
            <div key={i} style={{ background: 'var(--g01)', border: '1px solid var(--g03)', borderRadius: 'var(--radius-lg)', padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span style={{ fontFamily: 'var(--f-mono)', fontWeight: 700, fontSize: 13, color: 'var(--acc)' }}>{v.version}</span>
                <span style={{ fontSize: 11, color: 'var(--g04)' }}>{v.date}</span>
                {i === 0 && <span style={{ fontSize: 10, background: 'var(--acc-g)', color: 'var(--acc)', border: '1px solid rgba(44,185,120,0.3)', borderRadius: 20, padding: '2px 8px', fontWeight: 600 }}>Actual</span>}
              </div>
              <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {v.items.map((item, j) => (
                  <li key={j} style={{ fontSize: 12.5, color: 'var(--g05)', lineHeight: 1.5 }}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
