import { Body, Controller, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  createSessionSchema,
  updateSessionSchema,
  weekPlanningQuerySchema,
} from '@planit/contracts';
import type {
  CreateSessionDto,
  SessionDto,
  SessionStatsDto,
  UpdateSessionDto,
  WeekPlanningQueryDto,
} from '@planit/contracts';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { SeanceService } from './seance.service';

@ApiTags('Sessions')
@Controller('sessions')
export class SeanceController {
  constructor(private readonly seances: SeanceService) {}

  /** B.1 — week planning, filterable by class / teacher / student. */
  @Get()
  @ApiOperation({ summary: "Liste des séances d'une semaine" })
  @ApiResponse({ status: 200, description: 'Séances de la semaine' })
  @ApiResponse({ status: 400, description: 'Paramètres de requête invalides' })
  findWeek(
    @Query(new ZodValidationPipe(weekPlanningQuerySchema)) query: WeekPlanningQueryDto,
  ): Promise<SessionDto[]> {
    return this.seances.findWeek(query);
  }

  /** B.7 — weekly planning counters (declared before `:id`). */
  @Get('stats')
  @ApiOperation({ summary: 'Statistiques du planning hebdomadaire' })
  @ApiResponse({ status: 200, description: 'Compteurs du planning' })
  @ApiResponse({ status: 400, description: 'Paramètres de requête invalides' })
  stats(
    @Query(new ZodValidationPipe(weekPlanningQuerySchema)) query: WeekPlanningQueryDto,
  ): Promise<SessionStatsDto> {
    return this.seances.stats(query);
  }

  /** B.4 — single session detail. */
  @Get(':id')
  @ApiOperation({ summary: "Détail d'une séance" })
  @ApiResponse({ status: 200, description: 'Séance trouvée' })
  @ApiResponse({ status: 404, description: 'Séance introuvable' })
  findOne(@Param('id') id: string): Promise<SessionDto> {
    return this.seances.findOne(id);
  }

  /** B.2 — create a session. */
  @Post()
  @ApiOperation({ summary: 'Créer une séance' })
  @ApiResponse({ status: 201, description: 'Séance créée' })
  @ApiResponse({ status: 400, description: 'Corps invalide ou référence inexistante' })
  create(
    @Body(new ZodValidationPipe(createSessionSchema)) dto: CreateSessionDto,
  ): Promise<SessionDto> {
    return this.seances.create(dto);
  }

  /** B.3 — update a session (reverts it to unpublished). */
  @Put(':id')
  @ApiOperation({ summary: 'Modifier une séance' })
  @ApiResponse({ status: 200, description: 'Séance mise à jour' })
  @ApiResponse({ status: 400, description: 'Corps invalide' })
  @ApiResponse({ status: 404, description: 'Séance introuvable' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateSessionSchema)) dto: UpdateSessionDto,
  ): Promise<SessionDto> {
    return this.seances.update(id, dto);
  }

  /** B.5 — publish every pending session, optionally scoped to a class. */
  @Post('publish')
  @HttpCode(200)
  @ApiOperation({ summary: 'Publier les séances en attente' })
  @ApiResponse({ status: 200, description: 'Séances publiées' })
  publish(@Query('classeId') classeId?: string): Promise<SessionDto[]> {
    return this.seances.publish(classeId);
  }
}
