import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { createFormationSchema } from '@planit/contracts';
import type { CreateFormationDto, FormationDto } from '@planit/contracts';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { FormationsService } from './formations.service';

/**
 * `/api/formations` (A.6 + A.7). **RP only** (hors périmètre AC — V3-D9).
 * Création toujours rattachée à l'année courante (résolue côté serveur).
 */
@ApiTags('Formations')
@ApiCookieAuth('access')
@Controller('formations')
@Roles('RESPONSABLE_PROGRAMME')
export class FormationsController {
  constructor(private readonly formations: FormationsService) {}

  @Get()
  // V05 LOT 2 — Direction lit les formations de son école.
  @Roles('RESPONSABLE_PROGRAMME', 'DIRECTION')
  @ApiOperation({ summary: 'Liste des formations (défaut : année courante)' })
  @ApiQuery({ name: 'anneeId', required: false })
  @ApiQuery({ name: 'filiereId', required: false })
  @ApiResponse({ status: 200, description: 'Liste des formations' })
  list(
    @CurrentUser() user: CurrentUserPayload,
    @Query('anneeId') anneeId?: string,
    @Query('filiereId') filiereId?: string,
  ): Promise<FormationDto[]> {
    return this.formations.list(
      {
        ...(anneeId ? { anneeId } : {}),
        ...(filiereId ? { filiereId } : {}),
      },
      user.ecoleId,
    );
  }

  @Get(':id')
  @Roles('RESPONSABLE_PROGRAMME', 'DIRECTION')
  @ApiOperation({ summary: 'Détail formation (filière, année, version, compteur de classes)' })
  @ApiResponse({ status: 200, description: 'Formation trouvée' })
  @ApiResponse({ status: 404, description: 'Formation introuvable' })
  findOne(@Param('id') id: string): Promise<FormationDto> {
    return this.formations.findOne(id);
  }

  @Post()
  @HttpCode(201)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: "Créer une formation (année courante, version de maquette de l'année)" })
  @ApiResponse({ status: 201, description: 'Formation créée' })
  @ApiResponse({ status: 400, description: 'Filière ou version invalide / hors année courante' })
  @ApiResponse({
    status: 409,
    description: 'Code de formation déjà utilisé / aucune année en cours',
  })
  create(
    @Body(new ZodValidationPipe(createFormationSchema)) dto: CreateFormationDto,
  ): Promise<FormationDto> {
    return this.formations.create(dto);
  }
}
