import { Body, Controller, Get, HttpCode, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  createUserAdminSchema,
  roleSchema,
  updateUserAdminSchema,
  userStatutSchema,
  z,
} from '@planit/contracts';
import type {
  CreateUserAdminDto,
  ResetPasswordResultDto,
  UpdateUserAdminDto,
  UserAdminDto,
} from '@planit/contracts';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { UtilisateursService } from './utilisateurs.service';
import type { PaginatedUsers } from './utilisateurs.service';

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  ecoleId: z.string().min(1).optional(),
  role: roleSchema.optional(),
  statut: userStatutSchema.optional(),
  q: z.string().min(1).max(120).optional(),
});

type ListQueryDto = z.infer<typeof listQuerySchema>;

// Mutations admin = quota resserré (actions ponctuelles, pas d'interaction répétée).
const ADMIN_THROTTLE = { default: { limit: 10, ttl: 60_000 } } as const;

@ApiTags('Utilisateurs (Admin)')
@ApiCookieAuth('access')
@Controller('utilisateurs')
@Roles('ADMIN', 'SUPER_ADMIN')
export class UtilisateursController {
  constructor(private readonly utilisateurs: UtilisateursService) {}

  @Get()
  @ApiOperation({ summary: 'Liste cross-école (filtres école/rôle/statut/q, paginé)' })
  @ApiResponse({ status: 200, description: 'Liste paginée' })
  @ApiResponse({ status: 403, description: 'Réservé ADMIN / SUPER_ADMIN' })
  list(
    @Query(new ZodValidationPipe(listQuerySchema)) query: ListQueryDto,
  ): Promise<PaginatedUsers> {
    return this.utilisateurs.list({
      page: query.page,
      pageSize: query.pageSize,
      ...(query.ecoleId !== undefined ? { ecoleId: query.ecoleId } : {}),
      ...(query.role !== undefined ? { role: query.role } : {}),
      ...(query.statut !== undefined ? { statut: query.statut } : {}),
      ...(query.q !== undefined ? { q: query.q } : {}),
    });
  }

  @Post()
  @HttpCode(201)
  @Throttle(ADMIN_THROTTLE)
  @ApiOperation({ summary: 'Créer un compte (tout rôle). ADMIN/SUPER_ADMIN ⇒ SUPER_ADMIN requis' })
  @ApiResponse({ status: 201, description: 'Compte créé' })
  @ApiResponse({ status: 400, description: 'Invariant ecoleId / corps invalide' })
  @ApiResponse({ status: 403, description: 'Rôle insuffisant' })
  @ApiResponse({ status: 409, description: 'Email ou matricule déjà utilisé' })
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(createUserAdminSchema)) dto: CreateUserAdminDto,
  ): Promise<UserAdminDto> {
    return this.utilisateurs.create(user, dto);
  }

  @Put(':id')
  @Throttle(ADMIN_THROTTLE)
  @ApiOperation({ summary: 'Modifier un compte (nom / rôle / école)' })
  @ApiResponse({ status: 200, description: 'Compte mis à jour' })
  @ApiResponse({ status: 403, description: 'Gestion d’un compte admin réservée au SUPER_ADMIN' })
  @ApiResponse({ status: 404, description: 'Utilisateur introuvable' })
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateUserAdminSchema)) dto: UpdateUserAdminDto,
  ): Promise<UserAdminDto> {
    return this.utilisateurs.update(user, id, dto);
  }

  @Patch(':id/suspendre')
  @Throttle(ADMIN_THROTTLE)
  @ApiOperation({ summary: 'Suspendre un compte (login refusé + sessions révoquées)' })
  @ApiResponse({ status: 200, description: 'Compte suspendu' })
  @ApiResponse({ status: 400, description: 'Action impossible sur son propre compte' })
  @ApiResponse({ status: 404, description: 'Utilisateur introuvable' })
  suspend(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string): Promise<UserAdminDto> {
    return this.utilisateurs.suspend(user, id);
  }

  @Patch(':id/reactiver')
  @Throttle(ADMIN_THROTTLE)
  @ApiOperation({ summary: 'Réactiver un compte suspendu' })
  @ApiResponse({ status: 200, description: 'Compte réactivé' })
  @ApiResponse({ status: 404, description: 'Utilisateur introuvable' })
  reactivate(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ): Promise<UserAdminDto> {
    return this.utilisateurs.reactivate(user, id);
  }

  @Patch(':id/archiver')
  @Throttle(ADMIN_THROTTLE)
  @ApiOperation({ summary: 'Archiver un compte (soft-delete, sort des listes)' })
  @ApiResponse({ status: 200, description: 'Compte archivé' })
  @ApiResponse({ status: 400, description: 'Action impossible sur son propre compte' })
  @ApiResponse({ status: 404, description: 'Utilisateur introuvable' })
  archive(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string): Promise<UserAdminDto> {
    return this.utilisateurs.archive(user, id);
  }

  @Post(':id/reset-password')
  @Throttle(ADMIN_THROTTLE)
  @ApiOperation({ summary: 'Réinitialiser le mot de passe (temporaire, affiché une fois)' })
  @ApiResponse({ status: 201, description: 'Mot de passe temporaire généré' })
  @ApiResponse({ status: 404, description: 'Utilisateur introuvable' })
  resetPassword(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ): Promise<ResetPasswordResultDto> {
    return this.utilisateurs.resetPassword(user, id);
  }
}
