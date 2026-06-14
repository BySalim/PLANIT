import { Controller, Get, Param } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { MaquetteDto, MaquetteVersionDto } from '@planit/contracts';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { MaquettesService } from './maquettes.service';

/**
 * `/api/maquettes` (A.2/A.3 + A.7) — **lecture seule** (ADR-0018).
 *
 * **RP only** sur tout le contrôleur : les maquettes sont hors périmètre AC
 * (V3-D9) — un AC reçoit 403, comme tout rôle non-RP. La **création** et le
 * **renouvellement** ne sont plus exposés ici : ils sont pilotés automatiquement
 * par la création d'une formation (`FormationsService` →
 * `MaquettesService.ensureMaquetteAndVersion`). La composition (ajout/retrait de
 * modules) reste sur `/maquette-versions` + `/maquette-modules`.
 */
@ApiTags('Maquettes')
@ApiCookieAuth('access')
@Controller('maquettes')
@Roles('RESPONSABLE_PROGRAMME')
export class MaquettesController {
  constructor(private readonly maquettes: MaquettesService) {}

  @Get()
  // V05 LOT 2 — Direction lit les maquettes de son école.
  @Roles('RESPONSABLE_PROGRAMME', 'DIRECTION')
  @ApiOperation({ summary: 'Liste des maquettes de son école (niveau + filière + versions)' })
  @ApiResponse({ status: 200, description: 'Liste des maquettes' })
  list(@CurrentUser() user: CurrentUserPayload): Promise<MaquetteDto[]> {
    return this.maquettes.list(user);
  }

  @Get(':id')
  @Roles('RESPONSABLE_PROGRAMME', 'DIRECTION')
  @ApiOperation({ summary: 'Détail identité maquette' })
  @ApiResponse({ status: 200, description: 'Maquette trouvée' })
  @ApiResponse({ status: 404, description: 'Maquette introuvable' })
  findOne(@Param('id') id: string): Promise<MaquetteDto> {
    return this.maquettes.findOne(id);
  }

  @Get(':id/versions')
  @Roles('RESPONSABLE_PROGRAMME', 'DIRECTION')
  @ApiOperation({ summary: "Versions d'une maquette (annee + compteur de modules)" })
  @ApiResponse({ status: 200, description: 'Liste des versions' })
  @ApiResponse({ status: 404, description: 'Maquette introuvable' })
  listVersions(@Param('id') id: string): Promise<MaquetteVersionDto[]> {
    return this.maquettes.listVersions(id);
  }
}
