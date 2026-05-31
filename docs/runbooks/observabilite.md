# Runbook — Observabilité

> Comment lire les logs, vérifier la santé du service, et comprendre ce qui est
> capturé (ou non) en production. Décisions et roadmap complète : [ADR-0009](../architecture/adr/0009-observabilite-strategie.md).

## 1. État actuel (Phase 0)

| Capacité                       | État                                          | Où                                                 |
| ------------------------------ | --------------------------------------------- | -------------------------------------------------- |
| Logs structurés backend        | ✅ pino (JSON prod, pretty dev) + redaction   | `apps/backend/src/common/logger.module.ts`         |
| Capture des exceptions backend | ✅ 5xx en `error` (avec stack), 4xx en `warn` | `apps/backend/src/common/all-exceptions.filter.ts` |
| Liveness                       | ✅ `GET /api/health`                          | `apps/backend/src/health/health.controller.ts`     |
| Readiness (check BD)           | ✅ `GET /api/health/ready`                    | idem                                               |
| Error boundaries frontend      | ✅ repli UI (pas d'écran blanc)               | `apps/web/src/app/error.tsx`, `global-error.tsx`   |
| Error tracking (Sentry…)       | ❌ Phase 1                                    | —                                                  |
| Agrégation/recherche de logs   | ❌ Phase 1 (`docker logs` seulement)          | —                                                  |
| Métriques / dashboards         | ❌ Phase 2                                    | —                                                  |
| Uptime / alerting              | ❌ Phase 2                                    | —                                                  |

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
- **Readiness** → moniteur uptime (UptimeRobot) et/ou retrait du pool par un load-balancer quand la BD est injoignable. Câblage infra = `TD-OBS-HEALTH` (Phase 2).

## 4. Erreurs frontend

- `app/error.tsx` capture les erreurs de rendu/données sous `app/` ; `app/global-error.tsx` est le dernier rempart (erreur dans le root layout, rend ses propres `<html>/<body>`).
- L'utilisateur voit un **repli sobre** avec « Réessayer » (et « Retour à l'accueil » pour le segment), au lieu d'un écran blanc.
- **En dev** : l'overlay Next.js affiche la stack normalement.
- **En prod** : l'erreur n'est **pas encore reportée à distance** (Phase 1 — `TD-OBS-SINK`). Pour l'instant, la seule trace d'une erreur frontend est ce que l'utilisateur signale.

## 5. Activer la Phase 1 (error tracking) — checklist

Quand l'équipe décide de brancher Sentry (ou GlitchTip) — **décision sensible** (dépendance + compte) :

1. Créer le projet Sentry (front + back) → récupérer les **DSN**.
2. Ajouter `@sentry/nextjs` (web) et `@sentry/node` (backend) — passer par un ADR/validation (ajout de dépendances).
3. Configurer les DSN via `.env` (jamais en dur) ; documenter dans `.env.example`.
4. Backend : initialiser Sentry au bootstrap + reporter depuis `AllExceptionsFilter`.
5. Frontend : reporter depuis `error.tsx` / `global-error.tsx` (`Sentry.captureException`).
6. Activer l'upload des **source maps** en CI (sinon stacks minifiées illisibles).
7. Ajouter le `requestId` (`TD-OBS-REQID`) pour corréler logs ↔ événements Sentry.

## 6. Références

- [ADR-0009 — Stratégie d'observabilité](../architecture/adr/0009-observabilite-strategie.md) (architecture cible + phasage)
- [Runbook CI Lighthouse](ci-lighthouse.md) (perf frontend « labo »)
- Tech-debt : entrées `TD-OBS-*`
