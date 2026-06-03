import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { createMaquetteModuleSchema } from '@planit/contracts';
import type {
  CreateMaquetteModuleDto,
  MaquetteExportDto,
  MaquetteModuleDto,
  MaquetteVersionDto,
} from '@planit/contracts';
import { Roles } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { MaquettesService } from './maquettes.service';

/**
 * `/api/maquette-versions` (A.3/A.4/A.5 + A.7). RP only (hors périmètre AC).
 */
@ApiTags('Maquettes')
@ApiCookieAuth('access')
@Controller('maquette-versions')
@Roles('RESPONSABLE_PROGRAMME')
export class MaquetteVersionsController {
  constructor(private readonly maquettes: MaquettesService) {}

  @Get(':vid')
  @ApiOperation({ summary: 'Détail version (modules + VHE/VHT + classes la suivant)' })
  @ApiResponse({ status: 200, description: 'Version trouvée' })
  @ApiResponse({ status: 404, description: 'Version introuvable' })
  getVersion(@Param('vid') vid: string): Promise<MaquetteVersionDto> {
    return this.maquettes.getVersion(vid);
  }

  @Get(':vid/export')
  @ApiOperation({ summary: 'Données structurées pour export image/PDF (semestres + totaux)' })
  @ApiResponse({ status: 200, description: 'Structure exportable' })
  @ApiResponse({ status: 404, description: 'Version introuvable' })
  exportVersion(@Param('vid') vid: string): Promise<MaquetteExportDto> {
    return this.maquettes.exportVersion(vid);
  }

  @Post(':vid/modules')
  @HttpCode(201)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Composer : ajouter un module à la version (heures par semestre)' })
  @ApiResponse({ status: 201, description: 'Module ajouté (VHE/VHT dérivés)' })
  @ApiResponse({ status: 404, description: 'Version introuvable' })
  @ApiResponse({ status: 409, description: 'Module déjà présent dans la version' })
  addModule(
    @Param('vid') vid: string,
    @Body(new ZodValidationPipe(createMaquetteModuleSchema)) dto: CreateMaquetteModuleDto,
  ): Promise<MaquetteModuleDto> {
    return this.maquettes.addModule(vid, dto);
  }
}
