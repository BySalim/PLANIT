import { Controller, Get } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { SalleDto } from '@planit/contracts';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { SallesService } from './salles.service';

/**
 * GET /api/salles — référentiel des salles pour les formulaires.
 *
 * Sans `@Roles()` : tout utilisateur authentifié peut lire (RP/Enseignant/
 * Étudiant) — RP affecte une séance, l'enseignant voit où il enseigne,
 * l'étudiant où se trouvent ses cours. Un **AC** est scopé aux salles de son
 * RP manager (V3-D10, côté service). Réponse `SalleDto` (sur-ensemble de
 * `SalleRef`) → rétro-compatible avec le séance-picker V02.
 */
@ApiTags('Salles')
@ApiCookieAuth('access')
@Controller('salles')
export class SallesController {
  constructor(private readonly salles: SallesService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les salles (référentiel ; AC scopé à son RP)' })
  @ApiResponse({ status: 200, description: 'Liste des salles ordonnée par nom' })
  list(@CurrentUser() user: CurrentUserPayload): Promise<SalleDto[]> {
    return this.salles.list(user);
  }
}
