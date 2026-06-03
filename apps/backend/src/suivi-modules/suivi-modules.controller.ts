import { Controller, Get, HttpCode, Param, Patch, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { suiviModuleQuerySchema } from '@planit/contracts';
import type { SessionV2Dto, SuiviModuleDto, SuiviModuleQueryDto } from '@planit/contracts';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { SuiviModulesService } from './suivi-modules.service';

/**
 * `/api/suivi-modules` (B.5/B.6).
 *
 * Lecture **RP + AC** (AC scopé à ses classes, lecture seule). « Terminer/
 * Rouvrir » **RP only** (override `@Roles` au niveau route — B.8).
 */
@ApiTags('Suivi des modules')
@ApiCookieAuth('access')
@Controller('suivi-modules')
@Roles('RESPONSABLE_PROGRAMME', 'ASSISTANT_PROGRAMME')
export class SuiviModulesController {
  constructor(private readonly suivi: SuiviModulesService) {}

  @Get()
  @ApiOperation({ summary: 'Suivi des modules (prévu/fait/progression/enseignants ; AC scopé)' })
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
