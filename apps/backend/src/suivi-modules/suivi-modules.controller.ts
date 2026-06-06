import { Controller, Get, HttpCode, Param, Patch, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { suiviModuleQuerySchema } from '@planit/contracts';
import type {
  EnseignantSuiviItemDto,
  SessionV2Dto,
  SuiviModuleDto,
  SuiviModuleQueryDto,
} from '@planit/contracts';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { SuiviModulesService } from './suivi-modules.service';

/**
 * `/api/suivi-modules` (B.5/B.6/S.2/S.3).
 *
 * Lecture **RP + AC** (AC scopé) + **ETUDIANT** (self-scope via Inscription) sur GET /.
 * Pivot enseignant `GET /mes-enseignements` réservé à `ENSEIGNANT`.
 * « Terminer/Rouvrir » **RP only** (override `@Roles` — B.8).
 */
@ApiTags('Suivi des modules')
@ApiCookieAuth('access')
@Controller('suivi-modules')
@Roles('RESPONSABLE_PROGRAMME', 'ASSISTANT_PROGRAMME')
export class SuiviModulesController {
  constructor(private readonly suivi: SuiviModulesService) {}

  @Get()
  @Roles('RESPONSABLE_PROGRAMME', 'ASSISTANT_PROGRAMME', 'ETUDIANT', 'RESPONSABLE_CLASSE')
  @ApiOperation({
    summary:
      'Suivi des modules (RP/AC scopé classes ; ETUDIANT self-scope via Inscription année courante)',
  })
  @ApiQuery({ name: 'classeId', required: false })
  @ApiQuery({ name: 'semestre', required: false })
  @ApiQuery({ name: 'statut', required: false, enum: ['termine', 'en_cours', 'a_planifier'] })
  @ApiQuery({ name: 'q', required: false })
  @ApiResponse({ status: 200, description: 'Liste du suivi' })
  list(
    @CurrentUser() user: CurrentUserPayload,
    @Query(new ZodValidationPipe(suiviModuleQuerySchema)) query: SuiviModuleQueryDto,
  ): Promise<SuiviModuleDto[]> {
    return this.suivi.list(user, query);
  }

  // Déclaré avant `:id` pour éviter le conflit de route NestJS (chemin littéral prioritaire).
  @Get('mes-enseignements')
  @Roles('ENSEIGNANT')
  @ApiOperation({
    summary:
      'Suivi pivot enseignant — modules × classes (heuresFaites CM/TD/TP, heuresPrevues=VHE)',
  })
  @ApiResponse({ status: 200, description: 'Modules enseignés par classe' })
  mesEnseignements(@CurrentUser() user: CurrentUserPayload): Promise<EnseignantSuiviItemDto[]> {
    return this.suivi.mesEnseignements(user.id);
  }

  @Get(':id/seances')
  @ApiOperation({ summary: 'Séances COURS du module suivi (« Voir les séances »)' })
  @ApiResponse({ status: 200, description: 'Séances du module' })
  @ApiResponse({ status: 403, description: 'Hors périmètre AC' })
  @ApiResponse({ status: 404, description: 'Suivi introuvable' })
  seances(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ): Promise<SessionV2Dto[]> {
    return this.suivi.seancesForSuivi(user, id);
  }

  @Patch(':id/terminer')
  @Roles('RESPONSABLE_PROGRAMME')
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Marquer un module terminé (RP only)' })
  @ApiResponse({ status: 200, description: 'Module marqué terminé' })
  @ApiResponse({ status: 404, description: 'Suivi introuvable' })
  terminer(@Param('id') id: string): Promise<SuiviModuleDto> {
    return this.suivi.terminer(id);
  }

  @Patch(':id/rouvrir')
  @Roles('RESPONSABLE_PROGRAMME')
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Rouvrir un module terminé (RP only)' })
  @ApiResponse({ status: 200, description: 'Module rouvert' })
  @ApiResponse({ status: 404, description: 'Suivi introuvable' })
  rouvrir(@Param('id') id: string): Promise<SuiviModuleDto> {
    return this.suivi.rouvrir(id);
  }
}
