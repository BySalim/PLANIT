import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { UtilisateursController } from './utilisateurs.controller';
import { UtilisateursService } from './utilisateurs.service';

/**
 * UtilisateursModule (V05 LOT 1.3) — gestion cross-école des comptes par l'Admin.
 * Importe `AuthModule` (révocation de session) + `AuditModule` (journal). Exporte
 * `UtilisateursService` : son helper `createAccount` est réutilisé par EcolesModule
 * pour créer la Direction d'une école (1.2).
 */
@Module({
  imports: [AuditModule, AuthModule],
  controllers: [UtilisateursController],
  providers: [UtilisateursService],
  exports: [UtilisateursService],
})
export class UtilisateursModule {}
