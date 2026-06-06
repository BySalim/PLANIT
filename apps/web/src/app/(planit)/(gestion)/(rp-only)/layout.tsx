import type { ReactNode } from 'react';
import { RequireAuth } from '@/components/auth/require-auth';

// Sous-groupe `(rp-only)` du groupe `(gestion)` — invisible dans l'URL. Réservé
// aux pages **exclusivement RP** (V3-D9, LOT 6 G.1) : `Maquettes`, `Formations`,
// `Filières`, `UE & Modules`. Un AC qui force l'une de ces URLs est redirigé par
// `<RequireAuth>` vers `/` (son home AC) — comportement existant du guard.
//
// Le RBAC réel est côté serveur ; ce wrapper est UX (redirection silencieuse).
// Next.js App Router requires default export for layout
// eslint-disable-next-line no-restricted-syntax
export default function RpOnlyLayout({ children }: { children: ReactNode }) {
  return <RequireAuth roles={['RESPONSABLE_PROGRAMME']}>{children}</RequireAuth>;
}
