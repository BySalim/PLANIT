import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { loginSchema } from '@planit/contracts';
import type { LoginDto, AuthMeDto } from '@planit/contracts';
import type { Logger } from 'pino';
import { PINO_LOGGER } from '../common/logger.module';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import type { CurrentUserPayload } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { clearAuthCookies, setAuthCookies } from './cookies';
import type { RefreshTokenPayload } from './strategies/jwt-refresh.strategy';

/**
 * Sous-ensemble Express utilisé par ce controller. On les déclare en local
 * pour éviter une dépendance directe à `@types/express` — `cookie-parser`
 * pose `req.cookies` et `res.cookie` est fourni par express.
 */
interface RequestLike {
  headers: { 'user-agent'?: string };
  ip?: string;
  socket?: { remoteAddress?: string };
  user?: CurrentUserPayload | RefreshTokenPayload;
}

interface ResponseLike {
  cookie(name: string, value: string, options?: unknown): unknown;
  clearCookie(name: string, options?: unknown): unknown;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    @Inject(PINO_LOGGER) private readonly logger: Logger,
  ) {}

  /** Login email + password → 2 cookies HttpOnly. */
  @Public()
  @Post('login')
  @HttpCode(200)
  // 5 tentatives / minute / IP en plus du throttle global (anti brute-force).
  // En env `test`, on remonte la limite pour laisser passer les helpers
  // `loginAs` qui appellent /login plusieurs fois par suite — cohérent avec
  // la logique de `app.module.ts` (DEFAULT_LIMIT).
  @Throttle({
    default: {
      limit: () => (process.env['NODE_ENV'] === 'test' ? 10_000 : 5),
      ttl: 60_000,
    },
  })
  @ApiOperation({ summary: 'Login email + password' })
  @ApiResponse({ status: 200, description: 'Login réussi, cookies posés' })
  @ApiResponse({ status: 401, description: 'Identifiants invalides' })
  @ApiResponse({ status: 429, description: 'Trop de tentatives' })
  async login(
    @Body(new ZodValidationPipe(loginSchema)) dto: LoginDto,
    @Req() req: RequestLike,
    @Res({ passthrough: true }) res: ResponseLike,
  ): Promise<AuthMeDto> {
    const { accessToken, refreshToken, user } = await this.auth.login(dto, ctxFrom(req));
    setAuthCookies(res, accessToken, refreshToken);
    return user;
  }

  /** Rotation refresh — protégée par cookie `refresh` valide. */
  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(200)
  @ApiCookieAuth('refresh')
  @ApiOperation({ summary: 'Rotation du refresh token' })
  @ApiResponse({ status: 200, description: 'Nouveaux cookies posés' })
  @ApiResponse({ status: 401, description: 'Refresh invalide ou réutilisé' })
  async refresh(
    @Req() req: RequestLike,
    @Res({ passthrough: true }) res: ResponseLike,
  ): Promise<AuthMeDto> {
    const payload = req.user as RefreshTokenPayload | undefined;
    if (!payload) {
      // Impossible en pratique : JwtRefreshGuard a rempli req.user.
      throw new Error('Refresh payload absent');
    }
    try {
      const { accessToken, refreshToken, user } = await this.auth.refresh(payload, ctxFrom(req));
      setAuthCookies(res, accessToken, refreshToken);
      return user;
    } catch (err) {
      // Réutilisation détectée ou hash invalide → on clear côté client aussi.
      clearAuthCookies(res);
      throw err;
    }
  }

  /** Logout : révoque le refresh + clear cookies. */
  @Post('logout')
  @HttpCode(204)
  @ApiCookieAuth('access')
  @ApiOperation({ summary: 'Déconnexion' })
  @ApiResponse({ status: 204, description: 'Cookies effacés' })
  async logout(
    @Req() req: RequestLike,
    @Res({ passthrough: true }) res: ResponseLike,
  ): Promise<void> {
    const refreshPayload = await this.tryReadRefreshJti(req);
    await this.auth.logout(refreshPayload);
    clearAuthCookies(res);
  }

  /** Identité de l'utilisateur connecté — utilisé par le hook `useAuth`. */
  @Get('me')
  @ApiCookieAuth('access')
  @ApiOperation({ summary: 'Profil utilisateur courant' })
  @ApiResponse({ status: 200, description: 'Profil' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  me(@CurrentUser() user: CurrentUserPayload): Promise<AuthMeDto> {
    return this.auth.me(user.id);
  }

  /**
   * Lecture best-effort du `jti` depuis le cookie `refresh` pour le logout.
   * On ne veut pas faire échouer un logout si le cookie est absent ou
   * partiellement invalide ; on log juste un debug et on continue.
   *
   * Le refresh est un JWT à 3 segments (header.payload.signature). On décode
   * uniquement le payload (base64url) ; aucune vérification de signature ici
   * (le logout doit rester idempotent même si la signature a expiré).
   */
  private async tryReadRefreshJti(req: RequestLike): Promise<string | null> {
    const cookies = (req as RequestLike & { cookies?: Record<string, string> }).cookies;
    const refresh = cookies?.['refresh'];
    if (!refresh) return null;
    const parts = refresh.split('.');
    if (parts.length < 2) return null;
    try {
      const payloadJson = Buffer.from(parts[1] ?? '', 'base64url').toString('utf8');
      const parsed: unknown = JSON.parse(payloadJson);
      if (
        parsed !== null &&
        typeof parsed === 'object' &&
        'jti' in parsed &&
        typeof (parsed as { jti: unknown }).jti === 'string'
      ) {
        return (parsed as { jti: string }).jti;
      }
      return null;
    } catch (err) {
      this.logger.debug({ err }, '[auth] logout: refresh cookie unparsable, ignoring');
      return null;
    }
  }
}

/** Extrait UA + IP du request pour persister dans `RefreshToken`. */
function ctxFrom(req: RequestLike): { userAgent?: string | undefined; ip?: string | undefined } {
  const userAgent = req.headers['user-agent'];
  const ip = req.ip ?? req.socket?.remoteAddress;
  return {
    userAgent: userAgent === undefined ? undefined : userAgent,
    ip: ip === undefined ? undefined : ip,
  };
}
