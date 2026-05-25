import { SetMetadata } from '@nestjs/common';
import type { Role } from '@planit/contracts';

/**
 * Métadonnée lue par `RolesGuard` : liste des rôles autorisés à appeler la
 * route. Si aucun `@Roles()` n'est posé, le `RolesGuard` laisse passer
 * (la décision RBAC est opt-in ; l'auth elle-même reste fail-closed via
 * `JwtAuthGuard`).
 */
export const ROLES_KEY = 'roles';

export const Roles = (...roles: Role[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
