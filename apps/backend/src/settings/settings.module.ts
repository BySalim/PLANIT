import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

/**
 * SettingsModule (LOT 2 V02 B.10) — singleton table read publicly + edited
 * by RP only. Consumed by SeanceV2Service to validate session hours, and
 * by the front to render input min/max bounds.
 */
@Module({
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
