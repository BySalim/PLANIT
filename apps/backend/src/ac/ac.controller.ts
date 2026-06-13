import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { assignAcClasseSchema, setAcClassesSchema } from '@planit/contracts';
import type { AcScopeDto, AssignAcClasseDto, SetAcClassesDto } from '@planit/contracts';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AcScopeService } from './ac-scope.service';

/**
 * `/api/ac` (B.7) — périmètre AC + assignation de classes.
 *
 * RBAC mixte au niveau route :
 *  - `GET /me/scope` : **AC** (lecture de son propre périmètre).
 *  - `POST`/`DELETE /:acId/classes` : **RP** (assigne/retire à un AC qu'il
 *    manage ; double vérification dans le service).
 */
@ApiTags('Attaché de Classe (AC)')
@ApiCookieAuth('access')
@Controller('ac')
export class AcController {
  constructor(private readonly acScope: AcScopeService) {}

  @Get('me/scope')
  @Roles('ASSISTANT_PROGRAMME')
  @ApiOperation({ summary: "Périmètre de l'AC connecté (classes assignées + salles du RP)" })
  @ApiResponse({ status: 200, description: 'Périmètre AC' })
  getMyScope(@CurrentUser() user: CurrentUserPayload): Promise<AcScopeDto> {
    return this.acScope.getScope(user.id);
  }

  @Post(':acId/classes')
  @Roles('RESPONSABLE_PROGRAMME')
  @HttpCode(201)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Assigner une classe à un AC (RP manager uniquement)' })
  @ApiResponse({ status: 201, description: 'Classe assignée' })
  @ApiResponse({ status: 403, description: 'AC non rattaché à ce RP' })
  @ApiResponse({ status: 404, description: 'AC ou classe introuvable' })
  async assign(
    @CurrentUser() user: CurrentUserPayload,
    @Param('acId') acId: string,
    @Body(new ZodValidationPipe(assignAcClasseSchema)) dto: AssignAcClasseDto,
  ): Promise<{ acId: string; classeId: string }> {
    await this.acScope.assignClasse(user.id, acId, dto.classeId);
    return { acId, classeId: dto.classeId };
  }

  @Delete(':acId/classes/:classeId')
  @Roles('RESPONSABLE_PROGRAMME')
  @HttpCode(204)
  @ApiOperation({ summary: 'Retirer une classe assignée à un AC (RP manager uniquement)' })
  @ApiResponse({ status: 204, description: 'Classe retirée' })
  @ApiResponse({ status: 403, description: 'AC non rattaché à ce RP' })
  @ApiResponse({ status: 404, description: 'AC introuvable' })
  async unassign(
    @CurrentUser() user: CurrentUserPayload,
    @Param('acId') acId: string,
    @Param('classeId') classeId: string,
  ): Promise<void> {
    await this.acScope.unassignClasse(user.id, acId, classeId);
  }

  // ── Direction (V05 LOT 6 / ADR-0022 §7) — assignation école-large ──────

  @Get(':acId/classes')
  @Roles('DIRECTION')
  @ApiOperation({ summary: "Classes assignées d'un AC de mon école (Direction)" })
  @ApiResponse({ status: 200, description: 'Ids des classes assignées' })
  @ApiResponse({ status: 404, description: 'AC introuvable / hors école' })
  async listClasses(
    @CurrentUser() user: CurrentUserPayload,
    @Param('acId') acId: string,
  ): Promise<{ classeIds: string[] }> {
    const classeIds = await this.acScope.listClasseIdsByDirection(user, acId);
    return { classeIds };
  }

  @Put(':acId/classes')
  @Roles('DIRECTION')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: "Définir les classes assignées d'un AC (Direction, école-large)" })
  @ApiResponse({ status: 200, description: 'Assignations mises à jour' })
  @ApiResponse({ status: 400, description: 'Classe hors de votre école' })
  @ApiResponse({ status: 404, description: 'AC introuvable / hors école' })
  async setClasses(
    @CurrentUser() user: CurrentUserPayload,
    @Param('acId') acId: string,
    @Body(new ZodValidationPipe(setAcClassesSchema)) dto: SetAcClassesDto,
  ): Promise<{ classeIds: string[] }> {
    const classeIds = await this.acScope.setClassesByDirection(user, acId, dto.classeIds);
    return { classeIds };
  }
}
