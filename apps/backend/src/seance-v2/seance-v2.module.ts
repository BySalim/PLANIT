import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { WsModule } from '../ws/ws.module';
import { SeanceV2Controller } from './seance-v2.controller';
import { SeanceV2Service } from './seance-v2.service';

/**
 * SeanceV2Module (LOT 2 V02 B.1 → B.5 + B.11) — endpoints /api/v2/sessions
 *
 * Parallel à `SeanceModule` V01 (qui reste exposé sur /api/sessions). Le LOT 3
 * (Oumy) basculera le web vers ces endpoints V02 ; le cleanup V01 et le drop
 * des colonnes legacy sont planifiés en LOT 3 (TD-029, TD-030).
 */
@Module({
  imports: [SettingsModule, WsModule],
  controllers: [SeanceV2Controller],
  providers: [SeanceV2Service],
})
export class SeanceV2Module {}
