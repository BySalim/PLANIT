import { Body, Controller, Get, HttpCode, Param, Patch, Post, Put } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { createAnneeAcademiqueSchema, updateAnneeAcademiqueSchema } from '@planit/contracts';
import type {
  AnneeAcademiqueDto,
  CreateAnneeAcademiqueDto,
  UpdateAnneeAcademiqueDto,
} from '@planit/contracts';
import { CurrentUser, requireEcole } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AnneesService } from './annees.service';

/**
 * `/api/annees` (A.1 / V3-D1).
 *
 * Lecture authentifiée (tous rôles : l'année courante alimente les filtres
 * par défaut partout). Écriture réservée au RP (`@Roles` au niveau route).
 * `GET /current` est placé AVANT `GET /:id` — l'ordre des routes Nest compte,
 * sinon « current » serait capté comme un `:id`.
 */
@ApiTags('Années académiques')
@ApiCookieAuth('access')
@Controller('annees')
export class AnneesController {
  constructor(private readonly annees: AnneesService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des années académiques de son école (tri début décroissant)' })
  @ApiResponse({ status: 200, description: 'Liste des années' })
  list(@CurrentUser() user: CurrentUserPayload): Promise<AnneeAcademiqueDto[]> {
    return this.annees.list(user.ecoleId);
  }

  @Get('current')
  @ApiOperation({ summary: "Année en cours de son école (source de vérité de l'année courante)" })
  @ApiResponse({ status: 200, description: 'Année en cours' })
  @ApiResponse({ status: 404, description: 'Aucune année en cours' })
  getCurrent(@CurrentUser() user: CurrentUserPayload): Promise<AnneeAcademiqueDto> {
    return this.annees.getCurrent(user.ecoleId);
  }

  @Post()
  // V05 LOT 7 — la Direction gère le cycle de vie de l'année (V5-D4). Le RP
  // conserve l'accès (rétro-compat ; aucun flux RP UI ne l'utilise aujourd'hui).
  @Roles('RESPONSABLE_PROGRAMME', 'DIRECTION')
  @HttpCode(201)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Créer une année académique (RP/Direction, rattachée à son école)' })
  @ApiResponse({ status: 201, description: 'Année créée' })
  @ApiResponse({ status: 403, description: 'Acteur sans école de rattachement' })
  @ApiResponse({ status: 409, description: 'Libellé déjà utilisé ou une année est déjà EN_COURS' })
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(createAnneeAcademiqueSchema)) dto: CreateAnneeAcademiqueDto,
  ): Promise<AnneeAcademiqueDto> {
    return this.annees.create(dto, requireEcole(user));
  }

  @Put(':id')
  @Roles('RESPONSABLE_PROGRAMME', 'DIRECTION')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Mettre à jour une année académique (RP/Direction, scopé école)' })
  @ApiResponse({ status: 200, description: 'Année mise à jour' })
  @ApiResponse({ status: 404, description: 'Année introuvable ou hors périmètre' })
  @ApiResponse({ status: 409, description: 'Libellé déjà utilisé ou une année est déjà EN_COURS' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(updateAnneeAcademiqueSchema)) dto: UpdateAnneeAcademiqueDto,
  ): Promise<AnneeAcademiqueDto> {
    return this.annees.update(id, dto, requireEcole(user));
  }

  /** Transition PLANIFIEE → EN_COURS (LOT 2 / V5-D2). */
  @Patch(':id/debuter')
  @Roles('DIRECTION')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Débuter une année (PLANIFIEE → EN_COURS) — Direction' })
  @ApiResponse({ status: 200, description: 'Année débutée' })
  @ApiResponse({ status: 404, description: 'Année introuvable ou hors périmètre' })
  @ApiResponse({ status: 409, description: 'Une année est déjà EN_COURS dans cette école' })
  debuter(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<AnneeAcademiqueDto> {
    return this.annees.debuter(id, requireEcole(user));
  }

  /** Transition EN_COURS → CLOTUREE (LOT 2 / V5-D2). */
  @Patch(':id/cloturer')
  @Roles('DIRECTION')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Clôturer une année (EN_COURS → CLOTUREE) — Direction' })
  @ApiResponse({ status: 200, description: 'Année clôturée' })
  @ApiResponse({ status: 404, description: 'Année introuvable ou hors périmètre' })
  @ApiResponse({ status: 409, description: "L'année n'est pas EN_COURS" })
  cloturer(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<AnneeAcademiqueDto> {
    return this.annees.cloturer(id, requireEcole(user));
  }
}
