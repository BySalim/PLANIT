# Vague 03 — LOT 0 : Fondations académiques

**Date** : 2026-06-02
**Branche** : `feat/salim` (base `develop` @ post-v0.2.0)
**Vague** : 03 — Référentiel académique + acteur AC + exports
**LOTs livrés** : 0.1 → 0.8 (la totalité du LOT 0)

## 1. Directives reçues

Réaliser **tout le LOT 0** de la Vague 03 (décision explicite du TL : « c'est
moi qui décide, on fait tout le LOT 0 », dérogation à la répartition nominale
0.6/0.7 Oumar et 0.8 Djibril). Contraintes : ne rien casser, privilégier des
méthodes performantes/sécurisées/maintenables, finir par commits + push + PR.

## 2. Décisions techniques (autonomie)

- **Migration 100 % additive** (pattern V02) : tout nouveau champ est
  `nullable`/`@default`, aucun DROP, aucune transformation data → le seed V02 et
  le service V01/V02 passent inchangés. `User.classeId` et `Classe.filiereId`
  conservés en transition (`TD-V03-CLASSEID`).
- **Invariant « 1 seule année EN_COURS » garanti en base** via un **index unique
  partiel Postgres** (`WHERE etat = 'EN_COURS'`), injecté en SQL brut dans la
  migration (Prisma ne sait pas l'exprimer — précédent ADR-0008).
- **Règle double-diplôme infalsifiable** : `isDoubleDiplome` dénormalisé sur
  `Inscription` + `@@unique([etudiantId, anneeAcademiqueId, isDoubleDiplome])`.
  Garantie base, pas seulement applicative.
- **Heures dérivées jamais stockées** (VHE/VHT, heuresFaites) : seuls CM/TD/TP/TPE
  et `estTermine` persistés. `SuiviModule` = état minimal.
- **Utils purs** (`@planit/utils/academic`) sans dépendance Prisma :
  `resolveCurrentYear` modélisé comme fonction pure sur une liste (le backend
  wrappe le fetch) → testable isolément, partagé back+front.
- **Contracts** : `MaquetteVersionDto` en mode lite/full (pattern UE V02),
  `InscriptionRequestDto` en union discriminée `existant`/`nouveau` (pattern
  `createSessionV2Schema`).
- **`resetDb` étendu** : ordre de purge réordonné pour les FK `Restrict` v3
  (sinon tous les tests d'intégration cassaient en `beforeEach`).
- **Spike export** : `html-to-image` + `jspdf`, smoke test (jsPDF génère un PDF
  headless `%PDF-`, API html-to-image confirmée) → **GO**.

## 3. Décisions soumises à validation (TL)

- **Périmètre « tout le LOT 0 »** sur `feat/salim` : validé explicitement par le
  TL (dérogation à la répartition nominale).
- **Décision sensible — `schema.prisma`** (8 tables + refonte) : couverte par la
  validation du LOT 0.4 (dérogation tech-lead notée dans `vague-03-lots.md`).
- **Décision sensible — `packages/contracts/`** (nouveau module `academic/`) :
  couverte par 0.5 (dérogation).
- **Décision sensible — ajout de 2 deps npm** (`html-to-image`, `jspdf`) : actée
  par le TL au LOT 0.8 (V3-D11).

## 4. Modifications

### Créés

- ADR : `0010-modele-academique-versionne.md`, `0011-inscriptions-double-diplome.md`,
  `0012-suivi-des-modules.md`.
- Migration `apps/backend/prisma/migrations/20260602150758_vague_03_referentiel_academique/`.
- `packages/contracts/src/academic/index.ts` (DTOs v3).
- `packages/utils/src/academic/index.ts` + `__tests__/index.spec.ts` (8 tests).
- `apps/web/src/lib/__tests__/export-spike.test.ts` (3 tests).
- `docs/runbooks/export-spike.md`.

### Modifiés

- `apps/backend/prisma/schema.prisma` (enums Niveau/AnneeEtat ; tables
  AnneeAcademique, Maquette, MaquetteVersion, MaquetteModule, Formation,
  Inscription, SuiviModule, AssistantClasse ; refonte Classe/Salle/User).
- `apps/backend/prisma/seed-data.ts` + `seed.ts` (bloc V03 idempotent).
- `packages/contracts/src/index.ts` + `package.json` (wiring + subpath `./academic`).
- `packages/utils/src/index.ts` + `package.json` (wiring + subpath `./academic`).
- `apps/web/package.json` + `pnpm-lock.yaml` (2 deps export).
- `apps/backend/test/helpers/db.ts` (ordre de purge v3).
- `apps/backend/test/filieres.spec.ts` (fixture DELETE robuste).
- `docs/tech-debt.md` (`TD-V03-CLASSEID`, `TD-V03-SUIVI-PERF`).

## 5. Phase CHECK — résultats

- `typecheck` ✅ (9 projets) · `lint` ✅ (0 warning) · `test` ✅ (backend **134**,
  web **45** dont spike, utils **24**) · `build` ✅ (backend nest + web Next.js +
  packages).
- **Migration v3** appliquée proprement (`migrate dev`) sur une base déjà en V02
  → additive confirmée. **Seed v3** : idempotent (2 runs), invariants vérifiés en
  base — **1 seule** année EN_COURS, règle DD **bloquante** (P2002), 4 maquettes /
  6 versions / 21 modules de maquette / 4 formations / 5 inscriptions / 10 suivis.
- Contracts v3 importables (smoke `require('dist')` : 12 schémas + union DD OK).

## 6. Surprises / blocages

- **`prisma migrate reset` bloqué** pour agent IA (garde-fou Prisma — action
  destructive). Contourné sans destruction : la migration était déjà appliquée
  (`migrate dev`), validation du seed via `db seed` (idempotent) + script de
  vérification d'invariants. **Le `pnpm db:reset` (Done LOT 0) reste à lancer par
  un humain** pour la preuve « migration depuis zéro » — fonctionnellement
  équivalent (même migration + même seed, tous deux verts).
- **Test `filieres` cassé** par le seed : la filière GL n'est plus « vide » en
  V03 (porte une formation MASTER double-diplôme). Corrigé en créant une filière
  jetable dans le test (fidèle à l'intention : filière sans dépendance → 204).
- **`resetDb`** : les FK `Restrict` v3 imposaient de purger 8 tables avant leurs
  parents — sans ça, tous les tests d'intégration tombaient.
- **commitlint** : sujet en minuscule obligatoire (reformulé 2×).

## 7. Suite

- Commit (8 jalons) + push + **PR `feat/salim → develop`**.
- **Humain** : lancer `pnpm db:reset` pour cocher formellement le Done LOT 0
  (migration from scratch + seed).
- Débloque LOT 1 (backend années/maquettes/formations) et LOT 2 (classes/
  étudiants/inscriptions/suivi/scope AC) — contracts + schema + utils + seed prêts.
- Aucun soft-lock posé (travail mono-session sur ressources partagées, libéré
  immédiatement).

## 8. Mises à jour annexes

- **ADR** : 0010, 0011, 0012 (statut ACCEPTÉ).
- **Tech-debt** : `TD-V03-CLASSEID` (drop `User.classeId`), `TD-V03-SUIVI-PERF`
  (vue matérialisée en réserve).
- **Runbook** : `docs/runbooks/export-spike.md` (décision GO + couverture CI).
- **CLAUDE.md** : patterns émergés V03 (versionnement maquette, scope-aware,
  union discriminée inscription, exports client-side) à capitaliser en clôture
  de vague (LOT 8 V.3) — pas modifié ici.
