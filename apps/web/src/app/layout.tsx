import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import { FlashProvider } from '@planit/ui';
import { AuthProvider } from '@/contexts/auth-context';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'PLANIT — Gestion des emplois du temps ISM',
  description: "Plateforme de planification scolaire de l'ISM Dakar",
  // Favicon généré via realfavicongenerator — fichiers dans apps/web/public/favicon/.
  // Câblé via l'API Metadata (idiome App Router) plutôt que des <link> bruts.
  icons: {
    // SVG (vectoriel, net à toute taille) + PNG 96 en repli ; le .ico reste
    // uniquement en `shortcut` legacy. Ne PAS déclarer le .ico en `rel=icon`
    // sizes="any" : Chrome le préfère alors au SVG → favicon pixelisé.
    icon: [
      { url: '/favicon/favicon-96x96.png', type: 'image/png', sizes: '96x96' },
      { url: '/favicon/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/favicon/apple-touch-icon.png', sizes: '180x180' }],
    shortcut: ['/favicon/favicon.ico'],
  },
  manifest: '/favicon/site.webmanifest',
  appleWebApp: {
    title: 'PLANIT',
  },
};

// Next.js App Router requires default export for layout
// eslint-disable-next-line no-restricted-syntax
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${inter.variable} ${poppins.variable}`}>
      <body>
        <FlashProvider>
          <AuthProvider>{children}</AuthProvider>
        </FlashProvider>
      </body>
    </html>
  );
}
