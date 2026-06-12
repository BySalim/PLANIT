import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  createEnseignantSchema,
  enseignantStatutSchema,
  updateEnseignantSchema,
  z,
} from '@planit/contracts';
import type { CreateEnseignantDto, EnseignantDto, UpdateEnseignantDto } from '@planit/contracts';
import { CurrentUser, requireEcole } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { EnseignantsService } from './enseignants.service';
import type { PaginatedEnseignants } from './enseignants.service';

// Query schema for list endpoint.
const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  statut: enseignantStatutSchema.optional(),
  specialite: z.string().min(1).max(120).optional(),
});

type ListQueryDto = z.infer<typeof listQuerySchema>;

@ApiTags('Enseignants')
@ApiCookieAuth('access')
@Controller('enseignants')
@Roles('RESPONSABLE_PROGRAMME')
export class EnseignantsController {
  constructor(private readonly enseignants: EnseignantsService) {}

  /** B.6 — liste paginée + filtres optionnels. Lecture ouverte au RP + AC
   * (V3-D9 G.6 : l'AC consulte les enseignants en lecture seule). Le
   * `@Roles` méthode override le `@Roles` classe (RP-only) → les writes
   * ci-dessous restent réservés au RP. */
  @Get()
  @Roles('RESPONSABLE_PROGRAMME', 'ASSISTANT_PROGRAMME')
  @ApiOperation({ summary: 'Liste des enseignants (RP + AC lecture)' })
  @ApiResponse({ status: 200, description: 'Liste paginée' })
  @ApiResponse({ status: 403, description: 'Rôle insuffisant' })
  list(
    @CurrentUser() user: CurrentUserPayload,
    @Query(new ZodValidationPipe(listQuerySchema)) query: ListQueryDto,
  ): Promise<PaginatedEnseignants> {
    return this.enseignants.list(
      {
        page: query.page,
        pageSize: query.pageSize,
        ...(query.statut !== undefined ? { statut: query.statut } : {}),
        ...(query.specialite !== undefined ? { specialite: query.specialite } : {}),
      },
      user.ecoleId,
    );
  }

  @Get(':id')
  @Roles('RESPONSABLE_PROGRAMME', 'ASSISTANT_PROGRAMME')
  @ApiOperation({ summary: 'Détail enseignant (RP + AC lecture)' })
  @ApiResponse({ status: 200, description: 'Enseignant trouvé' })
  @ApiResponse({ status: 404, description: 'Enseignant introuvable' })
  findOne(@Param('id') id: string): Promise<EnseignantDto> {
    return this.enseignants.findOne(id);
  }

  /** B.6 — crée User + Enseignant atomiquement (argon2id). */
  @Post()
  @HttpCode(201)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Créer un enseignant (et le compte User lié)' })
  @ApiResponse({ status: 201, description: 'Enseignant créé' })
  @ApiResponse({ status: 400, description: 'Corps invalide' })
  @ApiResponse({ status: 403, description: 'Acteur sans école de rattachement' })
  @ApiResponse({ status: 409, description: 'Email déjà utilisé' })
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(createEnseignantSchema)) dto: CreateEnseignantDto,
  ): Promise<EnseignantDto> {
    return this.enseignants.create(dto, requireEcole(user));
  }

  @Put(':id')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Mettre à jour un enseignant' })
  @ApiResponse({ status: 200, description: 'Enseignant mis à jour' })
  @ApiResponse({ status: 404, description: 'Enseignant introuvable' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateEnseignantSchema)) dto: UpdateEnseignantDto,
  ): Promise<EnseignantDto> {
    return this.enseignants.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Supprimer un enseignant (soft delete si référencé)' })
  @ApiResponse({ status: 204, description: 'Enseignant supprimé ou désactivé' })
  @ApiResponse({ status: 404, description: 'Enseignant introuvable' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.enseignants.remove(id);
  }
}
