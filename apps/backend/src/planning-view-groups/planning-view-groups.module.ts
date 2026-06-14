import { Module } from '@nestjs/common';
import { PlanningViewGroupsController } from './planning-view-groups.controller';
import { PlanningViewGroupsService } from './planning-view-groups.service';

/**
 * PlanningViewGroupsModule (V05 LOT 7.1) — CRUD des groupes de vue planning
 * (presets custom des vues by-X), privés à leur créateur. `PrismaService` est
 * global, aucun import supplémentaire requis.
 */
@Module({
  controllers: [PlanningViewGroupsController],
  providers: [PlanningViewGroupsService],
})
export class PlanningViewGroupsModule {}
