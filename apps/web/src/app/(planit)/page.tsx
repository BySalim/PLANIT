'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RequireAuth } from '@/components/auth/require-auth';
import { ActorHomeView } from '@/components/consult/actor-home-view';
import { DirectionHomeView } from '@/components/direction/direction-home-view';
import { RpPlanningView } from '@/components/rp/rp-planning-view';
import { useAuth, ROLE_HOME } from '@/contexts/auth-context';

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
  const router = useRouter();
  const role = state.status === 'authenticated' ? state.user.role : null;

  // V05 — un compte Admin système n'a pas de vue planning : on le renvoie vers
  // son espace cross-école (ROLE_HOME). Effet plutôt que redirect au rendu pour
  // rester compatible client/Suspense (pattern login page).
  useEffect(() => {
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
      router.replace(ROLE_HOME[role]);
    }
  }, [role, router]);

  // RequireAuth garantit l'état authentifié au rendu des enfants ; filet typé.
  if (state.status !== 'authenticated') return null;
  if (role === 'RESPONSABLE_PROGRAMME' || role === 'ASSISTANT_PROGRAMME') {
    return <RpPlanningView />;
  }
  // Admin : redirection en cours (effet ci-dessus) → ne rien rendre.
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') return null;
  // Direction : vue pilotage école (V05 LOT 3).
  if (role === 'DIRECTION') return <DirectionHomeView />;
  return <ActorHomeView />;
}
