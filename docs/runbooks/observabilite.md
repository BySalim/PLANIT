# Runbook — Observabilité

> Comment lire les logs, vérifier la santé du service, et comprendre ce qui est
> capturé (ou non) en production. Décisions et roadmap complète : [ADR-0009](../architecture/adr/0009-observabilite-strategie.md).

## 1. État actuel (Phase 0 + Phases 1-2 en cours, activées 2026-06-08)

| Capacité                       | État                                                                | Où                                                                       |
| ------------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Logs structurés backend        | ✅ pino (JSON prod, pretty dev) + redaction                         | `apps/backend/src/common/logger.module.ts`                               |
| Corrélation `requestId`        | ✅ chaque log + en-tête `X-Request-Id`                              | `apps/backend/src/common/request-context.ts`, `request-id.middleware.ts` |
| Capture des exceptions backend | ✅ 5xx en `error` (avec stack), 4xx en `warn`                       | `apps/backend/src/common/all-exceptions.filter.ts`                       |
| Liveness                       | ✅ `GET /api/health`                                                | `apps/backend/src/health/health.controller.ts`                           |
| Readiness (check BD)           | ✅ `GET /api/health/ready`                                          | idem                                                                     |
| Error boundaries frontend      | ✅ repli UI (pas d'écran blanc)                                     | `apps/web/src/app/error.tsx`, `global-error.tsx`                         |
| Inspection des logs (web)      | ✅ **Dozzle** (profil `observability`)                              | `infra/docker-compose.prod.yml`                                          |
| Uptime / alerting              | ✅ **Uptime Kuma** (profil `observability`) + alerte backup         | `infra/docker-compose.prod.yml`                                          |
| Métriques RED + dashboards     | ✅ `/api/metrics` (prom-client) + **Prometheus + Grafana** (profil) | `apps/backend/src/metrics/`, `infra/prometheus/`, `infra/grafana/`       |
| Error tracking (Sentry)        | 🟡 **câblé dormant** (back + web) — actif dès qu'un DSN est posé    | `apps/backend/src/common/sentry.ts`, `apps/web/src/instrumentation*.ts`  |
| Source-maps Sentry en CI       | ⏳ à activer avec le DSN (token Sentry requis)                      | §6 ci-dessous                                                            |

## 2. Logs

- **Format** : JSON en prod/test, `pino-pretty` colorisé en dev. Champ `service: planit-backend`.
- **Niveau** : variable d'env `LOG_LEVEL` (défaut `info` en prod, `debug` en dev).
- **Redaction** : `password`, `passwordHash`, `token`, `accessToken`, `refreshToken`, `authorization`, `cookie`, `mfaSecret` (top-level **et** imbriqués) → `[REDACTED]`. **Ne jamais** retirer un champ de cette liste sans raison.
- **Destination en prod** : `stdout` du conteneur. Il n'y a **pas encore** d'agrégateur (Phase 1).

### Lire les logs en production (CX22)

```bash
# Suivre les logs du backend
docker compose logs -f backend

# Filtrer les erreurs (logs JSON → jq)
docker compose logs --no-color backend | jq 'select(.level >= 50)'   # 50 = error, 40 = warn

# Chercher une erreur par chemin / status
docker compose logs --no-color backend | jq 'select(.statusCode >= 500)'
```

> Tant que la Phase 1 n'est pas livrée, c'est le **seul** moyen d'inspecter les
> erreurs prod. Pas de rétention au-delà de la durée de vie du conteneur.

## 3. Santé du service

Deux endpoints **publics** (`@Public()`), non préfixés par l'auth :

| Endpoint                | Rôle                                                           | Réponses                                                                                            |
| ----------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `GET /api/health`       | **Liveness** — le process répond. Ne touche aucune dépendance. | `200 { status, service, version, ts }`                                                              |
| `GET /api/health/ready` | **Readiness** — prêt à servir : vérifie Postgres (`SELECT 1`). | `200 { status:"ok", checks:{database:"up"} }` ou `503 { status:"error", checks:{database:"down"} }` |

```bash
curl -s http://localhost:3001/api/health        | jq
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/api/health/ready
```

**Usage prévu** :

- **Liveness** → sonde de redémarrage d'un orchestrateur. Ne **pas** y mettre de check BD (sinon un incident BD passager redémarre le conteneur en boucle).
- **Readiness** → surveillé par **Uptime Kuma** (profil `observability`, §5) qui ping `/api/health/ready` et alerte ; un load-balancer peut aussi retirer l'instance du pool quand la BD est injoignable.

## 4. Erreurs frontend

- `app/error.tsx` capture les erreurs de rendu/données sous `app/` ; `app/global-error.tsx` est le dernier rempart (erreur dans le root layout, rend ses propres `<html>/<body>`).
- L'utilisateur voit un **repli sobre** avec « Réessayer » (et « Retour à l'accueil » pour le segment), au lieu d'un écran blanc.
- **En dev** : l'overlay Next.js affiche la stack normalement.
- **En prod** : les deux boundaries appellent `Sentry.captureException` — **report distant actif dès qu'un DSN est posé** (`NEXT_PUBLIC_SENTRY_DSN`), no-op sinon. Voir §6.

