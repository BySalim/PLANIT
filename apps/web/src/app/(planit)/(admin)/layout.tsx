import type { ReactNode } from 'react';
import { RequireAuth } from '@/components/auth/require-auth';

// Espace système Admin (V05 LOT 1.6 / V5-D9) — sous-groupe `(admin)` invisible
// dans l'URL. Role-gaté ADMIN / SUPER_ADMIN ; un autre rôle est redirigé vers sa
// home par `<RequireAuth>` (le RBAC réel reste côté serveur). Chaque page rend
// son propre `<Shell>` (même pattern que les pages `(gestion)`).
// Next.js App Router requires default export for layout
// eslint-disable-next-line no-restricted-syntax
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <RequireAuth roles={['ADMIN', 'SUPER_ADMIN']}>{children}</RequireAuth>;
}
