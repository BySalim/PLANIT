import type { ReactNode } from 'react';
import { RequireAuth } from '@/components/auth/require-auth';

// Next.js App Router requires default export for layout
// eslint-disable-next-line no-restricted-syntax
export default function EnseignantLayout({ children }: { children: ReactNode }) {
  return <RequireAuth roles={['ENSEIGNANT']}>{children}</RequireAuth>;
}
