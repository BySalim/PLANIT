import { createParamDecorator } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Role } from '@planit/contracts';

/**
 * Payload injecté dans `req.user` par `JwtAccessStrategy.validate` après
 * vérification de la signature et de l'expiration du cookie `access`.
 *
 * Volontairement minimal : `role` est embarqué pour permettre au `RolesGuard`
 * de décider sans hit BD. Tout besoin enrichi (fullName, matricule, classeId)
 * passe par `GET /auth/me` qui requête `User` en BD.
 */
export interface CurrentUserPayload {
  id: string;
  email: string;
  role: Role;
}

/**
 * Récupère `req.user` typé. Lever immédiatement si absent : signal qu'on a
 * oublié de poser `JwtAuthGuard` (ou que la route est publique mais n'aurait
 * pas dû recevoir ce décorateur).
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserPayload => {
    const req = ctx.switchToHttp().getRequest<{ user?: CurrentUserPayload }>();
    if (!req.user) {
      throw new Error('CurrentUser decorator used without authentication guard');
    }
    return req.user;
  },
);
