import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'nj-worktrace',
  description: 'Technical foundation - executable scaffold',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
