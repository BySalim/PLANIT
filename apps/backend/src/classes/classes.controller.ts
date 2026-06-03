import { Body, Controller, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { createClasseV3Schema, updateClasseV3Schema } from '@planit/contracts';
import type {
  ClasseV3Dto,
  CreateClasseV3Dto,
  EtudiantDto,
  UpdateClasseV3Dto,
} from '@planit/contracts';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ClassesService } from './classes.service';

/**
 * `/api/classes` (B.1).
 *
 * **Lecture tous rôles authentifiés** (référentiel partagé — le séance-picker
 * V02 en dépend) ; un AC est **scopé** à ses classes assignées côté service.
 * **Écriture RP only** (un AC ne crée pas de classes — il inscrit, cf.
 * InscriptionsController). La réponse `ClasseV3Dto` est un sur-ensemble de
 * l'ancien `ClasseRef`, donc rétro-compatible.
 */
@ApiTags('Classes')
@ApiCookieAuth('access')
@Controller('classes')
export class ClassesController {
  constructor(private readonly classes: ClassesService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des classes (défaut année courante ; AC scopé)' })
  @ApiQuery({ name: 'anneeId', required: false })
  @ApiQuery({ name: 'filiereSigle', required: false })
  @ApiQuery({ name: 'q', required: false })
  @ApiResponse({ status: 200, description: 'Liste des classes (avec places)' })
  list(
    @CurrentUser() user: CurrentUserPayload,
    @Query('anneeId') anneeId?: string,
    @Query('filiereSigle') filiereSigle?: string,
    @Query('q') q?: string,
  ): Promise<ClasseV3Dto[]> {
    return this.classes.list(user, {
      ...(anneeId ? { anneeId } : {}),
      ...(filiereSigle ? { filiereSigle } : {}),
      ...(q ? { q } : {}),
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail classe (places, filière/niveau/année hérités de la formation)' })
  @ApiResponse({ status: 200, description: 'Classe trouvée' })
  @ApiResponse({ status: 403, description: 'Hors périmètre AC' })
  @ApiResponse({ status: 404, description: 'Classe introuvable' })
  findOne(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string): Promise<ClasseV3Dto> {
    return this.classes.findOne(user, id);
  }

  @Get(':id/etudiants')
  @ApiOperation({ summary: 'Étudiants inscrits dans la classe (roster de la fiche)' })
  @ApiResponse({ status: 200, description: 'Étudiants inscrits' })
  @ApiResponse({ status: 403, description: 'Hors périmètre AC' })
  @ApiResponse({ status: 404, description: 'Classe introuvable' })
  listEtudiants(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ): Promise<EtudiantDto[]> {
    return this.classes.listEtudiants(user, id);
  }

  @Post()
  @Roles('RESPONSABLE_PROGRAMME')
  @HttpCode(201)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: "Créer une classe (formation de l'année courante + capacité)" })
  @ApiResponse({ status: 201, description: 'Classe créée' })
  @ApiResponse({ status: 400, description: 'Formation invalide / hors année courante' })
  @ApiResponse({ status: 409, description: 'Code de classe déjà utilisé' })
  create(
    @Body(new ZodValidationPipe(createClasseV3Schema)) dto: CreateClasseV3Dto,
  ): Promise<ClasseV3Dto> {
    return this.classes.create(dto);
  }

  @Put(':id')
  @Roles('RESPONSABLE_PROGRAMME')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Mettre à jour une classe (RP)' })
  @ApiResponse({ status: 200, description: 'Classe mise à jour' })
  @ApiResponse({ status: 404, description: 'Classe introuvable' })
  @ApiResponse({ status: 409, description: 'Code de classe déjà utilisé' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateClasseV3Schema)) dto: UpdateClasseV3Dto,
  ): Promise<ClasseV3Dto> {
    return this.classes.update(id, dto);
  }
}
