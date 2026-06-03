# Vague 03 — LOT 1 + LOT 2 : Backend référentiel académique

**Date** : 2026-06-03
**Branche** : `feat/salim` (base `develop` @ post-#49)
**Vague** : 03 — Référentiel académique + acteur AC + exports
**LOTs livrés** : 1 (A.1→A.8) et 2 (B.1→B.9) — backend pur

## 1. Directives reçues

Réaliser **tout le LOT 1 et 2** de la Vague 03. Contraintes du TL : ne pas
casser le code actuel, méthodes propres/maintenables/communautaires, autorisé à
reformer le code existant **tant que la logique utilisateur ne change pas**,
commits réguliers, **push + PR à la fin de chaque lot**.

## 2. Décisions techniques (autonomie)

- **Zéro décision sensible** : LOT 1+2 consomment intégralement les fondations
  LOT 0 (schema v3, contracts `academic`, utils VHE/VHT). Aucune modif de
  `schema.prisma`, `packages/contracts/`, ni de dépendance npm.
- **Pattern services Prisma-direct** maintenu (pas de repository — cf. dette
  `REPOSITORY-PATTERN`). Mappers `toDto` purs en bas de fichier.
- **Rétro-compatibilité référentiels** : `GET /api/classes` et `/api/salles`
  restent **tous rôles** ; les réponses passent à `ClasseV3Dto`/`SalleDto`,
  **sur-ensembles** de `ClasseRef`/`SalleRef`. La validation Zod côté front est
  non-stricte (strip des champs en trop) → le séance-picker V02 marche sans
  toucher au frontend. Tests référentiels existants conservés tels quels.
- **Année courante** : `AnneesService.getCurrentEntityOrThrow()` (findFirst
  indexé `etat=EN_COURS`) pour le chemin chaud des créations ; `findCurrentEntity`
  délègue la sélection au helper pur partagé `resolveCurrentYear` pour `/current`
  et les filtres défaut.
- **Cohérence version↔année** (décision notable, à confirmer TL) : une formation
  de l'année courante doit référencer une version de maquette **de la même
  année** (400 sinon) ; idem pour une classe (formation de l'année courante).
  Aligné sur le flux « Renouveler » et l'immutabilité inter-versions.
- **Scope AC centralisé** : `AcScopeService` unique (classes assignées + salles
  du RP manager + assertions), réutilisé par classes/étudiants/salles/suivi.
  Filtrage **serveur** systématique, jamais un masquage UI.
- **Suivi 100 % dérivé** : `heuresFaites`/progression/enseignants calculés depuis
  les séances COURS via **une** requête + agrégation mémoire. Lignes
  `SuiviModule` **alignées paresseusement** sur les modules de la version (création
  des manquantes au `list`) → le suivi reste cohérent après un « Composer ».
- **Sync FK legacy `User.classeId`** sur (dés)inscription non-DD → la vue
  planning étudiant V02 reste cohérente (transition, `TD-V03-CLASSEID`).
- **Règle double-diplôme** : catégorie dénormalisée (helper
  `isDoubleDiplomeInscription`) + pré-contrôle applicatif 409 lisible doublant le
  `@@unique` base.
- **Réutilisation `toSessionV2Dto`** (mapper séance V02, fonction pure) pour
  `GET /suivi-modules/:id/seances` — pas de dépendance de module sur SeanceV2.
- **RBAC** : maquettes/formations RP only (AC 403, V3-D9) ; classes/salles
  lecture tous rôles (AC scopé) ; étudiants/inscriptions/suivi RP+AC ;
  terminer/rouvrir RP only (override `@Roles` au niveau route).

## 3. Décisions soumises à validation (TL)

- **Périmètre « tout LOT 1 + 2 » sur `feat/salim`** : demande explicite du TL.
- **Cohérence version↔année courante** (formation + classe → 400) : déduction de
  cohérence non littéralement spécifiée — à confirmer (sinon assouplir).
- Aucune autre : ni schema, ni contracts, ni deps touchés.

## 4. Modifications

### Créés — LOT 1

- `apps/backend/src/annees/` (service, controller, module) — A.1.
- `apps/backend/src/maquettes/` (service + 3 controllers + module) — A.2→A.5.
- `apps/backend/src/formations/` (service, controller, module) — A.6.
- `apps/backend/test/{annees,maquettes,formations}.spec.ts` — 31 tests.

### Créés — LOT 2

- `apps/backend/src/ac/` (ac-scope.service, controller, module) — B.7.
- `apps/backend/src/etudiants/` (service, controller, module) — B.2.
- `apps/backend/src/inscriptions/` (service, controller, module) — B.3/B.4.
- `apps/backend/src/suivi-modules/` (service, controller, module) — B.5/B.6.
- `apps/backend/test/{etudiants,inscriptions,suivi-modules,ac}.spec.ts` — 44 tests
  (avec extensions `classes.spec.ts` + `salles.spec.ts`).

### Modifiés

- `apps/backend/src/classes/` (service+controller+module) — refonte B.1.
- `apps/backend/src/salles/` (service+controller+module) — B.7.
- `apps/backend/src/app.module.ts` — wiring 7 nouveaux modules.
- `apps/backend/test/helpers/auth.ts` — rôle `ASSISTANT_PROGRAMME` + `loginByEmail` + `RP2_EMAIL`.
- `docs/tech-debt.md` — note `TD-V03-SUIVI-LAZY`.

## 5. Phase CHECK — résultats

- `pnpm typecheck` ✅ · `pnpm lint` ✅ (0 warning) · `pnpm test` ✅ **209 tests**
  (134 V02 + 31 LOT 1 + 44 LOT 2), **20 fichiers**, **0 régression**.
- Référentiels `/api/classes` et `/api/salles` : tests rétro-compat existants
  toujours verts (forme `{id,code,name}`/`{id,name}`, accès tous rôles).
- Dérivation suivi vérifiée : ALGO GL3-A = 4 h faites (2 séances COURS × 2 h,
  examen EVALUATION exclu), VHE 36, enseignant Oumar Ndiaye.

## 6. Surprises / blocages

- **commitlint header-max-length 72** : 2 sujets reformulés (husky lint-staged
  lance prettier + commitlint à chaque commit ; prettier reformate les fichiers
  stagés automatiquement).
- **PR #49 mergée par le TL** pendant le LOT 2 → la PR #50 sort proprement comme
  diff LOT 2 uniquement (per-lot PR respecté sur `feat/salim`).
- Aucun blocage technique : fondations LOT 0 complètes, contrats suffisants.

## 7. Suite

- **PR #49** (LOT 1) **mergée**. **PR #50** (LOT 2) ouverte → `develop`.
- Débloque : LOT 3 (page Maquettes), LOT 4 (Formations+Classes+inscription),
  LOT 5 (Étudiants+Suivi), LOT 6 (AC role-aware) — tous les endpoints backend
  consommés par ces pages sont en place.
- Aucun soft-lock posé (aucune ressource partagée modifiée).

## 8. Mises à jour annexes

- **Tech-debt** : `TD-V03-SUIVI-LAZY` (matérialisation des `SuiviModule` au `GET`
  list — effet de bord idempotent ; à revisiter avec `TD-V03-SUIVI-PERF`).
- **Vague** : `vague-03-lots.md` — A.1→A.8 et B.1→B.9 passés `[x]`.
- **CLAUDE.md** : patterns V03 (scope-aware AC, sur-ensemble référentiel
  rétro-compatible, suivi dérivé) à capitaliser en clôture de vague (LOT 8 V.3).
