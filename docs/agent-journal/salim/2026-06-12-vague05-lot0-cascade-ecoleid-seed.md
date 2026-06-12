# Journal — V05 LOT 0.5 + 0.6 : cascade `ecoleId` + seed multi-école

**Date** : 2026-06-12 · **Branche** : `feat/salim` · **Vague** : 05 (LOT 0, fondations multi-tenance)

## 1. Directives reçues

« Réaliser tout le LOT 0 de la V05 ». Session reprise après une coupure (rate-limit)
en plein milieu du LOT 0.5 : les 3 fichiers auth (`ecoleId` dans le JWT/payload)
étaient écrits mais non committés, et `filieres.service.ts` à mi-chemin (seul l'import
`ForbiddenException` posé). LOT 0.1→0.4 déjà committés au run précédent (ADR-0019/0020,
schema v5 + migration, contracts v5).

## 2. Décisions techniques (autonomie)

- **Source de `ecoleId` selon le type de création** : créations dérivées d'une entité
  référencée (formation←filière, classe←formation→filière) prennent l'`ecoleId` **de
  l'entité** (plus correct, déjà fetchée) ; créations racines (filière, enseignant,
  année) et défaut « année courante » des listes prennent l'`ecoleId` **du
  `CurrentUser`** (JWT).
- **`resolveCurrentYear(annees, ecoleId)`** : signature changée (mandat ADR-0019 §2) →
  le typecheck force la migration de tous les appelants. `AnneeLike += ecoleId`. Filtre
  `etat === 'EN_COURS' && ecoleId === …`.
- **Helper `requireEcole(user)`** (`current-user.decorator.ts`) : dérive l'`ecoleId`
  non-null ou lève 403 (ADMIN/SUPER_ADMIN cross-école ne créent pas de référentiel
  scopé). Réutilisé par les contrôleurs filière/enseignant/année.
- **Garde « 1 EN_COURS »** scopée par école (`assertNoOtherEnCours(ecoleId, exceptId)`)
  pour matcher le nouvel index partiel par-école.
- **Listes scopées** : filières, formations, classes, enseignants, étudiants, maquettes,
  années ne renvoient que l'école de l'acteur (`ecoleId null` ⇒ liste vide).
- **Seed v5** : 2 écoles (A pilote `ecole_ism` = tout l'existant ; B « École de
  Management » minimale, disjointe, avec sa propre année EN_COURS). SUPER_ADMIN + ADMIN
  (`ecoleId null`), 1 Direction/école, `responsableRpId` GLRS/GL = Aminata, salle commune
  « Amphi mutualisé ». Comptes démo SUSPENDU + archivé placés en **école B** pour ne pas
  perturber les décomptes d'étudiants de A (assertions existantes).
- **`bootstrap-prod`** : find-or-create de l'école pilote `ecole_ism` puis rattachement
  des 4 comptes cœur + enseignant.

## 3. Décisions soumises à validation

Aucune décision sensible nouvelle (les ADR, le schema et les contracts — les vraies
portes sensibles — étaient déjà actés/committés aux LOTs 0.1→0.4). `@planit/utils` modifié
(non listé sensible) ; rebuild CJS effectué.

## 4. Modifications

**Backend (LOT 0.5)** — `packages/utils/src/academic/index.ts` (+ test) ;
`auth/{auth.service,strategies/jwt-access.strategy,decorators/current-user.decorator}.ts`
(payload `ecoleId` + `requireEcole`) ; `annees/{service,controller}`,
`filieres/{service,controller}`, `enseignants/{service,controller}`,
`formations/{service,controller}`, `classes/service`, `etudiants/service`,
`maquettes/{service,controller}`, `scripts/bootstrap-prod.ts`.

**Seed (LOT 0.6)** — `apps/backend/prisma/seed-data.ts` : écoles, comptes système,
directions, `ecoleId` partout, `responsableRpId`, salle commune, `seedEcoleB()`.

**Tests** — `packages/utils` : 3 cas `resolveCurrentYear` (scope par école + isolation).
Le seed v5 alimente les tests d'intégration existants (resetDb).

## 5. Phase CHECK — résultats

- `@planit/utils` build ✓ + **33 tests** ✓
- backend **typecheck ✓**, **lint ✓** (0 warning), **232/232 tests** ✓ (intégration incl.)
- `@planit/web` typecheck ✓ (contracts v5 rétro-compatibles)
- 2 échecs intermédiaires (étudiants/maquettes : fuite école B dans des listes non
  scopées) corrigés en scopant ces 2 endpoints → verts.

## 6. Surprises

- Coupure rate-limit en plein 0.5 → `filieres.service.ts` laissé à mi-chemin (import seul).
- `FiliereDto += responsableRpId` (requis, posé en 0.4) obligeait à mapper le champ dans
  `toDto` (sinon typecheck rouge).
- Les listes `etudiants` et `maquettes` n'étaient pas scopées → l'ajout du jeu école B les
  a fait fuiter (décompte). Corrigé (scope `ecoleId` / `filiere.ecoleId`).

## 7. Suite

- **Angles morts isolation laissés au LOT 2/4** (notés, non bloquants) : scope école sur
  `salles` (refonte V5-D6 LOT 4), `suivi-modules` (`findFirst EN_COURS` direct,
  `TD-V03-SUIVI-ANNEE`), et durcissements par-id (`etudiants.lookupByEmail`,
  `maquettes.findOne/versions`, assertion cross-école sur `formations.create`).
- Soft-locks `schema.prisma` + `contracts/` **libérés** (LOT 0 clos).
- LOT 0 complet → débloque LOT 1 (Admin) et LOT 2 (Direction backend).
- PR #95 (`feat/salim`) porte désormais maquette + LOT 0 complet.

## 8. Mises à jour annexes

- `vague-05-lots.md` : LOT 0.1→0.6 passés `[x]` (owners 0.5/0.6 = Salim).
- `docs/shared-resources-lock.md` : locks libérés.
- CLAUDE.md : pas de section « Patterns émergés V05 » (écrite à la **clôture** de vague,
  pas en LOT 0).
