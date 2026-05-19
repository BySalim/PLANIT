import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PLANIT — Gestion des emplois du temps ISM',
  description: "Plateforme de planification scolaire de l'ISM Dakar",
};

// Next.js App Router requires default export for layout
// eslint-disable-next-line no-restricted-syntax
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
