'use client';

import { RequireAuth } from '@/components/auth/require-auth';
import { ActorHomeView } from '@/components/consult/actor-home-view';
import { RpPlanningView } from '@/components/rp/rp-planning-view';
import { useAuth } from '@/contexts/auth-context';

/**
 * Home role-agnostique — URL `/`. Remplace l'ancien résolveur `app/page.tsx` et
 * les pages `/rp` · `/enseignant` · `/etudiant`. `RequireAuth roles={[]}` exige
 * une session (n'importe quel rôle) puis on rend la vue selon le rôle connecté :
 *  - RP / AC → grille planning (admin)
 *  - Enseignant / Étudiant / Délégué → dashboard consultation
 */
// Next.js App Router requires default export for page
// eslint-disable-next-line no-restricted-syntax
export default function HomePage() {
  return (
    <RequireAuth roles={[]}>
      <HomeByRole />
    </RequireAuth>
  );
}

function HomeByRole() {
  const { state } = useAuth();
  // RequireAuth garantit l'état authentifié au rendu des enfants ; filet typé.
  if (state.status !== 'authenticated') return null;
  const { role } = state.user;
  if (role === 'RESPONSABLE_PROGRAMME' || role === 'ASSISTANT_PROGRAMME') {
    return <RpPlanningView />;
  }
  return <ActorHomeView />;
}
