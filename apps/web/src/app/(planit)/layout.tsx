import type { ReactNode } from 'react';
import { QueryProvider } from '@/app/providers';
import { ForbiddenListener } from '@/components/auth/forbidden-listener';
import { DevToolsFloater } from '@/components/dev/dev-tools-floater';
import { LogoutFloater } from '@/components/layout/logout-floater';

// Next.js App Router requires default export for layout
// eslint-disable-next-line no-restricted-syntax
export default function PlanitLayout({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      {children}
      <ForbiddenListener />
      {/* Déconnexion flottante (prod) — visible dès qu'on est authentifié. */}
      <LogoutFloater />
      <DevToolsFloater />
    </QueryProvider>
  );
}
