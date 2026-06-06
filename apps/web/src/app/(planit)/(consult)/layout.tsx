import type { ReactNode } from 'react';
import { RequireAuth } from '@/components/auth/require-auth';

// Groupe de routes « consultation » (`/planning`, `/seance/:id`) — invisible
// dans l'URL. RBAC front : réservé aux acteurs non-RP. Le RBAC réel reste
// serveur (guards NestJS).
// Next.js App Router requires default export for layout
// eslint-disable-next-line no-restricted-syntax
export default function ConsultLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth roles={['ENSEIGNANT', 'ETUDIANT', 'RESPONSABLE_CLASSE']}>{children}</RequireAuth>
  );
}
