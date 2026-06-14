import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { EtudiantDetailDto, EtudiantDto, EtudiantLookupDto } from '@planit/contracts';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { EtudiantsService } from './etudiants.service';

/**
 * `/api/etudiants` (B.2) — **RP + AC** (page Étudiants V3-D9). Lecture seule :
 * pas de POST (création via inscription uniquement). Un AC est scopé à ses
 * classes assignées côté service. `/lookup` est déclaré AVANT `/:id` (ordre
 * Nest : « lookup » serait sinon capté comme un id).
 */
@ApiTags('Étudiants')
@ApiCookieAuth('access')
@Controller('etudiants')
@Roles('RESPONSABLE_PROGRAMME', 'ASSISTANT_PROGRAMME')
export class EtudiantsController {
  constructor(private readonly etudiants: EtudiantsService) {}

  // V05 LOT 3 — Direction lit les étudiants de son école (lecture seule, scope
  // école côté service). Le `@Roles` méthode override le `@Roles` classe.
  @Get()
  @Roles('RESPONSABLE_PROGRAMME', 'ASSISTANT_PROGRAMME', 'DIRECTION')
  @ApiOperation({
    summary: 'Recherche étudiants (nom / matricule / email ; AC scopé, Direction école)',
  })
  @ApiQuery({ name: 'q', required: false })
  @ApiResponse({ status: 200, description: 'Liste des étudiants' })
  list(@CurrentUser() user: CurrentUserPayload, @Query('q') q?: string): Promise<EtudiantDto[]> {
    return this.etudiants.list(user, q);
  }

  @Get('lookup')
  @ApiOperation({ summary: "Résoudre un étudiant par email (préalable à l'inscription)" })
  @ApiQuery({ name: 'email', required: true })
  @ApiResponse({ status: 200, description: '{ found, etudiant }' })
  lookup(@Query('email') email: string): Promise<EtudiantLookupDto> {
    return this.etudiants.lookupByEmail(email);
  }

  @Get(':id')
  @Roles('RESPONSABLE_PROGRAMME', 'ASSISTANT_PROGRAMME', 'DIRECTION')
  @ApiOperation({ summary: "Fiche étudiant + historique d'inscriptions" })
  @ApiResponse({ status: 200, description: 'Fiche étudiant' })
  @ApiResponse({ status: 403, description: 'Hors périmètre AC' })
  @ApiResponse({ status: 404, description: 'Étudiant introuvable' })
  findOne(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ): Promise<EtudiantDetailDto> {
    return this.etudiants.findOne(user, id);
  }
}
