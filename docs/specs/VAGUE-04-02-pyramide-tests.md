# SPEC — Vague 04 LOT 2 : Pyramide de tests complétée

> **Membre** : Salim (`feat/salim`, réassignation TL) · **Date** : 2026-06-07 · **LOT** : V04 — LOT 2 (2.1 → 2.5)
> **Références** : ADR-0014 (stratégie tests/qualité), `docs/runbooks/v04-conventions-qualite-infra.md` (seuils, jobs CI attendus).

## 1. Objectif

Transformer la suite de tests existante en **chaîne de qualité gatée** :
gate de couverture par package, complétion des unit/intégration critiques,
e2e Playwright 4 rôles, et jobs CI `coverage` + `e2e` (bloquants).

## 2. Périmètre

| ID  | Tâche                                                                           | Livrable                                                                                                       |
| --- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 2.1 | Coverage Vitest + seuils par package + report CI                                | `@vitest/coverage-v8`, blocs `coverage` dans les `vitest.config.ts`, scripts `test:coverage`, artefacts CI     |
| 2.2 | Combler unit critiques jusqu'aux seuils                                         | tests unit backend (services purs/mappers/scope) + web (composants/hooks/lib) là où sous seuil                 |
| 2.3 | Suites intégration API (test DB) flows V01→V03                                  | compléter les trous (auth refresh/logout/me, scope 403 cross-classe) — l'essentiel existe déjà                 |
| 2.4 | E2E Playwright 4 rôles                                                          | login + home role-aware (RP/AC/Enseignant/Étudiant) + redirect/forbidden ; remplace `e2e/smoke.spec.ts` périmé |
| 2.5 | Jobs CI `coverage` (gate+upload) + `e2e` (PG, seed, build, Playwright headless) | `.github/workflows/ci.yml`                                                                                     |

**Hors périmètre** : perf k6 (LOT 3), sécu CI (LOT 4), branch protection (LOT 5.9), CD (LOT 5).

## 3. Seuils de couverture (ADR-0014 §2 — repris tels quels)

| Package              | Lines | Branches | Functions | Statements |
| -------------------- | ----: | -------: | --------: | ---------: |
| `apps/backend`       |    60 |       45 |        55 |         60 |
| `apps/web`           |    45 |       35 |        40 |         45 |
| `packages/utils`     |    80 |       70 |        80 |         80 |
| `packages/ui`        |    55 |       45 |        55 |         55 |
| `packages/contracts` |    70 |       60 |        70 |         70 |

Règle : un seuil ne baisse pas sans note `docs/tech-debt.md`. Les rapports coverage ne sont pas commités (gitignore).

## 4. Décisions

- **Provider** : `@vitest/coverage-v8` (officiel, rapide, compatible SWC backend). Décision sensible (ajout dep) **validée**.
- **`packages/contracts`** : on ajoute `vitest.config.ts` + tests de schémas (discriminated unions inscriptions, refines, entités) pour atteindre 70%. Décision **validée** (vs exclusion).
- **`packages/ui`** : ajout d'un `vitest.config.ts` dédié (jsdom + react) — il a des tests mais aucune config propre.
- **E2E** : job CI **bloquant dès maintenant** (DoD LOT 2). Stack démarrée dans le job (PG service + migrate + seed + backend + web build/start + Playwright headless). Décision **validée**.
- **Coverage `include`/`exclude`** calibrés pour un dénominateur honnête (exclure `main.ts`, `*.module.ts`, DTOs déclaratifs, barrels, seed, types, configs).

## 5. Critères d'acceptation (Done LOT 2)

- `pnpm -r test:coverage` vert : chaque package ≥ ses seuils.
- Suites intégration vertes (flows ADR-0014 §3 couverts).
- E2E 4 rôles passe en local et en CI.
- `ci.yml` : jobs `coverage` (artefacts par package) + `e2e` (rapport HTML en artefact) présents et verts.
- `lint` + `typecheck` verts (tests inclus).

## 6. Risques

| Risque                         | Mitigation                                                                                      |
| ------------------------------ | ----------------------------------------------------------------------------------------------- |
| Coverage SWC backend imprécise | v8 + sourcemaps unplugin-swc ; excludes calibrés                                                |
| Seuils ADR trop hauts vs réel  | calibrer excludes ; si vraiment inatteignable → tech-debt documenté (pas de baisse silencieuse) |
| E2E flaky en CI (timing stack) | `wait-on` health backend + web avant Playwright ; `reuseExistingServer` désactivé en CI         |
| Temps CI allongé               | jobs parallèles (`coverage`/`e2e` indépendants de `build`)                                      |
