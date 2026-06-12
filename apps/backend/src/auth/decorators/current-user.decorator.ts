import { createParamDecorator, ForbiddenException } from '@nestjs/common';
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
  // V05 — école de rattachement embarquée dans le JWT (ADR-0019). null pour
  // ADMIN/SUPER_ADMIN (cross-école). Pas de hit BD : les scopes serveur le lisent ici.
  ecoleId: string | null;
}

/**
 * Résout l'`ecoleId` **non-null** d'un acteur pour les opérations qui exigent
 * un rattachement à une école (création de référentiel scopé : filière,
 * enseignant, année…). Lève 403 pour un ADMIN/SUPER_ADMIN (`ecoleId = null`,
 * cross-école) qui n'opère jamais sur le référentiel d'une école donnée sans
 * la cibler explicitement (V05 / ADR-0019 §3). Garde-fou serveur, jamais UI.
 */
export function requireEcole(user: CurrentUserPayload): string {
  if (!user.ecoleId) {
    throw new ForbiddenException(
      "Action réservée à un acteur rattaché à une école (l'ADMIN ne crée pas de référentiel scopé)",
    );
  }
  return user.ecoleId;
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
