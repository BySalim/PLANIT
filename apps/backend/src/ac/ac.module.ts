import { Module } from '@nestjs/common';
import { AcController } from './ac.controller';
import { AcScopeService } from './ac-scope.service';

/**
 * AcModule (LOT 2 B.7) — périmètre de l'Attaché de Classe.
 *
 * `AcScopeService` est exporté et **réutilisé** par ClassesModule,
 * EtudiantsModule, SallesModule et SuiviModulesModule pour appliquer le
 * filtrage scope-aware côté serveur (un AC ne voit que ses classes + les
 * salles de son RP). C'est le point unique de la logique de périmètre AC.
 */
@Module({
  controllers: [AcController],
  providers: [AcScopeService],
  exports: [AcScopeService],
})
export class AcModule {}
