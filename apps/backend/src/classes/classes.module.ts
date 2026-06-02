import { Module } from '@nestjs/common';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';

/**
 * ClassesModule — référentiel léger des classes (lecture seule).
 * Consommé par le ClasseChipsPicker du formulaire séance V02 (LOT 3 R.3)
 * et par toute UI ayant besoin de la liste complète des classes.
 */
@Module({
  controllers: [ClassesController],
  providers: [ClassesService],
  exports: [ClassesService],
})
export class ClassesModule {}
