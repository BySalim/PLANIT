import { Injectable } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Guard global d'authentification, enregistré via `APP_GUARD` dans
 * `AppModule`. Lit le cookie `access` via `JwtAccessStrategy` puis attache
 * `req.user = { id, email, role }`.
 *
 * **Fail-closed** : tout endpoint sans `@Public()` exige un cookie valide.
 * Une 401 est levée automatiquement par Passport si le cookie est absent,
 * expiré, ou signé avec une clé inconnue.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt-access') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  override canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic === true) {
      return true;
    }
    return super.canActivate(context) as boolean | Promise<boolean>;
  }
}
