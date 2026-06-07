# VAGUE-04-03 — Tests de performance k6 (LOT 3)

> Spec rédigée avant le code (workflow vibe code). Réf : ADR-0014 §5,
> conventions LOT 0.4 (`docs/runbooks/v04-conventions-qualite-infra.md`).

## Objectif

Mesurer la latence et le taux d'erreur des **endpoints chauds** de l'API sous
charge légère, avec des seuils initiaux, une baseline tracée et un job CI
`perf-smoke` **informationnel** (non bloquant en V04 ; bloquant prévu LOT 5.9).

## Portée

Endpoints chauds (ADR-0014 §5) :

| Flow             | Méthode + route                          | Acteur | Note                                       |
| ---------------- | ---------------------------------------- | ------ | ------------------------------------------ |
| login            | `POST /api/auth/login`                   | RP     | pose les cookies `access`/`refresh`        |
| planning semaine | `GET /api/v2/sessions?weekStart=<lundi>` | RP     | `weekStart` = lundi (UTC) semaine courante |
| suivi-modules    | `GET /api/suivi-modules`                 | RP     | tous params optionnels                     |
| inscription      | `GET /api/etudiants/lookup?email=<seed>` | RP     | **entrée lecture** du flow email-first     |
| liste classes    | `GET /api/classes`                       | RP     |                                            |

**Hors portée** : le `POST /api/classes/:id/inscriptions` (écriture mutante,
contrainte unique double-diplôme → 409 si rejoué). Le smoke exerce l'**entrée
lecture** du flow (`/etudiants/lookup`), idempotente. Le test d'écriture avec
teardown est tracé en dette (extension `load-leger` future).

## Conception

- **Arbo** (LOT 0.4) : `tests/perf/{lib,scenarios,results}/`. `results/` ignoré
  par git.
- **Cible** : `BASE_URL` (fallback `http://localhost:3000`, le web proxy
  `/api`). En CI le job vise le backend direct (`http://localhost:3001`) pour
  isoler la latence API sans le proxy Next. Toujours préfixer `/api`.
- **Auth** : le cookie jar par-VU de k6 stocke le cookie `access` (HttpOnly)
  posé par `login` et le renvoie sur les requêtes suivantes de l'itération. Pas
  de header manuel.
- **Backend perf en `NODE_ENV=test`** : relâche le throttle login (`5/min/IP`
  → `10000`, sinon un smoke en boucle prendrait des 429) **et** rend les cookies
  non-Secure (acceptés sur http). On mesure la latence des endpoints, pas le
  garde-fou anti-brute-force (qui reste actif à `5/min` en prod réelle).
- **Identifiants** : fixtures de seed (`aminata.diallo@planit.test` …,
  `Test1234!`), surchargables par env. Pas des secrets — mêmes comptes que le
  seed et les e2e.
- **`weekStart`** : lundi (UTC) de la semaine courante, calculé côté script
  (le seed date ses séances ainsi → données réelles). Surchargable via
  `WEEK_START`.

## Profils (ADR-0014 §5)

- `smoke` : court (2 VUs / 20 s), CI informationnelle.
- `load-leger` : ramp 10 VUs / ~2 min, manuel/nocturne, baseline.

Pilotés par `__ENV.PROFILE` (défaut `smoke`).

## Seuils initiaux (ADR-0014 §5)

- `http_req_failed` (4xx+5xx) : **< 1 %**.
- `http_req_duration` p95 : **< 800 ms** (global **et** par endpoint via tag).
- `server_errors` (compteur 5xx) : **count < 1** (aucune réponse 5xx).
- `checks` : **> 99 %** (statuts attendus).

Seuils de départ ; la baseline LOT 3 peut les ajuster (tracé runbook).

## CI

Job `perf-smoke` (`ci.yml`), sur PR vers `develop`/`main` :

1. Postgres service + `migrate deploy` + `generate` + `db:seed`.
2. Build packages internes + backend ; start backend `NODE_ENV=test` (cookies
   non-Secure, throttle relâché).
3. Install k6 (binaire pinné v2.0.0, download direct — pas d'action tierce).
4. `k6 run tests/perf/scenarios/smoke.js` (`PROFILE=smoke`,
   `BASE_URL=http://localhost:3001`), `continue-on-error: true`
   (informationnel — DoD LOT 3 ; bloquant au LOT 5.9).
5. Upload du résumé JSON en artefact.

## Livrables

- `tests/perf/lib/{config,auth,flows}.js`
- `tests/perf/scenarios/{login,classes,planning-week,suivi-modules,inscription-lookup,smoke}.js`
- `tests/perf/README.md` (maj), `tests/perf/results/.gitkeep`
- `.gitignore` (results), `Justfile` (`perf-smoke`, `perf-load`)
- `.github/workflows/ci.yml` (job `perf-smoke`)
- `docs/runbooks/perf-k6.md` (usage + baseline + passage bloquant)

## Critères d'acceptation (Done LOT 3)

- k6 mesure les 5 endpoints chauds avec seuils p95/erreur/5xx.
- Baseline tracée dans le runbook.
- Job CI `perf-smoke` présent (informationnel).
