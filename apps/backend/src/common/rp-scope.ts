import type { Role } from '@planit/contracts';

/**
 * Espaces de travail RP isolés (V05 LOT 6 / ADR-0022).
 *
 * Un RESPONSABLE_PROGRAMME ne voit que ce qu'il a **créé** (`ownerRpId = self`).
 * La Direction voit toute son école (aucun filtre owner), l'AC reste borné à ses
 * classes assignées (cf. `AcScopeService`), l'Admin est cross-école.
 *
 * Helpers **purs** (sans accès BD ni DI) : le filtrage owner est un simple
 * fragment de `where` composé par chaque service avec son scope école/AC
 * existant. Plus léger qu'un service injectable (cf. `AcScopeService` qui, lui,
 * doit consulter la table `AssistantClasse`).
 */
export function isRp(role: Role): boolean {
  return role === 'RESPONSABLE_PROGRAMME';
}

/**
 * Fragment `where` restreignant au périmètre de travail d'un RP. Pour tout autre
 * rôle, renvoie `{}` (aucune restriction owner — le scope école/AC s'applique en
 * amont). À composer en AND avec le scope école existant.
 */
export function rpOwnerWhere(user: { role: Role; id: string }): { ownerRpId?: string } {
  return isRp(user.role) ? { ownerRpId: user.id } : {};
}
