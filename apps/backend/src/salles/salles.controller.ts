import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { createSalleSchema, updateSalleSchema } from '@planit/contracts';
import type { CreateSalleDto, SalleDto, UpdateSalleDto } from '@planit/contracts';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { SallesService } from './salles.service';

/**
 * `/api/salles` — référentiel des salles (V3-D10 / LOT 2 V5-D2).
 *
 * `GET` — tout utilisateur authentifié (AC scopé RP, autres scopés école).
 * `POST` — DIRECTION | RESPONSABLE_PROGRAMME. RP : `rpResponsableId` forcé null.
 * `PUT /:id` — DIRECTION uniquement (peut assigner/retirer responsable).
 */
@ApiTags('Salles')
@ApiCookieAuth('access')
@Controller('salles')
export class SallesController {
  constructor(private readonly salles: SallesService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les salles (référentiel ; AC scopé RP, autres scopés école)' })
  @ApiResponse({ status: 200, description: 'Liste des salles ordonnée par nom' })
  list(@CurrentUser() user: CurrentUserPayload): Promise<SalleDto[]> {
    return this.salles.list(user);
  }

  @Post()
  @Roles('DIRECTION', 'RESPONSABLE_PROGRAMME')
  @HttpCode(201)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Créer une salle (Direction peut assigner rpResponsableId ; RP → null forcé)',
  })
  @ApiResponse({ status: 201, description: 'Salle créée' })
  @ApiResponse({ status: 403, description: 'Sans école de rattachement' })
  @ApiResponse({ status: 409, description: 'Nom de salle déjà utilisé' })
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(createSalleSchema)) dto: CreateSalleDto,
  ): Promise<SalleDto> {
    return this.salles.create(dto, user);
  }

  @Put(':id')
  // V05 LOT 6 — Direction (toute salle) + RP (sa salle subjective). Scope dans le service.
  @Roles('DIRECTION', 'RESPONSABLE_PROGRAMME')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Modifier une salle (Direction) ou sa salle subjective (RP créateur)' })
  @ApiResponse({ status: 200, description: 'Salle mise à jour' })
  @ApiResponse({ status: 403, description: 'Hors périmètre (Direction/créateur uniquement)' })
  @ApiResponse({ status: 404, description: 'Salle introuvable' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(updateSalleSchema)) dto: UpdateSalleDto,
  ): Promise<SalleDto> {
    return this.salles.update(id, dto, user);
  }

  @Delete(':id')
  @Roles('RESPONSABLE_PROGRAMME')
  @HttpCode(204)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Supprimer une salle subjective (RP créateur, ADR-0022 §5)' })
  @ApiResponse({ status: 204, description: 'Salle subjective supprimée' })
  @ApiResponse({ status: 404, description: 'Salle introuvable ou non subjective' })
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload): Promise<void> {
    await this.salles.remove(id, user);
  }
}
