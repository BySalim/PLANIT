import type { ReactNode } from 'react';
import { RequireAuth } from '@/components/auth/require-auth';

// Groupe de routes « gestion » / administration (`/enseignants`, `/filieres`,
// `/ue-modules`) — invisible dans l'URL. RBAC front : réservé au RP / AC / Direction.
// V05 LOT 3 : DIRECTION ajouté pour accès enseignants, étudiants, classes, salles.
// Le RBAC réel reste serveur (guards NestJS).
// Next.js App Router requires default export for layout
// eslint-disable-next-line no-restricted-syntax
export default function GestionLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth roles={['RESPONSABLE_PROGRAMME', 'ASSISTANT_PROGRAMME', 'DIRECTION']}>
      {children}
    </RequireAuth>
  );
}
