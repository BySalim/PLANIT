import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { verify as argon2Verify } from '@node-rs/argon2';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import type { Logger } from 'pino';
import type { LoginDto, AuthMeDto, Role } from '@planit/contracts';
import { PrismaService } from '../common/prisma.service';
import { PINO_LOGGER } from '../common/logger.module';
import { accessTtlSeconds, refreshTtlSeconds } from './cookies';

/** Tuple renvoyé par `login()` / `refresh()` au controller. */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: AuthMeDto;
}

/** Contexte HTTP minimal extrait dans le controller (UA + IP). */
export interface AuthContext {
  userAgent?: string | undefined;
  ip?: string | undefined;
}

/** Payload signé dans le JWT d'accès. */
interface AccessJwtPayload {
  sub: string;
  email: string;
  role: Role;
  ecoleId: string | null; // V05 — école embarquée (ADR-0019)
}

/** Payload signé dans le JWT de refresh. */
interface RefreshJwtPayload {
  sub: string;
  jti: string;
  familyId: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    @Inject(PINO_LOGGER) private readonly logger: Logger,
  ) {}

  /**
   * Login email/password. argon2id verify, puis création d'une **nouvelle
   * famille** de refresh token (multi-device autorisé — ADR-0005 §11).
   */
  async login(dto: LoginDto, ctx: AuthContext): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.passwordHash) {
      this.logger.warn({ email: dto.email }, '[auth] login failed: user not found');
      throw new UnauthorizedException('Identifiants invalides');
    }

    const ok = await argon2Verify(user.passwordHash, dto.password);
    if (!ok) {
      this.logger.warn({ userId: user.id }, '[auth] login failed: bad password');
      throw new UnauthorizedException('Identifiants invalides');
    }

    const familyId = randomUUID();
    const tokens = await this.issueTokens(
      { id: user.id, email: user.email, role: user.role, ecoleId: user.ecoleId },
      familyId,
      ctx,
    );

    this.logger.info({ userId: user.id, role: user.role }, '[auth] login success');

    return {
      ...tokens,
      user: this.toAuthMe(user),
    };
  }

  /**
   * Rotation refresh + détection de réutilisation (ADR-0005 §5).
   *
   * 1. On retrouve le `RefreshToken` par `jti` du payload validé par
   *    Passport (la signature JWT et l'expiration sont déjà vérifiées).
   * 2. Le hash BD est comparé en `timingSafeEqual` au SHA-256 du token brut
   *    posté par le client.
   * 3. Si la row est déjà `revokedAt !== null` → on révoque la famille
   *    entière et on lève 401 (vol détecté).
   * 4. Sinon, transaction atomique : on marque l'ancienne `revokedAt` +
   *    `replacedBy` et on crée la nouvelle row.
   */
  async refresh(
    payload: { sub: string; jti: string; familyId: string; rawToken: string },
    ctx: AuthContext,
  ): Promise<AuthTokens> {
    const existing = await this.prisma.refreshToken.findUnique({
      where: { id: payload.jti },
      include: { user: true },
    });

    if (!existing || existing.userId !== payload.sub || existing.familyId !== payload.familyId) {
      this.logger.warn({ jti: payload.jti }, '[auth] refresh failed: unknown token');
      throw new UnauthorizedException('Refresh token inconnu');
    }

    const presentedHash = this.hashRefreshToken(payload.rawToken);
    const storedHash = Buffer.from(existing.hash, 'hex');
    const presentedHashBuf = Buffer.from(presentedHash, 'hex');
    if (
      storedHash.length !== presentedHashBuf.length ||
      !timingSafeEqual(storedHash, presentedHashBuf)
    ) {
      this.logger.warn(
        { userId: existing.userId, jti: payload.jti },
        '[auth] refresh failed: hash mismatch',
      );
      throw new UnauthorizedException('Refresh token invalide');
    }

    if (existing.revokedAt !== null) {
      // Réutilisation détectée : on révoque toute la famille.
      this.logger.warn(
        { userId: existing.userId, familyId: existing.familyId, jti: payload.jti },
        '[auth] refresh REUSE detected — revoking family',
      );
      await this.prisma.refreshToken.updateMany({
        where: { familyId: existing.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token déjà utilisé');
    }

    if (existing.expiresAt.getTime() <= Date.now()) {
      this.logger.warn(
        { userId: existing.userId, jti: payload.jti },
        '[auth] refresh failed: expired',
      );
      throw new UnauthorizedException('Refresh token expiré');
    }

    // Rotation atomique : update old + create new dans la même transaction.
    const newJti = createCuid();
    const expiresAt = new Date(Date.now() + refreshTtlSeconds() * 1000);

    const refreshJwt = await this.jwt.signAsync(
      {
        sub: existing.userId,
        jti: newJti,
        familyId: existing.familyId,
      } satisfies RefreshJwtPayload,
      {
        secret: this.requiredEnv('JWT_REFRESH_SECRET'),
        expiresIn: refreshTtlSeconds(),
      },
    );
    const newHash = this.hashRefreshToken(refreshJwt);

    await this.prisma.$transaction([
      this.prisma.refreshToken.update({
        where: { id: existing.id },
        data: { revokedAt: new Date(), replacedBy: newJti },
      }),
      this.prisma.refreshToken.create({
        data: {
          id: newJti,
          hash: newHash,
          userId: existing.userId,
          familyId: existing.familyId,
          userAgent: ctx.userAgent ?? null,
          ip: ctx.ip ?? null,
          expiresAt,
        },
      }),
    ]);

    const accessToken = await this.jwt.signAsync(
      {
        sub: existing.user.id,
        email: existing.user.email,
        role: existing.user.role,
        ecoleId: existing.user.ecoleId,
      } satisfies AccessJwtPayload,
      {
        secret: this.requiredEnv('JWT_ACCESS_SECRET'),
        expiresIn: accessTtlSeconds(),
      },
    );

    this.logger.info(
      { userId: existing.userId, familyId: existing.familyId },
      '[auth] refresh rotated',
    );

    return {
      accessToken,
      refreshToken: refreshJwt,
      user: this.toAuthMe(existing.user),
    };
  }

  /** Logout : révoque le refresh courant si fourni (idempotent). */
  async logout(jti: string | null): Promise<void> {
    if (jti === null) return;
    await this.prisma.refreshToken.updateMany({
      where: { id: jti, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    this.logger.info({ jti }, '[auth] logout');
  }

  /**
   * Révoque **toutes** les sessions actives (refresh tokens non révoqués). Outil
   * d'exploitation/incident (VOEU-002) : reseed beta, changement d'accès, ou
   * suspicion de compromission. Les access JWT en cours (stateless) expirent sous
   * `JWT_ACCESS_TTL` ; plus aucun refresh ne réussira → re-login forcé pour tous.
   * Exposé via la CLI `src/scripts/revoke-all-sessions.ts` (pas d'endpoint HTTP).
   */
  async revokeAllSessions(): Promise<{ revoked: number }> {
    const { count } = await this.prisma.refreshToken.updateMany({
      where: { revokedAt: null },
      data: { revokedAt: new Date() },
    });
    this.logger.warn({ revoked: count }, '[auth] ALL sessions revoked (admin CLI)');
    return { revoked: count };
  }

  /** `GET /auth/me` : projection user → DTO public. */
  async me(userId: string): Promise<AuthMeDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }
    return this.toAuthMe(user);
  }

  // ── Internals ──────────────────────────────────────────────────────────

  /** Émet une paire access+refresh et persiste la row `RefreshToken`. */
  private async issueTokens(
    user: { id: string; email: string; role: Role; ecoleId: string | null },
    familyId: string,
    ctx: AuthContext,
  ): Promise<Pick<AuthTokens, 'accessToken' | 'refreshToken'>> {
    const jti = createCuid();
    const expiresAt = new Date(Date.now() + refreshTtlSeconds() * 1000);

    const refreshJwt = await this.jwt.signAsync(
      { sub: user.id, jti, familyId } satisfies RefreshJwtPayload,
      {
        secret: this.requiredEnv('JWT_REFRESH_SECRET'),
        expiresIn: refreshTtlSeconds(),
      },
    );
    const hash = this.hashRefreshToken(refreshJwt);

    await this.prisma.refreshToken.create({
      data: {
        id: jti,
        hash,
        userId: user.id,
        familyId,
        userAgent: ctx.userAgent ?? null,
        ip: ctx.ip ?? null,
        expiresAt,
      },
    });

    const accessToken = await this.jwt.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        ecoleId: user.ecoleId,
      } satisfies AccessJwtPayload,
      {
        secret: this.requiredEnv('JWT_ACCESS_SECRET'),
        expiresIn: accessTtlSeconds(),
      },
    );

    return {
      accessToken,
      refreshToken: refreshJwt,
    };
  }

  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private requiredEnv(key: string): string {
    const value = process.env[key];
    if (value === undefined || value.length === 0) {
      throw new Error(`Variable d'environnement manquante : ${key}`);
    }
    return value;
  }

  private toAuthMe(user: {
    id: string;
    email: string;
    role: Role;
    fullName: string;
    matricule: string | null;
    ecoleId: string | null;
  }): AuthMeDto {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      matricule: user.matricule,
      ecoleId: user.ecoleId,
    };
  }
}

/**
 * Cuid simplifié pour les `jti` côté backend. On évite une dépendance
 * supplémentaire en générant un identifiant sortable lexicographiquement :
 * timestamp base36 + 12 octets random base36.
 */
function createCuid(): string {
  const ts = Date.now().toString(36);
  const rand = randomBytes(8).toString('hex');
  return `${ts}${rand}`;
}
