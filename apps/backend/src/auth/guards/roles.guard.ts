import { ForbiddenException, Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@planit/contracts';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { CurrentUserPayload } from '../decorators/current-user.decorator';

/**
 * Guard global RBAC, exécuté APRÈS `JwtAuthGuard` (cf. ordre de
 * déclaration dans `AppModule`). Sans métadonnée `@Roles()`, on laisse
 * passer (auth seule suffit). Avec, on compare au `req.user.role`.
 *
 * Lève `ForbiddenException` (403) si l'utilisateur n'a pas le bon rôle.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest<{ user?: CurrentUserPayload }>();
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('Authentification requise');
    }

    if (!required.includes(user.role)) {
      throw new ForbiddenException('Rôle insuffisant pour cette opération');
    }
    return true;
  }
}
