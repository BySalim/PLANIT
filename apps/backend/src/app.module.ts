import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from './common/logger.module';
import { PrismaModule } from './common/prisma.module';
import { HealthModule } from './health/health.module';
import { SeanceModule } from './seance/seance.module';
import { WsModule } from './ws/ws.module';

// En env `test`, on désactive de facto le rate limiting (limite très haute)
// pour éviter que des suites qui enchaînent des POST/PUT déclenchent du 429.
// La logique throttler reste exercée dans des tests dédiés si besoin.
const isTest = process.env['NODE_ENV'] === 'test';
const DEFAULT_LIMIT = isTest ? 10_000 : 100;

@Module({
  imports: [
    LoggerModule,
    PrismaModule,
    ThrottlerModule.forRoot([
      // Quota global : 100 requêtes par IP / minute.
      // Les mutations sensibles ont leur propre @Throttle (voir SeanceController).
      { name: 'default', ttl: 60_000, limit: DEFAULT_LIMIT },
    ]),
    HealthModule,
    WsModule,
    SeanceModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
