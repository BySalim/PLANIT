'use client';

import { useAuth, type UserRole } from '@/contexts/auth-context';

/**
 * Petits helpers de branchement par rôle (V3-D13). À préférer à
 * `state.user.role === 'X'` répété partout : un seul point d'évolution si
 * l'enum bouge (`ASSISTANT_PROGRAMME` → `RESPONSABLE_PEDAGOGIQUE`, etc.).
 *
 * `useRole()` retourne `null` tant que `<AuthProvider>` n'a pas résolu —
 * les composants montés sous `<RequireAuth>` n'observent jamais ce null
 * mais les pages racine (sidebar, topbar) peuvent l'observer pendant le boot.
 */

export function useRole(): UserRole | null {
  const { state } = useAuth();
  return state.status === 'authenticated' ? state.user.role : null;
}

export function useIsRp(): boolean {
  return useRole() === 'RESPONSABLE_PROGRAMME';
}

export function useIsAc(): boolean {
  return useRole() === 'ASSISTANT_PROGRAMME';
}

/** V05 LOT 3 — Direction d'école (périmètre école). RBAC réel = gardes serveur. */
export function useIsDirection(): boolean {
  return useRole() === 'DIRECTION';
}

/** V05 — espace Admin système (cross-école). RBAC réel = gardes serveur. */
export function useIsAdmin(): boolean {
  const role = useRole();
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

export function useIsAuthenticated(): boolean {
  const { state } = useAuth();
  return state.status === 'authenticated';
}

/**
 * Libellé UI du rôle. Affiché dans le bloc profil sidebar et toute carte
 * « Mon compte ». Conforme au vocabulaire métier (CLAUDE.md) :
 * `ASSISTANT_PROGRAMME` = « Attaché de classe » (**jamais « AP »**).
 */
export function roleLabel(role: UserRole): string {
  switch (role) {
    case 'RESPONSABLE_PROGRAMME':
      return 'Responsable de programme';
    case 'ASSISTANT_PROGRAMME':
      return 'Attaché de classe';
    case 'ENSEIGNANT':
      return 'Enseignant·e';
    case 'ETUDIANT':
      return 'Étudiant·e';
    case 'RESPONSABLE_CLASSE':
      return 'Délégué·e';
    case 'SUPER_ADMIN':
      return 'Super administrateur·rice';
    case 'ADMIN':
      return 'Administrateur·rice';
    case 'DIRECTION':
      return 'Direction';
    case 'PARTENAIRE':
      return 'Partenaire';
  }
}
