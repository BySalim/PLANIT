# Vague 04 — Etat des lieux tests, CI et infra

> Date : 2026-06-06 · Vague : 04 LOT 0.1 · Branche : `feat/salim`

## Resume executif

PLANIT dispose deja d'un socle serieux : monorepo pnpm, CI lint/typecheck/test/build, Lighthouse mobile, tests backend d'integration, tests web unitaires, e2e Playwright minimal, health/readiness backend, docker-compose dev pour Postgres/Redis/MinIO et gitleaks configure.

La Vague 04 ne repart donc pas de zero. Elle transforme ce socle en chaine qualite/deploiement exploitable : coverage gate, e2e 4 roles en CI, tests perf k6, scans securite, conteneurisation prod, CD beta/VM, observabilite et runbooks d'exploitation.

## Inventaire rapide

| Domaine           | Existant                                                                  | Trou principal V04                                                          |
| ----------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| CI generale       | `.github/workflows/ci.yml` avec jobs `quality`, `build`, `lighthouse`     | Pas de jobs dedies `coverage`, `e2e`, `perf`, `secrets/sca/sast/image-scan` |
| Branch protection | `protect-main.yml`, `branch-owner-guard.yml`                              | Checks bloquants V04 non encore ajoutes a la protection                     |
| Lighthouse        | `.github/lighthouserc.json` + runbook `ci-lighthouse.md`                  | Audit connecte reporte (`TD-LH-AUTH-AUDIT`)                                 |
| Tests backend     | 20 fichiers environ dans `apps/backend/test/`, integration Nest + test DB | Pas de gate coverage ni rapport artefact                                    |
| Tests web         | Tests composants/hooks/lib dans `apps/web/src/**`                         | Couverture partielle, pas de seuil dedie                                    |
| Tests packages    | `packages/utils` et `packages/ui` ont des tests                           | `packages/contracts` n'a pas de tests dedies                                |
| E2E               | `e2e/smoke.spec.ts` + `playwright.config.ts`                              | Scenario encore V01 (`/rp`) et pas de job CI e2e 4 roles                    |
| Perf              | Lighthouse front uniquement                                               | Pas de `tests/perf/`, pas de k6, pas de baseline API                        |
| Securite          | `.gitleaks.toml`, `SECURITY.md`, bonnes regles backend                    | Pas de scans CI secrets/SCA/SAST/image/IaC, pas de SHA-pinning systematique |
| Infra dev         | `infra/docker-compose.dev.yml` : Postgres, Redis, MinIO                   | Pas d'image web/backend, pas de compose prod                                |
| Reverse proxy     | `infra/caddy/Caddyfile.dev` placeholder                                   | Pas de `Caddyfile.prod`                                                     |
| Observabilite     | ADR-0009, runbook, pino, `/api/health`, `/api/health/ready`               | Pas d'error-tracking, uptime externe, metriques, aggregation logs           |
| Runbooks          | setup local, deploy placeholder, migrations, observabilite, Lighthouse    | Runbooks deploy/perf/incident/VM a produire pendant V04                     |

## Fichiers et commandes observes

### CI GitHub Actions

- `.github/workflows/ci.yml`
  - `quality` : Postgres service, `pnpm install`, `prisma migrate deploy`, build `contracts` + `utils`, lint, typecheck, test.
  - `build` : `pnpm build`.
  - `lighthouse` : PR uniquement, backend + web en local, audit `/login`, gating strict sur PR vers `main` ou label `lighthouse-strict`.
- `.github/workflows/protect-main.yml` : impose `develop -> main`.
- `.github/workflows/branch-owner-guard.yml` : empêche les pushs sur branche d'un autre membre.
- `.github/workflows/auto-assign-reviewer.yml` : affectation reviewer.

### Scripts racine

- `pnpm dev` : apps web/backend hors mobile.
- `pnpm dev:mobile` : Expo.
- `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`.
- `pnpm test:e2e` : Playwright.
- `pnpm db:migrate`, `pnpm db:seed`, `pnpm db:reset`.
- `postinstall` : build `@planit/contracts` + `@planit/utils`.

