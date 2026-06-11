# Tests de performance k6 — V04 (LOT 3)

> Scripts k6 mesurant la latence et le taux d'erreur des **endpoints chauds**
> de l'API. Réf : [ADR-0014 §5](../../docs/architecture/adr/0014-strategie-tests-qualite-v04.md),
> runbook détaillé : [`docs/runbooks/perf-k6.md`](../../docs/runbooks/perf-k6.md).

## Structure

```text
tests/perf/
  README.md
  lib/
    config.js     # env (BASE_URL, comptes seed), profils, seuils, compteur 5xx
    auth.js       # login → cookie jar k6
    flows.js      # lectures taguées (classes, planning, suivi, inscription)
  scenarios/
    smoke.js              # parcours RP complet — entrée du job CI
    login.js              # endpoints chauds isolés (1 par fichier)
    classes.js
    planning-week.js
    suivi-modules.js
    inscription-lookup.js
  results/        # sorties locales, ignorées par git
```

## Prérequis

- [k6](https://k6.io) installé (`k6 version`). Binaire autonome, hors pnpm.
- La **stack lancée** (backend + Postgres seedé). Le backend doit tourner en
  `NODE_ENV=test` pour relâcher le throttle login (`5/min/IP` → `10000`) et
  rendre les cookies non-Secure (acceptés sur http). En prod réelle le throttle
  reste à `5/min` et les cookies sont `Secure`.

## Lancer

```bash
# Smoke (défaut) contre le backend local :
BASE_URL=http://localhost:3001 PROFILE=smoke k6 run tests/perf/scenarios/smoke.js

# Un endpoint isolé :
BASE_URL=http://localhost:3001 k6 run tests/perf/scenarios/planning-week.js

# Charge légère (baseline, manuel/nocturne) :
BASE_URL=http://localhost:3001 PROFILE=load-leger k6 run tests/perf/scenarios/smoke.js

# Via le task runner :
just perf-smoke      # PROFILE=smoke
just perf-load       # PROFILE=load-leger
```

Par défaut `BASE_URL=http://localhost:3000` (le web proxifie `/api` → backend) ;
pointer sur `:3001` mesure l'API en isolation (sans le proxy Next).

## Variables d'environnement

| Var                  | Défaut                       | Rôle                               |
| -------------------- | ---------------------------- | ---------------------------------- |
| `BASE_URL`           | `http://localhost:3000`      | hôte cible (préfixe `/api` ajouté) |
| `PROFILE`            | `smoke`                      | `smoke` ou `load-leger`            |
| `VUS` / `DURATION`   | profil                       | surcharge VUs / durée              |
| `WEEK_START`         | lundi courant                | semaine du planning (`YYYY-MM-DD`) |
| `PERF_PASSWORD`      | `Test1234!`                  | mot de passe des comptes seed      |
| `PERF_RP_EMAIL`      | `aminata.diallo@planit.test` | compte RP                          |
| `PERF_STUDENT_EMAIL` | `ibrahima.sow@planit.test`   | email du lookup inscription        |

Les identifiants par défaut sont des **fixtures de seed** (dev/test), pas des
secrets — jamais de vrai mot de passe dans les scripts.

## Seuils initiaux (ADR-0014 §5)

- `http_req_failed` (4xx + 5xx) **< 1 %**
- `http_req_duration` p95 **< 800 ms** (global **et** par endpoint via tag)
- `server_errors` (compteur 5xx) **count < 1**
- `checks` **> 99 %**

Seuils de départ ; la baseline LOT 3 peut les ajuster (voir runbook).

## CI

Le job `perf-smoke` (`.github/workflows/ci.yml`) lance `scenarios/smoke.js` sur
chaque PR vers `develop`/`main`. **Informationnel** en V04 (`continue-on-error`)
— il devient bloquant au LOT 5.9 (branch protection). Le résumé JSON est uploadé
en artefact.
