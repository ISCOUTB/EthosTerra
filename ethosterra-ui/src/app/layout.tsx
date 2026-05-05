import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EthosTerra',
  description: 'Simulador Social BDI de Familias Campesinas',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