## 5. Stack d'observabilité self-host (profil `observability`)

Lancer les outils self-host (opt-in, ne tourne pas par défaut) :

```bash
docker compose --env-file /opt/planit/.env.prod -f infra/docker-compose.prod.yml \
  --profile observability up -d
```

Les UIs sont bindées sur **127.0.0.1** (pas d'exposition LAN/Internet, pas de port ufw à ouvrir) →
accès par **SSH local-forward** depuis ton poste :

```bash
ssh -L 8081:localhost:8081 -L 3011:localhost:3011 -L 3012:localhost:3012 deploy@<IP_VM>
# Dozzle http://localhost:8081 · Uptime Kuma http://localhost:3011 · Grafana http://localhost:3012
```

| Outil           | Rôle                                                | Premier réglage                                                                                                                              |
| --------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dozzle**      | Lecture web des logs de tous les conteneurs.        | Aucun — lit `docker.sock` (lecture seule).                                                                                                   |
| **Uptime Kuma** | Ping `/api/health/ready` + alerte (e-mail/webhook). | Monitor HTTP(s) sur `http://backend:3001/api/health/ready` (backend EN DIRECT — pas `http://caddy/...` qui échoue au handshake TLS interne). |
| **Prometheus**  | Scrape `/api/metrics` (RED) du backend.             | Aucun — config `infra/prometheus/prometheus.yml` (scrape `backend:3001`).                                                                    |
| **Grafana**     | Dashboards golden-signals.                          | Login `admin` / `GRAFANA_ADMIN_PASSWORD` ; datasource + dashboard provisionnés.                                                              |

> **Métriques** : le backend expose `GET /api/metrics` (prom-client, `@Public()`). Caddy **refuse**
> ce chemin au public (tunnel) — Prometheus le scrape en interne. Dashboard livré :
> _PLANIT — Golden Signals_ (taux, erreurs 5xx, latence p95 par route, mémoire/event-loop).

**Alerte d'échec de sauvegarde** : dans Uptime Kuma, créer un monitor **Push** → copier son URL
(`http://127.0.0.1:3011/api/push/<token>`) dans `PLANIT_BACKUP_PUSH_URL` (`/opt/planit/cd.env`).
`backup.sh` envoie `status=up` à chaque succès et `status=down` en cas d'échec (cf. [truenas-backup.md §6](truenas-backup.md)).

> **`requestId`** : chaque réponse porte un en-tête `X-Request-Id` et chaque ligne de log le champ
> `requestId`. Dans Dozzle, filtrer sur cette valeur regroupe toutes les traces d'une même requête.

## 6. Activer Sentry (le SDK est déjà câblé, dormant) — les gestes restants

Le code est en place et **no-op tant qu'aucun DSN n'est posé** : `@sentry/node` (init au bootstrap +
report des 5xx depuis `AllExceptionsFilter`, corrélé au `requestId`) et `@sentry/nextjs` (init dormant
`instrumentation*.ts` + `captureException` dans les error boundaries). Pour l'activer :

1. **Créer le projet Sentry** (ou GlitchTip self-host, même SDK) → récupérer les **DSN** back + front.
2. **Poser le DSN backend** (runtime, pur) : `SENTRY_DSN` dans `/opt/planit/.env.prod` → `docker compose up -d backend`.
3. **Poser le DSN navigateur** (build-time !) : `NEXT_PUBLIC_SENTRY_DSN` est **inliné au build** du
   bundle client. La VM tire l'image GHCR déjà construite → le poser dans `.env.prod` **n'active PAS**
   le Sentry navigateur. Il faut le déclarer comme **variable repo GitHub** `NEXT_PUBLIC_SENTRY_DSN`
   (Settings → Secrets and variables → Actions → Variables ; DSN public par design) puis **rebuild
   l'image web** (`build-images.yml` la passe en build arg). Le Next **server-side** (SSR) lit
   `SENTRY_DSN` au runtime → couvert par l'étape 2.
   - **CSP** : aucune action — le `connect-src` **dérive automatiquement** l'hôte d'ingestion du DSN
     au build ([next.config.ts](../../apps/web/next.config.ts) `sentryConnectSrc()`).
4. **Source-maps en CI** (sinon stacks minifiées illisibles) : ajouter `withSentryConfig` à
   `next.config.ts` + le secret `SENTRY_AUTH_TOKEN` (et approuver le build script `@sentry/cli` :
   `pnpm approve-builds`). Étape **différée** car elle exige le projet Sentry + token.

## 7. Références

- [ADR-0009 — Stratégie d'observabilité](../architecture/adr/0009-observabilite-strategie.md) (architecture cible + phasage)
- [Runbook CI Lighthouse](ci-lighthouse.md) (perf frontend « labo »)
- Tech-debt : entrées `TD-OBS-*`
