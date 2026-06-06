import { Module } from '@nestjs/common';
import { AcModule } from '../ac/ac.module';
import { AnneesModule } from '../annees/annees.module';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';

/**
 * ClassesModule (refonte V03 B.1) — CRUD classes + filtres + places + roster,
 * tout en restant le référentiel partagé consommé par le ClasseChipsPicker
 * V02 (réponse `ClasseV3Dto` sur-ensemble de `ClasseRef`).
 *
 * Importe AnneesModule (résolution année courante pour le filtre défaut + la
 * création) et AcModule (scope AC : un AC ne liste que ses classes assignées).
 */
@Module({
  imports: [AnneesModule, AcModule],
  controllers: [ClassesController],
  providers: [ClassesService],
  exports: [ClassesService],
})
export class ClassesModule {}
