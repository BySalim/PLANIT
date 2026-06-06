import { Module } from '@nestjs/common';
import { AcModule } from '../ac/ac.module';
import { EtudiantsController } from './etudiants.controller';
import { EtudiantsService } from './etudiants.service';

/**
 * EtudiantsModule (LOT 2 B.2) — recherche + fiche + lookup. Importe AcModule
 * pour le scope AC. `EtudiantsService` exporté : InscriptionsService réutilise
 * le lookup pour le flux « email → existant/nouveau ».
 */
@Module({
  imports: [AcModule],
  controllers: [EtudiantsController],
  providers: [EtudiantsService],
  exports: [EtudiantsService],
})
export class EtudiantsModule {}
