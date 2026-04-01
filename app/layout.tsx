import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: 'ORQO Dashboard',
  description: 'Configura y administra tu asistente ORQO',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Script id="orqo-ui-bootstrap" strategy="beforeInteractive">
          {`
            (function () {
              try {
                var theme = localStorage.getItem('orqo_theme');
                if (theme === 'dark' || theme === 'light') {
                  document.documentElement.setAttribute('data-theme', theme);
                }
              } catch (_) {}

              try {
                var raw = localStorage.getItem('orqo_brand_theme_v1');
                if (!raw) return;
                var data = JSON.parse(raw || '{}');
                var normalizeHex = function (value, fallback) {
                  var input = String(value || '').trim();
                  var withHash = input.charAt(0) === '#' ? input : '#' + input;
                  return /^#[0-9a-fA-F]{6}$/.test(withHash) ? withHash : fallback;
                };
                var toRgb = function (hex) {
                  var safe = normalizeHex(hex, '#000000').slice(1);
                  return {
                    r: parseInt(safe.slice(0, 2), 16),
                    g: parseInt(safe.slice(2, 4), 16),
                    b: parseInt(safe.slice(4, 6), 16)
                  };
                };
                var p = normalizeHex(data.primary, '#2CB978');
                var s = normalizeHex(data.secondary, '#0B100D');
                var pr = toRgb(p);
                var sr = toRgb(s);
                var root = document.documentElement;
                root.style.setProperty('--acc', p);
                root.style.setProperty('--acc-g', 'rgba(' + pr.r + ',' + pr.g + ',' + pr.b + ',0.12)');
                root.style.setProperty('--acc-g2', 'rgba(' + pr.r + ',' + pr.g + ',' + pr.b + ',0.06)');
                root.style.setProperty('--portal-brand-glow-1', 'rgba(' + pr.r + ',' + pr.g + ',' + pr.b + ',0.22)');
                root.style.setProperty('--portal-brand-glow-2', 'rgba(' + pr.r + ',' + pr.g + ',' + pr.b + ',0.10)');
                root.style.setProperty('--portal-brand-shadow', 'rgba(' + pr.r + ',' + pr.g + ',' + pr.b + ',0.18)');
                root.style.setProperty('--portal-brand-gradient', 'linear-gradient(135deg, rgba(' + pr.r + ',' + pr.g + ',' + pr.b + ',0.22), rgba(' + sr.r + ',' + sr.g + ',' + sr.b + ',0.20))');
              } catch (_) {}
            })();
          `}
        </Script>
        {children}
      </body>
    </html>
  );
}
