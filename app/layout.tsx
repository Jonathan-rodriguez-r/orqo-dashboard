import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ORQO Dashboard',
  description: 'Configura y administra tu asistente ORQO',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
