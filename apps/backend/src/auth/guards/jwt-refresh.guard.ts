import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard local utilisé uniquement sur `POST /api/auth/refresh`. Lit le cookie
 * `refresh` via `JwtRefreshStrategy` puis attache
 * `req.user = { sub, jti, familyId }`. La consommation et la rotation sont
 * faites dans `AuthService.refresh` (atomicité via `prisma.$transaction`).
 */
@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {}
