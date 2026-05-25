import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { JwtFromRequestFunction } from 'passport-jwt';
import { REFRESH_COOKIE_NAME } from '../cookies';

/**
 * Payload attaché à `req.user` après `JwtRefreshGuard`. Le contrôleur
 * récupère le token brut depuis le cookie pour le `timingSafeEqual` côté
 * service (cf. `AuthService.refresh`).
 */
export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  familyId: string;
  rawToken: string;
}

interface RequestWithCookies {
  cookies?: Record<string, string | undefined>;
}

const refreshCookieExtractor: JwtFromRequestFunction<RequestWithCookies> = (req) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  return typeof token === 'string' && token.length > 0 ? token : null;
};

interface RawRefreshPayload {
  sub?: unknown;
  jti?: unknown;
  familyId?: unknown;
}

/**
 * Strategy `jwt-refresh` utilisée uniquement par `JwtRefreshGuard` sur
 * `POST /api/auth/refresh`. `passReqToCallback: true` permet de remonter
 * la chaîne brute jusqu'au service pour la comparaison hash SHA-256.
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor() {
    const secret = process.env['JWT_REFRESH_SECRET'];
    if (!secret || secret.length === 0) {
      throw new Error("JWT_REFRESH_SECRET manquant dans l'environnement");
    }
    super({
      jwtFromRequest: ExtractJwt.fromExtractors<RequestWithCookies>([refreshCookieExtractor]),
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: true,
    });
  }

  validate(req: RequestWithCookies, payload: RawRefreshPayload): RefreshTokenPayload {
    if (
      typeof payload.sub !== 'string' ||
      typeof payload.jti !== 'string' ||
      typeof payload.familyId !== 'string'
    ) {
      throw new UnauthorizedException('Payload JWT refresh invalide');
    }
    const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (typeof rawToken !== 'string' || rawToken.length === 0) {
      throw new UnauthorizedException('Refresh cookie manquant');
    }
    return {
      sub: payload.sub,
      jti: payload.jti,
      familyId: payload.familyId,
      rawToken,
    };
  }
}
