# Journal — Maquette pilotée par la formation + double-diplôme filière (ADR-0018)

> **Membre** : Salim (`feat/salim`) · **Date** : 2026-06-12 · **Cadre** : refonte logique maquette/formation déclenchée par le blocage d'onboarding prod réel (suivi go-live, première `MaquetteVersion` impossible).

## 1. Directives reçues

À l'interface Maquette, refondre la logique : (1) plus de création directe de maquette ; (2) la création d'une **formation** (filière puis niveau, code auto, anti-doublon année courante) crée/renouvelle **automatiquement** sa maquette `(filière, niveau)` ; (3) les **semestres** sont dérivés du niveau ; (4) **implémenter l'ajout/retrait de modules** en composition (module à 0 h, UE déduite et présentée en titre) ; (5) **libellé maquette auto** `Maquette {niveau} {sigle}` ; (6) renouvellement = clone de l'année précédente (années indépendantes) ; (7) retirer le **double-diplôme de la formation** — c'est une propriété de la **filière**, dérivée pour classes/inscriptions.

## 2. Décisions techniques (autonomes)

- `MaquettesService.ensureMaquetteAndVersion(tx, …)` — point d'entrée unique appelé dans la transaction de `FormationsService.create` (find-or-create maquette → version année courante : réutilise / clone / vide). Réutilise la logique de clone de l'ex-`renew`.
- Helpers purs `@planit/utils` (mêmes formules backend + aperçu front) : `formationCode`, `maquetteNom`, `semestreAbsolu`/`semestreLabel`.
- Endpoints `POST/PUT /maquettes` + `POST /maquettes/:id/renew` **retirés** ; `/maquettes` = lecture + composition. Formation = create only (édition retirée, tout dérivé).
- Sélecteur de module frontend (`module-picker-modal.tsx`) réutilise `GET /ues?withModules=true`, groupé par UE, exclut les modules déjà présents.
- Migration générée **offline** (`prisma migrate diff` → SQL) puis appliquée via `migrate deploy` : `migrate dev` est interactif (refuse le drop de colonne en non-interactif).

## 3. Décisions soumises à validation (TL, dans le chat)

- **Sensibles** : `schema.prisma` (drop colonne + 2 uniques), `packages/contracts/` (formation/maquette schemas), **décision d'archi → ADR-0018** (révise ADR-0010/0011). Validées par le cadrage de la demande + 2 arbitrages : **format code** = `GLRS-L3-2025-2026` ; **page Maquettes** = tout retrait (create/renew/rename), 100 % piloté par la formation.

## 4. Modifications

**Schéma/migration** : `schema.prisma` (Formation drop `isDoubleDiplome` + `@@unique([filiereId,niveau,anneeAcademiqueId])` ; Maquette `@@unique([filiereId,niveau])`) · migration `20260612080000_formation_maquette_autoflow`.
**Packages** : `@planit/utils` (4 helpers + `isDoubleDiplomeInscription` lit la filière) · `@planit/contracts` (formationSchema/createFormationSchema réduits, maquette create/update retirés).
**Backend** : `maquettes.service` (ensureMaquetteAndVersion, retrait create/update/renew) · `maquettes.controller` (lecture seule) · `formations.service` (auto-flow) · `formations.controller`/`module` (DI MaquettesModule) · `inscriptions.service` + `classes.service` (DD depuis filière).
**Frontend** : `formation-modal` (filière+niveau+aperçu code) · `formations/page` (retrait edit + badge DD) · `maquettes-page`/`maquette-list` (retrait create) · `maquette-panel` (retrait renew/rename, add-module + niveau→SemestresView) · **`module-picker-modal` (créé)** · `semestres-view` (libellés niveau) · `annees-widget` (retrait renew) · `maquette-infos-modal` (lecture seule) · `mutations-v3` (retrait mutations maquette/formation update).
**Seed** : noms dérivés + retrait `isDoubleDiplome` formations.
**Tests** : `utils` (+4 helpers), `formations.spec` (auto-code/clone/409 doublon), `maquettes.spec` (retrait CRUD/renew), `semestres-view.test` (labels).
**Docs** : ADR-0018, CLAUDE.md (patterns), shared-resources-lock.

## 5. Phase CHECK — résultats

- **utils 32 ✓**, **contracts 22 ✓**, web composants ✓ (en isolation ; pool `--threads --singleThread` à cause du blocage de spawn forks sous le sandbox).
- **Backend intégration : formations + maquettes + inscriptions + classes = 39 ✓** contre la DB migrée + seedée.
- **typecheck back + web verts**, **lint back + web verts**.
- **Vérification navigateur (RP réel)** : modal formation = filière+niveau, aperçu **`GLRS-L3-2025-2026`** + maquette **`Maquette L3 GLRS`**, sans champs code/maquette/version/DD ; page formations sans edit ni badge DD ; page Maquettes sans bouton créer ; panneau « Maquette L3 GLRS » avec semestres **S5/S6** ; composition → picker (groupé UE, **seul SEC** proposé, les 5 présents exclus) → ajout SEC à 0 h → **moduleCount 5→6** vérifié via API (puis retiré pour laisser le seed propre).

## 6. Surprises

- `prisma generate` a échoué en **EPERM** (DLL du query-engine verrouillée par un process node) → la 1ʳᵉ exécution des specs inscriptions/classes a planté sur « column isDoubleDiplome does not exist » (**client runtime périmé**). Résolu en relançant `generate` une fois le verrou levé → 39/39.
- `migrate dev` interactif (drop de colonne avec données) → contournement `migrate diff` + `migrate deploy`.
- Vitest forks injouables sous le sandbox (`spawn UNKNOWN`) → `--pool=threads --poolOptions.threads.singleThread` (l'isolation cross-fichiers casse en singleThread → vérifier les fichiers en isolation, vert en CI).

## 7. Suite

- **Rien commité / pas de PR** (en attente go du TL). Soft-locks `schema.prisma` + `contracts` **libérés**.
- Serveurs dev web (:3000) + backend (:3001) laissés tournants pour inspection.
- Prochaine étape : commit + (à terme) PR `feat/salim → develop`.

## 8. Mises à jour annexes

- **ADR-0018** créé (révise ADR-0010 cycle maquette + ADR-0011 source double-diplôme).
- **CLAUDE.md** : section « Maquette pilotée par la formation + double-diplôme filière (ADR-0018) ».
- **Migration** `20260612080000_formation_maquette_autoflow` ajoutée.
