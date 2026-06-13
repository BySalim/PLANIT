import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

/**
 * AuditModule (V05 LOT 1.4 / V5-D8) — journal d'audit des actions sensibles.
 * Exporte `AuditService` pour que les modules Admin (Écoles, Utilisateurs)
 * écrivent leur trace dans la même transaction que l'action.
 */
@Module({
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
