import { Body, Controller, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { createMaquetteSchema, updateMaquetteSchema } from '@planit/contracts';
import type {
  CreateMaquetteDto,
  MaquetteDto,
  MaquetteVersionDto,
  UpdateMaquetteDto,
} from '@planit/contracts';
import { Roles } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { MaquettesService } from './maquettes.service';

/**
 * `/api/maquettes` (A.2/A.3 + A.7).
 *
 * **RP only** sur tout le contrôleur (lecture comprise) : les maquettes sont
 * hors périmètre AC (V3-D9) — un AC reçoit 403, comme tout rôle non-RP.
 */
@ApiTags('Maquettes')
@ApiCookieAuth('access')
@Controller('maquettes')
@Roles('RESPONSABLE_PROGRAMME')
export class MaquettesController {
  constructor(private readonly maquettes: MaquettesService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des maquettes (niveau + filière + compteur de versions)' })
  @ApiResponse({ status: 200, description: 'Liste des maquettes' })
  list(): Promise<MaquetteDto[]> {
    return this.maquettes.list();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail identité maquette' })
  @ApiResponse({ status: 200, description: 'Maquette trouvée' })
  @ApiResponse({ status: 404, description: 'Maquette introuvable' })
  findOne(@Param('id') id: string): Promise<MaquetteDto> {
    return this.maquettes.findOne(id);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: "Versions d'une maquette (année + compteur de modules)" })
  @ApiResponse({ status: 200, description: 'Liste des versions' })
  @ApiResponse({ status: 404, description: 'Maquette introuvable' })
  listVersions(@Param('id') id: string): Promise<MaquetteVersionDto[]> {
    return this.maquettes.listVersions(id);
  }

  @Post()
  @HttpCode(201)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Créer une maquette (nom + filière + niveau)' })
  @ApiResponse({ status: 201, description: 'Maquette créée' })
  @ApiResponse({ status: 409, description: 'Maquette déjà existante pour cette filière/niveau' })
  create(
    @Body(new ZodValidationPipe(createMaquetteSchema)) dto: CreateMaquetteDto,
  ): Promise<MaquetteDto> {
    return this.maquettes.create(dto);
  }

  @Put(':id')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Renommer une maquette (filière + niveau figés)' })
  @ApiResponse({ status: 200, description: 'Maquette mise à jour' })
  @ApiResponse({ status: 404, description: 'Maquette introuvable' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateMaquetteSchema)) dto: UpdateMaquetteDto,
  ): Promise<MaquetteDto> {
    return this.maquettes.update(id, dto);
  }

  @Post(':id/renew')
  @HttpCode(201)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: "Renouveler : cloner la dernière version vers l'année courante" })
  @ApiResponse({ status: 201, description: "Nouvelle version créée pour l'année courante" })
  @ApiResponse({ status: 404, description: 'Maquette introuvable' })
  @ApiResponse({
    status: 409,
    description: "Version déjà présente pour l'année courante, ou aucune version à cloner",
  })
  renew(@Param('id') id: string): Promise<MaquetteVersionDto> {
    return this.maquettes.renew(id);
  }
}
