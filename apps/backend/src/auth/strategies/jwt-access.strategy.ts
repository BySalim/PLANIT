import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { JwtFromRequestFunction } from 'passport-jwt';
import { roleSchema } from '@planit/contracts';
import type { CurrentUserPayload } from '../decorators/current-user.decorator';
import { ACCESS_COOKIE_NAME } from '../cookies';

/**
 * Forme minimum d'une requête express avec un objet `cookies` parsé par
 * `cookie-parser`. Évite une dépendance directe sur `@types/express` ici.
 */
interface RequestWithCookies {
  cookies?: Record<string, string | undefined>;
}

/**
 * Extrait le JWT du cookie `access` (posé par `setAuthCookies`).
 * Retourne `null` si absent, ce qui fait lever 401 par Passport.
 */
const accessCookieExtractor: JwtFromRequestFunction<RequestWithCookies> = (req) => {
  const token = req.cookies?.[ACCESS_COOKIE_NAME];
  return typeof token === 'string' && token.length > 0 ? token : null;
};

interface AccessPayload {
  sub?: unknown;
  email?: unknown;
  role?: unknown;
  ecoleId?: unknown;
}

/**
 * Strategy `jwt-access` consommée par `JwtAuthGuard`.
 *
 * Vérifie la signature HS256 avec `JWT_ACCESS_SECRET`. Le payload renvoyé
 * par `validate()` est attaché à `req.user` et exposé via `@CurrentUser()`.
 */
@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
  constructor() {
    const secret = process.env['JWT_ACCESS_SECRET'];
    if (!secret || secret.length === 0) {
      throw new Error("JWT_ACCESS_SECRET manquant dans l'environnement");
    }
    super({
      jwtFromRequest: ExtractJwt.fromExtractors<RequestWithCookies>([accessCookieExtractor]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  validate(payload: AccessPayload): CurrentUserPayload {
    if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') {
      throw new UnauthorizedException('Payload JWT access invalide');
    }
    const role = roleSchema.safeParse(payload.role);
    if (!role.success) {
      throw new UnauthorizedException('Rôle inconnu dans le JWT access');
    }
    // V05 — ecoleId embarqué (string) ou null pour ADMIN/SUPER_ADMIN (ADR-0019).
    const ecoleId = typeof payload.ecoleId === 'string' ? payload.ecoleId : null;
    return { id: payload.sub, email: payload.email, role: role.data, ecoleId };
  }
}
