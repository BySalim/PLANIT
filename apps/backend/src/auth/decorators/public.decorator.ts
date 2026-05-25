import { SetMetadata } from '@nestjs/common';

/**
 * Métadonnée lue par `JwtAuthGuard` pour bypasser l'auth sur un endpoint.
 *
 * Le guard global `JwtAuthGuard` est fail-closed : sans `@Public()`, toute
 * route requiert un cookie `access` valide. À utiliser uniquement sur les
 * endpoints réellement publics (login, refresh, health, etc.).
 */
export const IS_PUBLIC_KEY = 'isPublic';

export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);
