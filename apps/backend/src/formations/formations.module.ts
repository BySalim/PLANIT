import { Module } from '@nestjs/common';
import { AnneesModule } from '../annees/annees.module';
import { MaquettesModule } from '../maquettes/maquettes.module';
import { FormationsController } from './formations.controller';
import { FormationsService } from './formations.service';

/**
 * FormationsModule (LOT 1 A.6 / refonte ADR-0018). Importe AnneesModule (année
 * courante) et MaquettesModule (`ensureMaquetteAndVersion` — la création d'une
 * formation crée/renouvelle automatiquement sa maquette + version).
 * `FormationsService` exporté : les classes (LOT 2) vérifient que la formation
 * de rattachement existe.
 */
@Module({
  imports: [AnneesModule, MaquettesModule],
  controllers: [FormationsController],
  providers: [FormationsService],
  exports: [FormationsService],
})
export class FormationsModule {}
