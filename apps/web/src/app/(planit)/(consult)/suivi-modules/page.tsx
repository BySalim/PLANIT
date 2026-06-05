'use client';

import { EnseignantSuiviView } from '@/components/consult/enseignant-suivi';
import { EtudiantSuiviView } from '@/components/consult/etudiant-suivi';
import { useAuth } from '@/contexts/auth-context';

/**
 * `/suivi-modules` role-aware — LOT 9 S.6 (V3-D14).
 *
 * Rendu selon le rôle authentifié :
 *  - ENSEIGNANT → vue pivot (ses modules × classes)
 *  - ETUDIANT / RESPONSABLE_CLASSE → vue consultation (sa classe, lecture seule)
 *
 * RP / AC arrivent ici uniquement par navigation directe (la sidebar RP pointe
 * vers `(gestion)/suivi-modules`). Le layout `(consult)` bloque les rôles RP/AC
 * via `RequireAuth roles={['ENSEIGNANT', 'ETUDIANT', 'RESPONSABLE_CLASSE']}`.
 */
// Next.js App Router requires default export for page
// eslint-disable-next-line no-restricted-syntax
export default function SuiviModulesConsultPage() {
  const { state } = useAuth();

  // RequireAuth dans le layout garantit l'état authentifié — filet typé.
  if (state.status !== 'authenticated') return null;

  if (state.user.role === 'ENSEIGNANT') {
    return <EnseignantSuiviView />;
  }

  // ETUDIANT + RESPONSABLE_CLASSE → vue étudiant
  return <EtudiantSuiviView />;
}
