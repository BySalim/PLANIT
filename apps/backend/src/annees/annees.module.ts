import { Module } from '@nestjs/common';
import { AnneesController } from './annees.controller';
import { AnneesService } from './annees.service';

/**
 * AnneesModule (LOT 1 A.1) — CRUD AnneeAcademique + résolution de l'année
 * courante. `AnneesService` est exporté : formations, classes et inscriptions
 * s'appuient dessus pour rattacher leurs créations à l'année courante (V3-D1).
 */
@Module({
  controllers: [AnneesController],
  providers: [AnneesService],
  exports: [AnneesService],
})
export class AnneesModule {}
