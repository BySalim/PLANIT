# Runbook — Tests de performance k6 (V04 LOT 3)

> Mesure de la latence et du taux d'erreur des endpoints chauds de l'API.
> Scripts : [`tests/perf/`](../../tests/perf/). Décision : ADR-0014 §5.

## 1. Ce qui est mesuré

Cinq endpoints chauds (un VU = parcours RP complet dans `smoke.js`) :

| Endpoint             | Route                                    | Tag k6        |
| -------------------- | ---------------------------------------- | ------------- |
| login                | `POST /api/auth/login`                   | `login`       |
| liste classes        | `GET /api/classes`                       | `classes`     |
| planning semaine     | `GET /api/v2/sessions?weekStart=<lundi>` | `planning`    |
| suivi modules        | `GET /api/suivi-modules`                 | `suivi`       |
| inscription (lookup) | `GET /api/etudiants/lookup?email=<seed>` | `inscription` |

L'écriture d'inscription (`POST /classes/:id/inscriptions`) est **hors portée
smoke** (mutation + contrainte unique 409). Extension `load-leger` avec teardown
possible plus tard.

## 2. Profils (`PROFILE`)

| Profil       | Charge                  | Usage                             |
| ------------ | ----------------------- | --------------------------------- |
| `smoke`      | 2 VUs / 20 s            | CI informationnelle, vérif rapide |
| `load-leger` | ramp 10 VUs / ~1 min 50 | baseline manuelle/nocturne        |

Surcharge fine : `VUS`, `DURATION`.

## 3. Seuils initiaux (ADR-0014 §5)

| Métrique                        | Seuil          | Sens                             |
| ------------------------------- | -------------- | -------------------------------- |
| `http_req_failed`               | `rate < 0.01`  | < 1 % d'erreurs HTTP (4xx + 5xx) |
| `http_req_duration` (global)    | `p95 < 800 ms` | latence acceptable               |
| `http_req_duration{endpoint:*}` | `p95 < 800 ms` | par endpoint                     |
| `server_errors`                 | `count < 1`    | aucune réponse 5xx               |
| `checks`                        | `rate > 0.99`  | statuts attendus                 |

Seuils de **départ** : la baseline (§5) peut les resserrer une fois les chiffres
réels connus.

## 4. Lancer en local

Prérequis : k6 installé + la stack lancée, **backend en `NODE_ENV=test`**
(relâche le throttle login `5/min` → `10000` et rend les cookies non-Secure pour
http ; en prod le throttle reste à `5/min` et les cookies sont `Secure`).

```bash
# 1. Stack (depuis la racine) : Postgres + backend seedé
docker compose -f infra/docker-compose.dev.yml up -d
cd apps/backend && pnpm prisma migrate deploy && pnpm db:seed
NODE_ENV=test pnpm start          # écoute :3001

# 2. Smoke (autre terminal, depuis la racine)
just perf-smoke                   # ou :
BASE_URL=http://localhost:3001 PROFILE=smoke k6 run tests/perf/scenarios/smoke.js
```

## 5. Baseline

> **Premier relevé : à compléter depuis l'artefact `perf-smoke-summary` du
> premier run CI vert** (onglet Actions → job `Perf smoke (k6)`). Reporter ici
> les p95 par endpoint pour figer la référence.

| Endpoint    | p95 (ms)       | err % | Relevé le |
| ----------- | -------------- | ----- | --------- |
| login       | _à renseigner_ |       |           |
| classes     | _à renseigner_ |       |           |
| planning    | _à renseigner_ |       |           |
| suivi       | _à renseigner_ |       |           |
| inscription | _à renseigner_ |       |           |

Contexte du relevé : profil `smoke`, backend direct `:3001`, DB seedée,
runner `ubuntu-latest`. Toute dérive future se compare à cette ligne.

## 6. CI

Job `perf-smoke` (`.github/workflows/ci.yml`), sur PR vers `develop`/`main` :
Postgres → migrate → seed → build backend → start (`NODE_ENV=test`) → k6 smoke.

**Informationnel** en V04 : le run k6 a `continue-on-error: true`. Le step
reflète l'état des seuils (rouge si dépassés) mais le job reste vert. Le résumé
texte est uploadé en artefact (`perf-smoke-summary`).

### Passer le job bloquant (LOT 5.9)

1. Stabiliser la baseline (§5) sur 2+ runs.
2. Retirer `continue-on-error: true` du step « Run k6 perf smoke ».
3. Ajouter le contexte `Perf smoke (k6)` aux required status checks de
   `develop` et `main` (cf. `protect-main`).

## 7. Dépannage

| Symptôme                            | Cause probable                 | Fix                                                  |
| ----------------------------------- | ------------------------------ | ---------------------------------------------------- |
| Vague de `429` sur login            | backend pas en `NODE_ENV=test` | relancer le backend en `test`                        |
| `login 200` échoue, cookies absents | cookie `Secure` sur http       | `NODE_ENV` ≠ `production` requis                     |
| `planning` renvoie vide (mais 200)  | semaine sans séance            | défaut = lundi courant (seedé) ; sinon `WEEK_START`  |
| `inscription` 404                   | email non seedé                | `PERF_STUDENT_EMAIL` = compte existant               |
| p95 élevé au 1ᵉʳ VU                 | cold start backend/JIT         | les VUs suivants se stabilisent ; ignorer le warm-up |
