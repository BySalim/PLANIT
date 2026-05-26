import type { ReactNode } from 'react';
import { QueryProvider } from '@/app/providers';
import { DevAuthBadge } from '@/components/auth/dev-auth-badge';
import { ForbiddenListener } from '@/components/auth/forbidden-listener';

// Next.js App Router requires default export for layout
// eslint-disable-next-line no-restricted-syntax
export default function PlanitLayout({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      {children}
      <ForbiddenListener />
      <DevAuthBadge />
    </QueryProvider>
  );
}