### Tests reperes

40 fichiers de test/spec reperes dans `apps/`, `packages/` et `e2e/`.

| Zone     | Etat                                                                                                                                              |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend  | Integration dense : auth/RBAC, seances, classes, formations, maquettes, inscriptions, suivi, AC, health, settings, salles, enseignants, etudiants |
| Web      | Tests composants planning/layout/RP, hooks auth/role/realtime/query, libs export/return-url                                                       |
| Packages | Tests `utils` et `ui`; `contracts` compile mais n'a pas de suite test dediee                                                                      |
| E2E      | Smoke minimal, a refaire pour les 4 roles V04                                                                                                     |

## Matrice des trous

| Trou                             | Impact                                                        | Lot cible | Recommandation                                          |
| -------------------------------- | ------------------------------------------------------------- | --------- | ------------------------------------------------------- |
| Pas de coverage gate             | Une regression de couverture passe si les tests restent verts | LOT 2     | Ajouter scripts coverage par package + seuils ADR-0014  |
| Pas d'artefact coverage CI       | Difficile de suivre la progression                            | LOT 2     | Upload `coverage/` par package dans le job dedie        |
| E2E non branche en CI            | Les flows critiques peuvent casser hors unit/int              | LOT 2     | Job Playwright avec services Postgres/backend/web       |
| E2E smoke obsolete               | Le test attend `/rp`, alors que V03 a route role-aware        | LOT 2     | Recrire les scenarios autour des roles seed             |
| Pas de k6                        | Aucune baseline API chaude                                    | LOT 3     | `tests/perf/` + profils smoke/load-leger                |
| Pas de Dockerfiles prod          | CD impossible et pas de scan image                            | LOT 1     | Docker multi-stage web/backend                          |
| Pas de compose prod              | VM self-host non reproductible                                | LOT 1     | `infra/docker-compose.prod.yml` + Caddy prod            |
| Pas de validation env fail-fast  | Deploiement peut booter mal configure                         | LOT 1     | Validation au boot backend/web selon ADR-0013           |
| Actions non SHA-pinned           | Supply chain GitHub Actions plus fragile                      | LOT 4     | Convention LOT 0, application LOT 4                     |
| Pas de scans SCA/SAST/image/IaC  | Risques deps/secrets/config non gates                         | LOT 4     | Gitleaks + pnpm audit + OSV + Trivy + Semgrep           |
| Deploy runbook placeholder       | Exploitation non transmissible                                | LOT 5     | Recrire `docs/runbooks/deploy.md`                       |
| Pas de CD beta/VM                | Livraison manuelle                                            | LOT 5     | Railway depuis `develop`, VM pull-based depuis `main`   |
| Pas de DR formalise              | Restauration non prouvee                                      | LOT 5     | Runbook incident + restore TrueNAS                      |
| Pas de metriques/log aggregation | Debug prod limite au stdout                                   | LOT 6     | Prometheus optionnel + Loki/Grafana selon ADR-0013/0014 |

## Points d'attention

- `apps/mobile` et `apps/whatsapp-bot` restent hors perimetre V04.
- Les packages `@planit/contracts` et `@planit/utils` doivent etre buildes avant les consumers Node/Vitest.
- Le backend depend d'une base Postgres pour une grande partie des tests d'integration.
- Les nouveaux outils qui ajoutent des dependances npm devront etre valides explicitement si on les installe dans le repo. Les outils CI externes via actions/images sont traites dans les ADR V04.
- La politique securite V04 est calibree : elle ne remplace pas la vague d'audit securite complete.

## Decisions de suite

- ADR-0013 fige la strategie de deploiement.
- ADR-0014 fige la strategie tests/qualite.
- `docs/runbooks/v04-conventions-qualite-infra.md` fige les conventions operationnelles utilisables par les LOTs 1 a 6.
