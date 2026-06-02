import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Logger } from 'pino';
import { Public } from '../auth/decorators/public.decorator';
import { PrismaService } from '../common/prisma.service';
import { PINO_LOGGER } from '../common/logger.module';

interface HealthResponse {
  status: 'ok';
  service: string;
  version: string;
  ts: string;
}

interface ReadinessResponse {
  status: 'ok';
  checks: { database: 'up' };
  ts: string;
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PINO_LOGGER) private readonly logger: Logger,
  ) {}

  /**
   * Liveness — le process répond. Ne touche **aucune** dépendance externe : un
   * orchestrateur ne doit pas redémarrer le conteneur juste parce que la BD est
   * momentanément indisponible (c'est le rôle de la readiness).
   */
  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness check (le service répond)' })
  @ApiResponse({ status: 200, description: 'Service vivant' })
  check(): HealthResponse {
    return {
      status: 'ok',
      service: 'planit-backend',
      version: '0.1.0',
      ts: new Date().toISOString(),
    };
  }

  /**
   * Readiness — le service est prêt à traiter du trafic : on vérifie que la base
   * de données répond (`SELECT 1`). Renvoie 503 sinon, pour qu'un load-balancer
   * ou un moniteur uptime puisse retirer l'instance du pool. Cf. ADR-0009 (Phase 0).
   */
  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'Readiness check (vérifie la base de données)' })
  @ApiResponse({ status: 200, description: 'Service prêt (BD joignable)' })
  @ApiResponse({ status: 503, description: 'Service non prêt (BD injoignable)' })
  async ready(): Promise<ReadinessResponse> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        checks: { database: 'up' },
        ts: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error({ err: error }, 'Readiness check échouée : base de données injoignable');
      throw new ServiceUnavailableException({
        status: 'error',
        checks: { database: 'down' },
      });
    }
  }
}
