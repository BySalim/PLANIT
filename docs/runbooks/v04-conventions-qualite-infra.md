# Vague 04 — Conventions qualite et infra

> Date : 2026-06-06 · Vague : 04 LOT 0.4 · Source : ADR-0013 et ADR-0014

## Objectif

Ce runbook fige les conventions operationnelles que les LOTs 1 a 6 doivent suivre. Il ne remplace pas les ADR ; il sert de checklist concrete pour coder les Dockerfiles, jobs CI, tests, scripts k6 et runbooks de deploiement.

## Coverage par package

| Package              | Lines | Branches | Functions | Statements |
| -------------------- | ----: | -------: | --------: | ---------: |
| `apps/backend`       |    60 |       45 |        55 |         60 |
| `apps/web`           |    45 |       35 |        40 |         45 |
| `packages/utils`     |    80 |       70 |        80 |         80 |
| `packages/ui`        |    55 |       45 |        55 |         55 |
| `packages/contracts` |    70 |       60 |        70 |         70 |

Regles :

- Le job CI `coverage` publie un artefact par package.
- Un package sans tests dedies doit soit ajouter des tests, soit justifier explicitement son exclusion temporaire.
- Les seuils ne baissent pas sans note dans `docs/tech-debt.md`.
- Les rapports coverage ne sont pas commites.

## Arborescence tests de performance

Racine : `tests/perf/`

```text
tests/perf/
  README.md
  scenarios/
    # scripts k6 par flow, ex: login.js, planning-week.js
  lib/
    # helpers k6 partages : env, auth cookie, seuils
  results/
    # sorties locales ignorees par git
```

Conventions k6 :

- Les scripts lisent `BASE_URL` avec fallback `http://localhost:3000`.
- Les secrets ou identifiants de test viennent d'env vars, jamais du code.
- Les profils minimum sont `smoke` et `load-leger`.
- Le CI demarre en mode informationnel avant de devenir bloquant.

## Arborescence infra prod

Racine de convention : `infra/`

```text
infra/
  docker-compose.dev.yml
  docker-compose.prod.yml      # LOT 1
  caddy/
    Caddyfile.dev
    Caddyfile.prod             # LOT 1
  prod/
    README.md
    env/                       # exemples sans secrets
    scripts/                   # smoke, backup, restore, deploy pull-based
  ansible/                     # LOT 5
```

Regles :

- Les fichiers contenant des secrets reels restent ignores.
- Les exemples utilisent des placeholders explicites.
- La prod n'execute pas de seed automatique.
- Les scripts prod doivent echouer vite (`set -euo pipefail` cote shell).
- Les backups doivent etre testables en restauration, pas seulement generes.

## Images Docker

Conventions :

- Image backend : `ghcr.io/bysalim/planit-api:<sha>`.
- Image web : `ghcr.io/bysalim/planit-web:<sha>`.
- Dockerfiles multi-stage Alpine.
- Utilisateur non-root.
- Logs stdout/stderr.
- Healthcheck backend : `/api/health`.
- Readiness exploitable : `/api/health/ready`.
- Pas de seed dans l'image ni au boot prod.

## GitHub Actions

Regles :

- Toute nouvelle action GitHub doit etre epinglee a un SHA complet dans les workflows finaux.
- Pendant l'exploration, une PR peut utiliser un tag lisible, mais le LOT 4 doit convertir en SHA avant de rendre les checks bloquants.
- Les actions doivent avoir les permissions minimales (`permissions:` explicite par workflow/job).
- Les secrets viennent de GitHub Secrets ou GitHub Environments.
- Les artefacts publies ne doivent pas contenir d'env, logs sensibles ou dumps.

## Jobs CI attendus a terme

| Job                           | Bloquant quand stable                         | Lot      |
| ----------------------------- | --------------------------------------------- | -------- |
| `quality` lint/typecheck/test | Deja oui                                      | Existant |
| `build`                       | Deja oui                                      | Existant |
| `lighthouse`                  | Oui vers `main`, opt-in strict vers `develop` | Existant |
| `coverage`                    | Oui                                           | LOT 2    |
| `e2e`                         | Oui                                           | LOT 2    |
| `perf-smoke`                  | Informationnel puis oui                       | LOT 3/5  |
| `secrets`                     | Oui                                           | LOT 4    |
| `sca`                         | Oui                                           | LOT 4    |
| `sast`                        | Oui apres calibration                         | LOT 4    |
| `image-scan`                  | Oui apres images                              | LOT 4    |

## Task runner

Le repo expose un `justfile` racine pour les commandes ops. Les recettes doivent rester des wrappers lisibles autour de `pnpm`, `docker compose` et scripts `infra/`.

Recettes initiales :

- `dev`
- `test`
- `build`
- `deploy-beta`
- `deploy-vm`
- `backup`
- `restore`
- `logs`

Les recettes non encore implementees doivent echouer clairement avec un message indiquant le LOT responsable.

## Definition of done LOT 0.4

- Seuils coverage fixes dans ce runbook et ADR-0014.
- Arbo `tests/perf/` presente.
- Arbo `infra/prod/` presente.
- Convention SHA-pinning documentee.
- Les LOTs suivants peuvent implementer sans rediscuter les bases.
