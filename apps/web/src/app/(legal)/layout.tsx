import Link from 'next/link';

/**
 * Chrome commun des pages légales publiques (mentions légales / politique de
 * confidentialité — V04 LOT 8.8). Hors du groupe `(planit)` → pas de
 * `<RequireAuth>` : ces pages sont accessibles sans authentification (allowlist
 * `middleware.ts`). Server component : contenu statique, aucun JS client.
 */
// Next.js App Router requires default export for layout
// eslint-disable-next-line no-restricted-syntax
export default function LegalLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col bg-bg text-text">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-4">
          <Link href="/" className="inline-flex items-center" aria-label="Accueil PLANIT">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/logo-wordmark-color.svg"
              alt="PLANIT"
              width={407}
              height={88}
              className="h-8 w-auto"
            />
          </Link>
          <Link href="/login" className="text-sm font-medium text-primary hover:underline">
            Se connecter
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">{children}</main>

      <footer className="border-t border-border bg-surface">
        <nav className="mx-auto flex w-full max-w-2xl flex-wrap gap-x-5 gap-y-1 px-4 py-6 text-sm text-text-muted">
          <Link href="/mentions-legales" className="hover:text-text hover:underline">
            Mentions légales
          </Link>
          <Link href="/politique-confidentialite" className="hover:text-text hover:underline">
            Politique de confidentialité
          </Link>
          <Link href="/login" className="hover:text-text hover:underline">
            Connexion
          </Link>
        </nav>
      </footer>
    </div>
  );
}
