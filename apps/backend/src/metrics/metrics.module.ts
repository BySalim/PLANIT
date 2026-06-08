import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MetricsController } from './metrics.controller';
import { MetricsInterceptor } from './metrics.interceptor';
import { MetricsService } from './metrics.service';

/**
 * Observabilité — métriques RED (ADR-0009 Phase 2). `APP_INTERCEPTOR` enregistré
 * ici s'applique **globalement** (toutes les routes), tout en résolvant
 * `MetricsService` dans le contexte de ce module.
 */
@Module({
  controllers: [MetricsController],
  providers: [MetricsService, { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor }],
})
export class MetricsModule {}
