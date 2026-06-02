# ADR-0009 — Stratégie d'observabilité (logs, erreurs, santé, métriques)

> **Statut** : Accepté pour la **Phase 0** · Phases 1-3 **Proposées** · **Date** : 2026-05-30 · **Vague** : 02 · **Auteur** : Salim (Tech Lead)

---

## Contexte

Avant cet ADR, PLANIT produit du **signal** mais ne l'**exploite** pas :

- **Backend** : logger `pino` structuré (JSON en prod, redaction des secrets) + `AllExceptionsFilter` global qui loggue les 5xx avec stack et les 4xx en `warn`. Endpoint `/api/health` = **liveness basique** (pas de check BD).
- **Frontend** : **aucun** error boundary (App Router) → une erreur de rendu = écran blanc ; **aucun** report d'erreur. Le frontend est **aveugle en prod**.
- **Infra** : `docker-compose.dev.yml` seulement ; aucun driver de logs, aucun agrégateur, aucune métrique, aucun uptime/alerting, aucun outil d'error tracking (pas de Sentry/Datadog/etc. dans le lockfile).
- **Conséquence** : en prod, les erreurs ne sont visibles que dans le `stdout` du conteneur (`docker logs`), sans recherche, sans rétention, sans alerte ; et rien côté frontend.

**Contraintes** qui cadrent la solution :

- **1 seule Hetzner CX22** (2 vCPU / 4 Go RAM / 40 Go) héberge **toute** la stack (Postgres, Redis à venir, backend, web derrière Caddy). Un ELK ou un Prometheus+Grafana+Loki **self-hosted sur la même box** affamerait l'app (Elasticsearch seul veut ~2 Go de heap).
- **Équipe de 5 étudiants**, budget ~0, peu de temps ops.
- Besoin de **neutralité vendeur** pour éviter le lock-in.

## Décision

Adopter une stratégie d'observabilité **par phases**. **Implémenter uniquement la Phase 0** en V02 ; **documenter** la cible complète et reporter le reste (chaque phase suivante introduit une dépendance et/ou un compte externe = décision sensible au sens du `CLAUDE.md`).

### Architecture cible (bout-à-bout)

```
                         ┌────────────────────────────────────────────┐
   Navigateur (web)      │  Backend NestJS (CX22)                       │
   ┌───────────────┐     │  ┌──────────────┐   ┌──────────────────┐    │
   │ error.tsx /   │     │  │ pino (JSON)  │   │ AllExceptionsFil.│    │
   │ global-error  │     │  │ + requestId  │◄──┤ (5xx err/4xx warn)│   │
   │ + reporter ───┼─────┼─►│              │   └──────────────────┘    │
   │ web-vitals ───┼─────┼─►│ /metrics     │   /health  /health/ready  │
   └──────┬────────┘     │  └──────┬───────┘          ▲                │
          │              └─────────┼──────────────────┼────────────────┘
          │ (Phase 1)              │ stdout JSON       │ (Phase 0 ✓)
          ▼                        ▼                   │
   ┌─────────────┐      ┌────────────────────┐   ┌──────────────┐
   │ Error track │◄─────┤ Collecteur (Alloy/ │   │ Uptime/probe │
   │ Sentry/Glit.│      │ Vector) → store     │   │ UptimeRobot  │
   └──────┬──────┘      │ (Better Stack/Loki) │   └──────┬───────┘
          │             └─────────┬──────────┘          │
          └──────────────► Alerting (Slack/Discord/email) ◄────────────
                          + Dashboards (Grafana / golden signals)
```

### Phase 0 — maintenant (V02) · in-house, **zéro dépendance**, **aucun compte externe**

1. **Error boundaries frontend** : `apps/web/src/app/error.tsx` (segment) + `app/global-error.tsx` (root) → fini l'écran blanc, repli on-brand avec « Réessayer ».
2. **Readiness probe** : `GET /api/health/ready` (vérifie Postgres via `SELECT 1`, **503** si injoignable) en plus du `GET /api/health` (liveness inchangé).
3. **Acquis conservés** : logs `pino` structurés + redaction + `AllExceptionsFilter`.

_Rationale_ : valeur immédiate (échec gracieux + une probe exploitable par un LB / moniteur), sans dépendance ni compte, sans charger la CX22.

