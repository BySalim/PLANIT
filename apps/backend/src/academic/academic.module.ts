import { Module } from '@nestjs/common';
import { ModulesController } from './modules.controller';
import { ModulesService } from './modules.service';
import { UeController } from './ue.controller';
import { UeService } from './ue.service';

/**
 * AcademicModule (LOT 2 V02 B.7 + B.8) — regroupe UE et Modules. Les deux
 * resources sont couplées (un module appartient toujours à une UE parente).
 *
 * Endpoints :
 *  - `/api/ues`   (UeController) — CRUD UE + `POST /:ueId/modules` (création module)
 *  - `/api/modules` (ModulesController) — PUT/DELETE par id (pas de page détail, V2-D14)
 */
@Module({
  controllers: [UeController, ModulesController],
  providers: [UeService, ModulesService],
  exports: [UeService, ModulesService],
})
export class AcademicModule {}
