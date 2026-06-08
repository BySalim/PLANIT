import { Controller, Get, Header } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { MetricsService } from './metrics.service';

/**
 * Endpoint d'exposition Prometheus : `GET /api/metrics` (préfixe global `api`).
 * `@Public()` car scrapé par Prometheus **dans le réseau compose**
 * (`http://backend:3001/api/metrics`) — sans cookie d'auth. Caddy **refuse**
 * ce chemin au trafic public (tunnel) pour ne pas exposer les métriques internes.
 */
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Public()
  @Get()
  @ApiExcludeEndpoint()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async scrape(): Promise<string> {
    return this.metrics.render();
  }
}
