# Journal — Scope planning par école + vue Direction (correctifs LOT 2/3)

> **Membre** : Salim (`feat/salim`) · **Date** : 2026-06-13 · **Cadre** : audit LOT 2 (backend Direction) + LOT 3 (frontend Direction, PR #99). Correctifs hors LOT 4 : fuite d'isolation du planning V2 (sécurité, RP + Direction), détail maquette inaccessible/non scopé pour la Direction, et vue planning Direction manquante.

## 1. Directives reçues

(1) Scoper le planning V2 par école : `GET /v2/sessions` sans `classeId` renvoyait les séances de **toutes** les écoles (un RP de A lisait le planning de B). (2) Rendre le **détail maquette** accessible à la Direction et scopé école. (3) Livrer une **vue planning Direction read-only** (NAV « Planning » → `/`) + un **dashboard** sur `/tableau-de-bord`. Hors-périmètre explicite : LOT 4 (suivi Direction, overlay enseignant, colonne Responsable, salle commune), UE & Modules Direction, scope planning V1.

## 2. Décisions techniques (autonomes)

- **Filtre école = jointure `SeanceClasse`** : helper `ecoleClasseFilter(ecoleId)` réutilisé par `buildWeekWhere` (liste/stats) et `findOne` (détail). Une classe est rattachée via `formation.filiere.ecoleId` **OU** `filiere.ecoleId` (FK legacy V01) → `OR`. Composé en AND avec `classeId`/`studentId` sur la même jointure.
- **ADMIN (`ecoleId` null)** : planning vide (findWeek `[]`, stats à zéro) — aligné sur `classes.service`. `findOne(id, ecoleId?)` : `ecoleId` optionnel ; **omis** par les appels internes (post-create/update, déjà autorisés), **fourni** par le contrôleur pour durcir le scope (404 si hors périmètre, pattern LOT 9). `findUnique` → `findFirst` pour porter le filtre.
- **Maquette** : `getVersion`/`exportVersion` prennent `ecoleId` ; helper `assertVersionInEcole` (404, pas 403 — ne pas divulguer l'existence). `@Roles` méthode (`+DIRECTION`) override le `@Roles` classe RP-only (vérifié : `RolesGuard` = `getAllAndOverride([handler, class])`).
- **Frontend** : `readOnly = isAc || isDirection` dans `RpPlanningView` (réutilise le mode read-only AC déjà éprouvé) ; `/` route DIRECTION → `RpPlanningView` ; dashboard déplacé sur `/tableau-de-bord` (page role-aware). `DirectionHomeView` perd son padding propre (rendu désormais dans le `<main>` margé d'un `Shell`). Sidebar inchangée (best-match href gère `/` vs `/tableau-de-bord`).

## 3. Décisions soumises à validation (TL = moi)

- Aucune décision sensible : pas de dep, pas de `schema.prisma`, pas de `packages/contracts/`. Tech-debt `TD-V05-PLANNING-V1-SCOPE` tracée (V01 `/sessions` non scopé — pas de fuite via consommateurs actuels qui filtrent par acteur ; cible V06).

## 4. Modifications

**Backend** : [seance-v2.service.ts](../../../apps/backend/src/seance-v2/seance-v2.service.ts) (`findWeek`/`stats`/`findOne`/`buildWeekWhere` + `ecoleClasseFilter`), [seance-v2.controller.ts](../../../apps/backend/src/seance-v2/seance-v2.controller.ts) (`@CurrentUser` sur les 3 lectures), [maquettes.service.ts](../../../apps/backend/src/maquettes/maquettes.service.ts) (`getVersion`/`exportVersion` + `assertVersionInEcole`), [maquette-versions.controller.ts](../../../apps/backend/src/maquettes/maquette-versions.controller.ts) (`+DIRECTION` + `@CurrentUser`), [etudiants.controller.ts](../../../apps/backend/src/etudiants/etudiants.controller.ts) (`+DIRECTION` — fait en amont de session).
**Frontend** : [rp-planning-view.tsx](../../../apps/web/src/components/rp/rp-planning-view.tsx), [page.tsx](<../../../apps/web/src/app/(planit)/page.tsx>), [tableau-de-bord/page.tsx](<../../../apps/web/src/app/(planit)/(gestion)/tableau-de-bord/page.tsx>), [direction-home-view.tsx](../../../apps/web/src/components/direction/direction-home-view.tsx).
**Tests** : [direction.spec.ts](../../../apps/backend/test/direction.spec.ts) — +3 suites (planning isolation A/B + RP A non-régression + détail 404, détail maquette Direction/scope, étudiants isolation) ; helper `createEcoleBSeance` (le seed n'a aucune séance école B).
**Docs** : [tech-debt.md](../../tech-debt.md) (TD-V05-PLANNING-V1-SCOPE).

## 5. Phase CHECK — résultats

- **typecheck** (backend + web) ✓ · **lint** (backend + web) ✓.
- **Tests** : `vitest run direction.spec admin.spec seance-v2.spec maquettes.spec` → **82/82 verts** (isolation planning + maquette + non-régression RP/maquette/seance-v2 intacte).
- **Smoke navigateur** (stack dev réelle, login `direction.ingenieurs@planit.test`) : `/` = planning **read-only** école A (10 séances, NAV_DIRECTION, aucune commande d'édition : pas de « + »/undo/redo/publier) ; `/tableau-de-bord` = KPIs (Personnel 3 · 2025-2026 · Salles 5) ; `GET /api/maquette-versions/<école A>` → 200, `<école B>` → 404 ; `GET /api/etudiants` → 200 (6) ; **zéro erreur console**.

## 6. Surprises

- `DirectionHomeView` était rendu **sans `Shell`** à `/` (pas de sidebar) — angle mort de la PR #99. Corrigé en le déplaçant dans un `Shell` sur `/tableau-de-bord`.
- Le seed ne place **aucune séance pour l'école B** → le test d'isolation crée la séance école B à la volée (module placeholder école A : le scope se calcule via la classe, pas le module).

## 7. Suite

- Reste à committer (backend+tests, puis frontend). Aucun soft-lock posé (pas de ressource partagée touchée).
- LOT 4 (suivi Direction, overlay enseignant, colonne Responsable, salle commune) toujours hors périmètre.

## 8. Mises à jour annexes

- `tech-debt.md` : +TD-V05-PLANNING-V1-SCOPE. Aucun changement CLAUDE.md/ADR/schema.
