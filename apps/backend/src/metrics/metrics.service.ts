import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

/**
 * Métriques RED (Rate / Errors / Duration) exposées au format Prometheus
 * (ADR-0009 Phase 2). Un registre dédié (pas le registre global) garde le
 * service isolé et testable. Les métriques par défaut du process (CPU, mémoire,
 * event-loop lag, GC) sont collectées en plus pour le dashboard golden-signals.
 */
@Injectable()
export class MetricsService {
  readonly registry = new Registry();
  private readonly httpDuration: Histogram<'method' | 'route' | 'status'>;
  private readonly httpTotal: Counter<'method' | 'route' | 'status'>;

  constructor() {
    this.registry.setDefaultLabels({ service: 'planit-backend' });
    collectDefaultMetrics({ register: this.registry });

    this.httpDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Durée des requêtes HTTP en secondes (RED : Duration).',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    this.httpTotal = new Counter({
      name: 'http_requests_total',
      help: 'Nombre total de requêtes HTTP (RED : Rate + Errors via le label status).',
      labelNames: ['method', 'route', 'status'],
      registers: [this.registry],
    });
  }

  /** Enregistre une requête terminée (cardinalité bornée : `route` = motif Express). */
  observe(method: string, route: string, status: number, durationSeconds: number): void {
    const labels = { method, route, status: String(status) };
    this.httpTotal.inc(labels);
    this.httpDuration.observe(labels, durationSeconds);
  }

  /** Rendu texte au format d'exposition Prometheus (scrapé sur `/api/metrics`). */
  async render(): Promise<string> {
    return this.registry.metrics();
  }

  get contentType(): string {
    return this.registry.contentType;
  }
}
