import { describe, expect, it } from 'vitest';
import { MetricsService } from '../../src/metrics/metrics.service';

// Métriques RED (ADR-0009 Phase 2). Unitaire pur : prom-client fonctionne hors
// app/BD, on vérifie le rendu Prometheus et la prise en compte d'une observation.

describe('MetricsService', () => {
  it('expose un content-type Prometheus', () => {
    const svc = new MetricsService();
    expect(svc.contentType).toContain('text/plain');
  });

  it('inclut les métriques par défaut du process', async () => {
    const svc = new MetricsService();
    const out = await svc.render();
    expect(out).toContain('process_cpu_user_seconds_total');
    expect(out).toContain('service="planit-backend"');
  });

  it('comptabilise une requête observée (RED : rate/errors/duration)', async () => {
    const svc = new MetricsService();
    svc.observe('GET', '/health', 200, 0.012);
    svc.observe('GET', '/health', 200, 0.034);
    svc.observe('POST', '/seances', 500, 0.21);

    const out = await svc.render();
    // Compteur : 2 GET /health 200
    expect(out).toMatch(
      /http_requests_total\{[^}]*method="GET"[^}]*route="\/health"[^}]*status="200"[^}]*\}\s+2/,
    );
    // Erreur visible via le label status
    expect(out).toMatch(/http_requests_total\{[^}]*status="500"[^}]*\}\s+1/);
    // Histogramme de durée présent
    expect(out).toContain('http_request_duration_seconds_bucket');
  });
});
