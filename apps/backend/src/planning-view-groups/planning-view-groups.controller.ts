import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  createPlanningViewGroupSchema,
  planningViewGroupQuerySchema,
  updatePlanningViewGroupSchema,
} from '@planit/contracts';
import type {
  CreatePlanningViewGroupDto,
  PlanningViewGroupDto,
  PlanningViewGroupQueryDto,
  UpdatePlanningViewGroupDto,
} from '@planit/contracts';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PlanningViewGroupsService } from './planning-view-groups.service';

/**
 * `/api/planning/view-groups` (V05 LOT 7.1).
 *
 * Groupes de vue planning (presets custom des vues by-X). Réservés aux acteurs
 * qui consomment ces vues (RP / AC / Direction) ; chaque groupe est **privé à
 * son créateur** (scope serveur sur `user.id`). Les mutations sont throttlées
 * mais souples (création/réordonnancement répétés).
 */
@ApiTags('Groupes de vue planning')
@ApiCookieAuth('access')
@Controller('planning/view-groups')
@Roles('RESPONSABLE_PROGRAMME', 'ASSISTANT_PROGRAMME', 'DIRECTION')
export class PlanningViewGroupsController {
  constructor(private readonly service: PlanningViewGroupsService) {}

  @Get()
  @ApiOperation({ summary: 'Liste mes groupes de vue pour une dimension (classe/salle/prof)' })
  @ApiResponse({ status: 200, description: 'Mes groupes de vue' })
  list(
    @CurrentUser() user: CurrentUserPayload,
    @Query(new ZodValidationPipe(planningViewGroupQuerySchema)) query: PlanningViewGroupQueryDto,
  ): Promise<PlanningViewGroupDto[]> {
    return this.service.list(user.id, query.view);
  }

  @Post()
  @HttpCode(201)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Créer un groupe de vue (privé au créateur)' })
  @ApiResponse({ status: 201, description: 'Groupe créé' })
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(createPlanningViewGroupSchema)) dto: CreatePlanningViewGroupDto,
  ): Promise<PlanningViewGroupDto> {
    return this.service.create(user.id, dto);
  }

  @Put(':id')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Renommer / réordonner un groupe de vue' })
  @ApiResponse({ status: 200, description: 'Groupe mis à jour' })
  @ApiResponse({ status: 404, description: 'Groupe introuvable ou hors périmètre' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(updatePlanningViewGroupSchema)) dto: UpdatePlanningViewGroupDto,
  ): Promise<PlanningViewGroupDto> {
    return this.service.update(user.id, id, dto);
  }

  @Delete(':id')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Supprimer un groupe de vue' })
  @ApiResponse({ status: 200, description: 'Groupe supprimé' })
  @ApiResponse({ status: 404, description: 'Groupe introuvable ou hors périmètre' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<{ id: string }> {
    return this.service.remove(user.id, id);
  }
}
