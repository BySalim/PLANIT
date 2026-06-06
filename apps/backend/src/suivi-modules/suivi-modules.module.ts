import { Module } from '@nestjs/common';
import { AcModule } from '../ac/ac.module';
import { SuiviModulesController } from './suivi-modules.controller';
import { SuiviModulesService } from './suivi-modules.service';

/**
 * SuiviModulesModule (LOT 2 B.5/B.6). Importe AcModule pour le scope AC. Le
 * mapper séance V02 (`toSessionV2Dto`) est réutilisé comme simple utilitaire
 * (import direct, pas de dépendance de module sur SeanceV2Module).
 */
@Module({
  imports: [AcModule],
  controllers: [SuiviModulesController],
  providers: [SuiviModulesService],
  exports: [SuiviModulesService],
})
export class SuiviModulesModule {}