### Phase 1 — suivante · error tracking + corrélation + expédition des logs

- **Error tracking** : **Sentry** (SaaS, free tier) recommandé pour l'effort minimal, **ou GlitchTip** (OSS compatible Sentry, self-host léger) si la propriété des données prime. Brancher `@sentry/node` (back) + `@sentry/nextjs` (front), DSN par env, upload des **source maps** en CI. Source du signal = `AllExceptionsFilter` (back) + un reporter appelé depuis les error boundaries (front).
- **`requestId` / correlation id** : middleware (ou `AsyncLocalStorage`) propagé dans **chaque ligne de log** + renvoyé en en-tête `X-Request-Id`.
- **Expédition des logs** : l'app reste **stdout-JSON** (12-factor) ; un collecteur (**Grafana Alloy** / **Vector**) expédie vers un store. Vu la CX22, **privilégier un SaaS free tier** (Better Stack / Axiom / Grafana Cloud) plutôt qu'un Loki self-hosted sur la même box.

### Phase 2 — métriques + uptime + alerting

- **Métriques HTTP** (méthode **RED** : Rate / Errors / Duration) via un intercepteur + endpoint `/metrics` (`prom-client`) scrapé par **Prometheus** (agent Grafana Cloud ou petit self-host), dashboards **golden signals** dans **Grafana**.
- **RUM frontend** : `useReportWebVitals` (natif Next) → endpoint backend ou Sentry. (Lighthouse CI couvre déjà la perf « labo ».)
- **Uptime** : UptimeRobot / Better Stack ping `/api/health/ready`. **Alerting** sur taux de 5xx + indisponibilité → Slack / Discord / email.

### Phase 3 — plus tard, seulement si le besoin émerge

- **APM / tracing** distribué via **OpenTelemetry** (neutre) → **Grafana Tempo** / Jaeger.
- **Profiling continu** (Pyroscope), **load testing** (k6), **session replay** (Sentry Replay / PostHog).

### Décisions transverses

- **In-house d'abord** : tout ce qui exige une dépendance npm ou un compte externe attend un **go explicite** (décision sensible `CLAUDE.md`).
- **OpenTelemetry** comme standard d'instrumentation cible → pas de lock-in vendeur.
- **SaaS free tiers > self-hosting lourd** sur la CX22 (RAM).
- **Sentry vs GlitchTip** : choix final reporté au lancement de la Phase 1.

## Conséquences

- ➕ Échec frontend **gracieux dès maintenant** ; une **vraie probe de readiness** pour l'ops (LB, moniteur).
- ➕ Roadmap **ordonnée et tracée** (tech-debt `TD-OBS-*`) ; les décisions coûteuses (compte/dépendance) sont **explicites**, pas accidentelles.
- ➖ Jusqu'à la Phase 1, la visibilité des erreurs prod reste limitée au `stdout` du conteneur (`docker logs`) — **accepté pour V02**.
- ➖ Les erreurs frontend sont **capturées** (plus d'écran blanc) mais **pas encore reportées** à distance avant la Phase 1.

## Alternatives considérées

- **Tout maintenant** (Sentry + Loki + Prometheus + Grafana self-host) : rejeté — coût ops + RAM CX22 + dépendances/comptes, contraire au « strict minimum » demandé.
- **ELK / Elastic Stack** : rejeté — Elasticsearch seul dépasse la RAM disponible.
- **Ne rien faire** : rejeté — frontend aveugle + aucune probe de readiness.

## Références

- Runbook opérationnel : [docs/runbooks/observabilite.md](../../runbooks/observabilite.md)
- Logger : [apps/backend/src/common/logger.module.ts](../../../apps/backend/src/common/logger.module.ts)
- Filtre d'exceptions : [apps/backend/src/common/all-exceptions.filter.ts](../../../apps/backend/src/common/all-exceptions.filter.ts)
- Health : [apps/backend/src/health/health.controller.ts](../../../apps/backend/src/health/health.controller.ts)
- Perf labo CI : [docs/runbooks/ci-lighthouse.md](../../runbooks/ci-lighthouse.md)
- Tech-debt : entrées `TD-OBS-*`
