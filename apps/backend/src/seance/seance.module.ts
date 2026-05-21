import { Module } from '@nestjs/common';
import { WsModule } from '../ws/ws.module';
import { SeanceController } from './seance.controller';
import { SeanceService } from './seance.service';

@Module({
  imports: [WsModule],
  controllers: [SeanceController],
  providers: [SeanceService],
})
export class SeanceModule {}
