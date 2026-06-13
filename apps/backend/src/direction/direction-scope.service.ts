import { Injectable } from '@nestjs/common';
import type { Role } from '@planit/contracts';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { requireEcole } from '../auth/decorators/current-user.decorator';

/**
 * Périmètre d'un acteur DIRECTION (LOT 2 / V5-D2 / ADR-0019).
 *
 * Service **transverse** : lit `user.ecoleId` embarqué dans le JWT — zéro
 * hit BD supplémentaire pour résoudre le scope. Analogie avec `AcScopeService`
 * (V3-D9) mais plus simple : l'école est directement embarquée dans le token,
 * aucune table intermédiaire à consulter.
 *
 * Pattern :
 *  - `isDirection(role)` → boolean, pour les branches conditionnelles
 *  - `requireEcoleId(user)` → string | 403 (jamais null pour une DIRECTION
 *     seedée correctement, mais gardé comme garde-fou)
 */
@Injectable()
export class DirectionScopeService {
  isDirection(role: Role): boolean {
    return role === 'DIRECTION';
  }

  /**
   * Retourne l'`ecoleId` non-null du user. Lève 403 si null (cas ADMIN/
   * SUPER_ADMIN cross-école — ne devrait jamais arriver côté Direction car
   * les guards `@Roles` bloquent en amont).
   */
  requireEcoleId(user: CurrentUserPayload): string {
    return requireEcole(user);
  }
}
