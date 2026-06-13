import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { UtilisateursModule } from '../utilisateurs/utilisateurs.module';
import { EcolesController } from './ecoles.controller';
import { EcolesService } from './ecoles.service';

/**
 * EcolesModule (V05 LOT 1.1 + 1.2) — CRUD écoles + archivage + création de la
 * Direction. Importe `UtilisateursModule` pour réutiliser le helper
 * `createAccount` (Direction = compte rattaché à l'école) et `AuditModule`.
 */
@Module({
  imports: [AuditModule, UtilisateursModule],
  controllers: [EcolesController],
  providers: [EcolesService],
})
export class EcolesModule {}
