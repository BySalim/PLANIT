import type { ReactNode } from 'react';

// Next.js App Router requires default export for layout
// eslint-disable-next-line no-restricted-syntax
export default function LoginLayout({ children }: { children: ReactNode }) {
  // `<main>` (et non `<div>`) pour satisfaire l'audit Lighthouse
  // `landmark-one-main` — toute page publique doit exposer un landmark
  // principal pour les lecteurs d'écran.
  return (
    <>
      {/* Preload du logo wordmark = LCP de la page /login (audit
          Lighthouse `prioritize-lcp-image`). Next.js promeut ce <link>
          dans le <head> automatiquement. */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="preload" as="image" href="/brand/logo-wordmark-color.svg" />
      <main className="flex min-h-screen items-center justify-center bg-bg">{children}</main>
    </>
  );
}
