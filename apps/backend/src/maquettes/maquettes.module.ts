import { Module } from '@nestjs/common';
import { AnneesModule } from '../annees/annees.module';
import { MaquetteModulesController } from './maquette-modules.controller';
import { MaquetteVersionsController } from './maquette-versions.controller';
import { MaquettesController } from './maquettes.controller';
import { MaquettesService } from './maquettes.service';

/**
 * MaquettesModule (LOT 1 A.2 → A.5) — maquettes versionnées. Trois contrôleurs
 * (maquettes / maquette-versions / maquette-modules) adossés à un seul service
 * (les 3 entités sont couplées). Importe AnneesModule pour résoudre l'année
 * courante au renouvellement.
 */
@Module({
  imports: [AnneesModule],
  controllers: [MaquettesController, MaquetteVersionsController, MaquetteModulesController],
  providers: [MaquettesService],
  exports: [MaquettesService],
})
export class MaquettesModule {}
