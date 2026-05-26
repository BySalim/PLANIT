import { Controller, Get } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { SalleRef } from '@planit/contracts';
import { SallesService } from './salles.service';

/**
 * GET /api/salles — référentiel des salles pour les formulaires.
 *
 * Sans `@Roles()` : tout utilisateur authentifié peut lire (RP/Enseignant/
 * Étudiant). C'est cohérent avec un référentiel — RP doit pouvoir lister les
 * salles pour affecter une séance, l'enseignant doit voir où il enseigne,
 * l'étudiant doit voir où se trouvent ses cours.
 */
@ApiTags('Salles')
@ApiCookieAuth('access')
@Controller('salles')
export class SallesController {
  constructor(private readonly salles: SallesService) {}

  @Get()
  @ApiOperation({ summary: 'Lister toutes les salles (référentiel)' })
  @ApiResponse({ status: 200, description: 'Liste des salles ordonnée par nom' })
  list(): Promise<SalleRef[]> {
    return this.salles.list();
  }
}
