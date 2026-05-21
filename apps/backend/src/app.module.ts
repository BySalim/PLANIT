import { Module } from '@nestjs/common';
import { PrismaModule } from './common/prisma.module';
import { HealthModule } from './health/health.module';
import { SeanceModule } from './seance/seance.module';
import { WsModule } from './ws/ws.module';

@Module({
  imports: [PrismaModule, HealthModule, WsModule, SeanceModule],
})
export class AppModule {}
