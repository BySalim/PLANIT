# Journal — V04 LOT 3 : tests de performance k6

**Date** : 2026-06-07 · **Membre** : Salim (TL) · **Branche** : `feat/salim`

## 1. Directives reçues

« Le LOT 4 a été livré. Réalisons le LOT 3. » → implémenter toute la pyramide
perf k6 : setup + scripts endpoints chauds + seuils/profils + job CI perf-smoke

- baseline (tâches 3.1 → 3.4).

## 2. Décisions techniques (autonomes)

- **Backend perf en `NODE_ENV=test`** pour le smoke : relâche le throttle login
  (`5/min/IP` → `10000`, sinon un smoke en boucle prend des 429) **et** rend les
  cookies non-Secure (acceptés sur http). Aucun code backend modifié — on
  exploite les branches `NODE_ENV` existantes. La sécurité réelle reste à
  `5/min` + cookies `Secure` en prod.
- **Cible CI = backend direct `:3001`** (et non le proxy web `:3000`) pour
  isoler la latence API. La convention LOT 0.4 garde `BASE_URL` défaut `:3000`
  pour les runs full-stack locaux.
- **Auth via le cookie jar par-VU de k6** : `login` pose `access`, renvoyé
  automatiquement sur les requêtes suivantes — pas de header manuel.
- **`weekStart` = lundi UTC courant** calculé côté script : le seed date ses
  séances ainsi, donc le planning renvoie des données réelles sans hardcoder
  d'ID.
- **Inscription = entrée lecture** (`GET /etudiants/lookup`) et non l'écriture
  `POST /classes/:id/inscriptions` (mutation + 409 double-diplôme si rejoué).
- **k6 installé par download direct du binaire pinné** (v2.0.0) en CI — pas
  d'action tierce à SHA-pinner (cohérent avec la posture LOT 4).
- **Seuils par endpoint via sous-métriques taguées** (`http_req_duration{endpoint:planning}`)
  - compteur `server_errors` explicite pour « aucune 5xx ».
- **Job informationnel** (`continue-on-error` sur le run k6) en V04 ; passage
  bloquant prévu LOT 5.9 (retrait d'une ligne + ajout du check requis).

## 3. Décisions soumises à validation

Aucune décision sensible : pas de dépendance npm (k6 = binaire système), pas de
schéma Prisma, pas de `packages/contracts`, pas de suppression > 20 lignes.
Salim (TL) a pris le LOT 3 de bout en bout sur sa branche (réassignation
légitime, owners nominaux Djibril/Oumar).

## 4. Modifications

**Créés** :

- `docs/specs/VAGUE-04-03-perf-k6.md` (spec)
- `tests/perf/lib/{config,auth,flows}.js`
- `tests/perf/scenarios/{smoke,login,classes,planning-week,suivi-modules,inscription-lookup}.js`
- `tests/perf/results/.gitkeep`
- `docs/runbooks/perf-k6.md`
- ce journal

**Modifiés** :

- `tests/perf/README.md` (usage complet, env, seuils, CI)
- `.gitignore` (track `results/` vide, ignore son contenu)
- `justfile` (recettes `perf-smoke`, `perf-load`)
- `.github/workflows/ci.yml` (job `perf-smoke`)

**Supprimés** : `tests/perf/{lib,scenarios}/.gitkeep` (remplacés par de vrais
fichiers).

**Tests ajoutés** : les scripts k6 _sont_ les tests (perf). Pas de test
unitaire dessus (scripts d'orchestration k6, hors runtime Vitest).

## 5. Phase CHECK — résultats

- **Syntaxe ESM des 9 scripts k6** : `node --check` (mode module) → 9/9 OK.
- **YAML `ci.yml`** : parsé OK ; jobs = quality, build, lighthouse, e2e,
  **perf-smoke** (needs build, PR-only, 14 steps).
- **Asset k6** vérifié via `gh api` : `k6-v2.0.0-linux-amd64.tar.gz` existe.
- **Lint/typecheck/test monorepo** : non impactés (scripts JS racine hors
  package, docs, Justfile, ci.yml — aucun TS de package touché).
- **Run k6 réel** : non exécuté en local (k6 non installé + stack lourde). Le
  premier run réel a lieu en CI sur la PR — job calqué sur l'`e2e` déjà éprouvé
  (mêmes services PG, migrate, seed, build, start backend).

## 6. Surprises

- `ci.yml` était déjà **entièrement SHA-pinné** (passe LOT 4) alors que le
  contexte hérité montrait des tags `@v4` — le nouveau job réutilise les SHAs
  existants.
- `tests/perf/results/` était déjà gitignoré au LOT 0.4 ; ajusté en
  `results/*` + négation `.gitkeep` pour tracker le dossier vide.

## 7. Suite

- **Baseline numérique à back-fill** dans `docs/runbooks/perf-k6.md` §5 depuis
  l'artefact `perf-smoke-summary` du premier run CI vert (p95 par endpoint).
- PR `feat/salim → develop` (LOT 3) — mettre à jour `vague-04-lots.md`.
- LOT 5.9 : rendre `perf-smoke` bloquant (branch protection).
- Pas de soft-lock posé (aucune ressource partagée touchée).

## 8. Mises à jour annexes

- `vague-04-lots.md` (stratégie) : LOT 3 (3.1 → 3.4) `[x]`.
- CLAUDE.md : pattern perf k6 à capitaliser en clôture de vague (LOT 7.4), pas
  maintenant.
