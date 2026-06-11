import { Injectable } from '@nestjs/common';
import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

/**
 * Sous-ensemble des objets Express utilisés ici (évite la dépendance directe à
 * `@types/express`, déjà ré-exporté indirectement par `@nestjs/platform-express`).
 */
interface RequestLike {
  method: string;
  route?: { path?: string };
  originalUrl?: string;
  url?: string;
}
interface ResponseLike {
  statusCode: number;
}

/**
 * Intercepteur global qui alimente les métriques RED (ADR-0009 Phase 2).
 * Mesure la durée de chaque requête HTTP et l'enregistre par méthode/route/status.
 * On s'appuie sur le **motif de route** Express (`/health/:id`) — pas l'URL brute —
 * pour borner la cardinalité des labels Prometheus.
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }
    const http = context.switchToHttp();
    const req = http.getRequest<RequestLike>();
    const res = http.getResponse<ResponseLike>();
    const method = req.method;
    const start = process.hrtime.bigint();

    return next.handle().pipe(
      finalize(() => {
        const route = this.routeOf(req);
        // Ne pas se mesurer soi-même (évite un bruit auto-référentiel à chaque scrape).
        if (route.includes('metrics')) {
          return;
        }
        const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
        this.metrics.observe(method, route, res.statusCode, durationSeconds);
      }),
    );
  }

  private routeOf(req: RequestLike): string {
    // route.path n'existe que pour une route matchée → fallback `unmatched` (404).
    return req.route?.path ?? 'unmatched';
  }
}
