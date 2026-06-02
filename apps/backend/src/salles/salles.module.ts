import { Module } from '@nestjs/common';
import { SallesController } from './salles.controller';
import { SallesService } from './salles.service';

/**
 * SallesModule — référentiel léger des salles (lecture seule).
 * Consommé par le formulaire séance V02 (CreateSessionModal + drawer édition)
 * et par toute UI ayant besoin de la liste complète des salles.
 */
@Module({
  controllers: [SallesController],
  providers: [SallesService],
  exports: [SallesService],
})
export class SallesModule {}
