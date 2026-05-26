import { Controller, Get } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { ClasseRef } from '@planit/contracts';
import { ClassesService } from './classes.service';

/**
 * GET /api/classes — référentiel des classes pour les formulaires.
 *
 * Sans `@Roles()` : tout utilisateur authentifié peut lire (RP/Enseignant/
 * Étudiant). C'est cohérent avec un référentiel — RP doit pouvoir lister les
 * classes pour créer/affecter une séance, l'enseignant peut afficher la liste
 * dans une vue future, l'étudiant peut voir sa classe parmi les autres.
 */
@ApiTags('Classes')
@ApiCookieAuth('access')
@Controller('classes')
export class ClassesController {
  constructor(private readonly classes: ClassesService) {}

  @Get()
  @ApiOperation({ summary: 'Lister toutes les classes (référentiel)' })
  @ApiResponse({ status: 200, description: 'Liste des classes ordonnée par code' })
  list(): Promise<ClasseRef[]> {
    return this.classes.list();
  }
}
