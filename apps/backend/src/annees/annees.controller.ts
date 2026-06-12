import { Body, Controller, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
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
  @Roles('RESPONSABLE_PROGRAMME')
  @HttpCode(201)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Créer une année académique (RP, rattachée à son école)' })
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
  @Roles('RESPONSABLE_PROGRAMME')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Mettre à jour une année académique (RP)' })
  @ApiResponse({ status: 200, description: 'Année mise à jour' })
  @ApiResponse({ status: 404, description: 'Année introuvable' })
  @ApiResponse({ status: 409, description: 'Libellé déjà utilisé ou une année est déjà EN_COURS' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateAnneeAcademiqueSchema)) dto: UpdateAnneeAcademiqueDto,
  ): Promise<AnneeAcademiqueDto> {
    return this.annees.update(id, dto);
  }
}
