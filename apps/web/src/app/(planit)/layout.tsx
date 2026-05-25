import type { ReactNode } from 'react';
import { QueryProvider } from '@/app/providers';
import { DevAuthProvider } from '@/components/dev-auth-provider';

// Next.js App Router requires default export for layout
// eslint-disable-next-line no-restricted-syntax
export default function PlanitLayout({ children }: { children: ReactNode }) {
  // V02 LOT 1 : DevAuthProvider est un stub temporaire — voir
  // `apps/web/src/lib/dev-auth.ts`. À retirer au merge du LOT 6 (auth frontend).
  return (
    <QueryProvider>
      <DevAuthProvider>{children}</DevAuthProvider>
    </QueryProvider>
  );
}
