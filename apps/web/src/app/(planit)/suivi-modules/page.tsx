'use client';

import { RequireAuth } from '@/components/auth/require-auth';
import { EnseignantSuiviView } from '@/components/consult/enseignant-suivi';
import { EtudiantSuiviView } from '@/components/consult/etudiant-suivi';
import { RpSuiviView } from '@/components/rp/suivi/rp-suivi-view';
import { useAuth } from '@/contexts/auth-context';

/**
 * `/suivi-modules` role-aware — LOT 9 S.6 (V3-D14).
 *
 * URL unique pour tous les acteurs (hors sous-groupes `(consult)`/`(gestion)`
 * pour éviter le conflit de routes parallèles). Le rendu dépend du rôle :
 *  - RP / AC → vue gestion (table + filtres + Terminer/Rouvrir) — LOT 5
 *  - ENSEIGNANT → vue pivot (ses modules × classes) — S.5
 *  - ETUDIANT / Délégué → vue consultation (sa classe, lecture seule) — S.4
 *
 * `RequireAuth roles={[]}` exige une session (n'importe quel rôle) ; le RBAC
 * réel reste serveur (guards NestJS).
 */
// Next.js App Router requires default export for page
// eslint-disable-next-line no-restricted-syntax
export default function SuiviModulesPage() {
  return (
    <RequireAuth roles={[]}>
      <SuiviByRole />
    </RequireAuth>
  );
}

function SuiviByRole() {
  const { state } = useAuth();
  // RequireAuth garantit l'état authentifié au rendu des enfants ; filet typé.
  if (state.status !== 'authenticated') return null;
  const { role } = state.user;

  // V05 LOT 6 — la Direction consomme la vue de gestion en lecture seule (les
  // actions Terminer/Rouvrir/bulk sont gated sur `isRP` dans RpSuiviView). Avant,
  // DIRECTION tombait dans la vue Étudiant → erreur (pas d'inscription).
  if (role === 'RESPONSABLE_PROGRAMME' || role === 'ASSISTANT_PROGRAMME' || role === 'DIRECTION') {
    return <RpSuiviView />;
  }
  if (role === 'ENSEIGNANT') {
    return <EnseignantSuiviView />;
  }
  // ETUDIANT + RESPONSABLE_CLASSE → vue étudiant
  return <EtudiantSuiviView />;
}
