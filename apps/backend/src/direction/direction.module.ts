import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { DirectionScopeService } from './direction-scope.service';
import { PersonnelController } from './personnel.controller';
import { PersonnelService } from './personnel.service';

/**
 * DirectionModule — pilotage scopé école par la Direction (LOT 2 / V5-D2).
 *
 * Expose :
 *  - `DirectionScopeService` — scope helpers (pas de hit BD, lu depuis JWT)
 *  - `AuditService` — journalisation des actions sensibles
 *  - `PersonnelController` + `PersonnelService` — CRUD RP/AC
 *
 * `PrismaModule` est `@Global()` — pas besoin de l'importer ici.
 */
@Module({
  controllers: [PersonnelController],
  providers: [DirectionScopeService, AuditService, PersonnelService],
  exports: [DirectionScopeService, AuditService],
})
export class DirectionModule {}
