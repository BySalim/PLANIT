'use client';

import { useAuth, type UserRole } from '@/contexts/auth-context';

/**
 * Variante d'affichage des vues « consultation » (home dashboard, planning,
 * détail séance) partagées entre acteurs non-RP. `teacher` = enseignant,
 * `student` = étudiant / délégué.
 */
export type ActorVariant = 'teacher' | 'student';

export interface CurrentActor {
  readonly id: string;
  readonly fullName: string;
  readonly role: UserRole;
  readonly variant: ActorVariant;
}

// Fallback si l'état auth n'est pas encore résolu. `RequireAuth` garantit que ce
// cas ne se produit pas une fois la page rendue côté authentifié.
const HARDCODED: CurrentActor = {
  id: 'seed-teacher-algo',
  fullName: 'M. Oumar Ndiaye',
  role: 'ENSEIGNANT',
  variant: 'teacher',
};

function variantForRole(role: UserRole): ActorVariant {
  return role === 'ETUDIANT' || role === 'RESPONSABLE_CLASSE' ? 'student' : 'teacher';
}

/**
 * Acteur courant pour les vues consultation role-agnostiques (`/`, `/planning`,
 * `/seance/:id`). Remplace `useCurrentTeacher` / `useCurrentStudent` : un seul
 * hook qui lit l'identité auth réelle et dérive la `variant` d'affichage du rôle.
 *
 * Le filtre planning serveur dépend de la `variant` : `teacher` → `teacherId`,
 * `student` → `studentId` (cf. pages consult). Le câblage sur un id métier
 * distinct de l'id User reste suivi en `TD-022`.
 */
export function useCurrentActor(): CurrentActor {
  const { state } = useAuth();
  if (state.status !== 'authenticated') return HARDCODED;
  const { id, fullName, role } = state.user;
  return { id, fullName, role, variant: variantForRole(role) };
}
