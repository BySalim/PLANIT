import type { ReactNode } from 'react';
import { RequireAuth } from '@/components/auth/require-auth';

// Espace Direction (V05 LOT 3) — pages exclusives Direction (Personnel, Années).
// RBAC réel = guards NestJS (DIRECTION). Ce layout est le gate UX frontend.
// Next.js App Router requires default export for layout
// eslint-disable-next-line no-restricted-syntax
export default function DirectionLayout({ children }: { children: ReactNode }) {
  return <RequireAuth roles={['DIRECTION']}>{children}</RequireAuth>;
}
