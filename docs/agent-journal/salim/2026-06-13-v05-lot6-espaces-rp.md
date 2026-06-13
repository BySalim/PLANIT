# Journal — V05 LOT 6 : espaces de travail RP isolés + corrections Direction

> **Membre** : Salim (`feat/salim`) · **Date** : 2026-06-13 · **Cadre** : nouveau LOT V05 (décision TL) avant clôture de la vague. ADR-0022.

## 1. Directives reçues

(1) Direction : pages **Filières/Formations** ne listent rien + bouton « + » visible alors qu'il doit être RP-only ; la Direction doit voir les filières/formations créées par ses RP (lecture). (2) **Suivi des modules** Direction → redirige vers la vue Étudiant/Enseignant et plante : enlever le changement d'interface + gérer l'erreur ; la Direction voit l'avancement des modules des RP. (3) **Espaces de travail RP isolés** : tout ce qu'un RP crée (filière, module, maquette, classe, séance) n'est visible que de lui + Direction + AC (si assigné à la classe). (4) **AC** : la Direction assigne les AC aux classes depuis la liste Classes ; l'AC ne voit que les infos de ses classes (suivi, classes) ; supprimer la colonne « Année » dans la liste Classes ; l'AC peut retirer un étudiant d'une classe. (5) **Planning** : isolation RP (un RP ne voit que ses séances) ; rendre fonctionnel le sélecteur de **référentiel** figé (« M1 IA ») → choisir Classe / Enseignant / Salle. (6) **Salles** : seule la Direction crée/assigne ; en vue Salle du planning, un RP voit l'occupation des salles non possédées/communes mais les séances des autres sont **assombries** (créneau + RP visible, détails masqués) ; ses propres séances visibles. (7) **Salles subjectives** : un RP crée des salles privées (hypothétiques) visibles de lui seul, mais dont le nom apparaît au niveau d'une séance pour les autres. (8) Réfléchir aux logiques non couvertes et proposer.

## 2. Décisions techniques (autonomes)

- **Migration additive** (colonnes `ownerRpId` nullable, `UE.ecoleId`, `Salle.isSubjective`, unicités scopées) générée via `prisma migrate diff` (l'env non-interactif bloque `migrate dev`) puis appliquée par `migrate deploy`. Backfill de propriété au **reseed** (pas dans la migration) — risque minimal, dev rejouable. Prod hors scope (V05 pas encore sur `main`).
- **Helper pur `common/rp-scope.ts`** (`isRp`/`rpOwnerWhere`) plutôt qu'un service injectable : le filtrage owner est stateless (pas d'accès BD), contrairement à `AcScopeService`. Composé en AND avec le scope école/AC dans chaque service.
- **Masquage planning côté serveur** : variante `toMaskedSessionV2Dto` qui neutralise module/classes/enseignant/libellé/description ; les détails ne quittent jamais le backend (test d'assertion négative). Référentiel Salle = **seule exception** à l'isolation (occupation école visible).
- **Scope AC ajouté au planning V2** (`seance-v2` injecte `AcScopeService`) : un AC ne voit plus que ses classes assignées (angle mort pré-existant corrigé au passage).
- **AC PUT classes** renvoie 200 `{classeIds}` (pas 204) : le helper `request()` front fait toujours `.json()`. `EtudiantDto.inscriptionId` ajouté au roster pour permettre le retrait.
- Sélecteur référentiel = `ViewModeTabs` (Mon espace/Classe/Salle/Enseignant) + `ReferentielValuePicker` contextuel, **affiché pour le RP** (les hooks d'options sont `isRp`-gated ; Direction/AC gardent leur vue scopée par défaut).

## 3. Décisions soumises à validation (TL = moi)

- **4 arbitrages structurants** tranchés avant le code (AskUserQuestion) : (a) UE/Modules **par RP** (espace perso strict) ; (b) ownership = **nouveau `ownerRpId` immuable** distinct de `responsableRpId` ; (c) Étudiants = **scope école strict maintenu** (feature « tout l'ISM » abandonnée — contradiction initiale levée) ; (d) salles subjectives **privées au créateur**, Direction ne les liste pas.
- Décisions sensibles : `schema.prisma` (migration lourde) + `packages/contracts/` → **ADR-0022** + soft-locks posés/levés. Aucune dépendance npm ajoutée.

## 4. Modifications

**Schéma/migration/seed** : [schema.prisma](../../../apps/backend/prisma/schema.prisma) (ownerRpId sur Filiere/UE/Module/Maquette/Classe/Seance, UE.ecoleId, Salle.isSubjective+ownerRpId, unicités code/sigle scopées) ; migration `20260613173405_v05_lot6_ownership_isolation` ; [seed-data.ts](../../../apps/backend/prisma/seed-data.ts) (`backfillOwnership` + salle subjective de démo).
**Backend** : nouveau [common/rp-scope.ts](../../../apps/backend/src/common/rp-scope.ts) ; scope owner sur `filieres`, `formations`, `academic/ue`+`modules`, `maquettes`, `classes`, `seance-v2` (+ masquage + référentiel Salle + scope AC), `suivi-modules` (+ accès Direction), `inscriptions` (owner RP) ; `ac` (routes Direction set/list classes + `AcScopeService`).
**Contracts** : `SalleDto.isSubjective` + `createSalleSchema.isSubjective` ; `SessionV2Dto.{ownerRpId,ownerRpName,masked}` + `classes` sans min ; `setAcClassesSchema` ; `EtudiantDto.inscriptionId?`.
**Frontend** : fix [suivi-modules/page.tsx](<../../../apps/web/src/app/(planit)/suivi-modules/page.tsx>) (Direction→vue gestion) ; [filieres](<../../../apps/web/src/app/(planit)/(gestion)/(rp-only)/filieres/page.tsx>)/[formations](<../../../apps/web/src/app/(planit)/(gestion)/(rp-only)/formations/page.tsx>) lecture seule Direction ; [classes/page.tsx](<../../../apps/web/src/app/(planit)/(gestion)/classes/page.tsx>) (colonne Année retirée + modale assign AC) ; [classes/[id]/page.tsx](<../../../apps/web/src/app/(planit)/(gestion)/classes/[id]/page.tsx>) (retrait étudiant) ; nouvelle [assign-ac-modal.tsx](../../../apps/web/src/components/direction/assign-ac-modal.tsx) ; planning [referentiel-value-picker.tsx](../../../apps/web/src/components/planning/referentiel-value-picker.tsx) + `view-mode-tabs` + `planning-toolbar` + `rp-planning-view` + `session-card` (carte masquée) ; [salles/page.tsx](<../../../apps/web/src/app/(planit)/(gestion)/salles/page.tsx>) (salle subjective) ; hooks `queries-v2`/`direction-queries`/`direction-mutations`/`mutations-v3`.
**Tests** : [lot6-isolation.spec.ts](../../../apps/backend/test/lot6-isolation.spec.ts) (14) ; fixtures `planning-grid.test`/`session-card.test` mises à jour.
**Docs** : [ADR-0022](../../architecture/adr/0022-espaces-travail-rp-isoles.md), tech-debt (TD-V05-LOT6-\*), CLAUDE.md.

## 5. Phase CHECK — résultats

- **Backend** : `typecheck` ✓ · `lint` ✓ · `vitest run` → **302/302** (288 existants + 14 isolation). Aucune régression.
- **Web** : `typecheck` ✓ · `lint` ✓ · `vitest run` → **95/95**.
- **Smoke HTTP (backend live + DB dev rejouée)** : Direction `/suivi-modules` **200 (18)** (bug 403/crash levé), `/filieres` 200 (2), `/formations` 200 (3), `/salles` 200 (0 subjective). Isolation RP : RP1 = 2 filières/4 classes, **RP2 = 0/0**. Salles : RP1 = 6 (1 subjective), Direction = 5. Planning référentiel Salle : RP2 sur amphi → 4 séances **toutes masquées, détails nuls**.

## 6. Surprises

- **3 angles morts pré-existants** corrigés en passant : scope AC absent du planning V2 ; scope RP du suivi sans filtre école (fuite cross-école potentielle) ; `GET /suivi-modules` n'autorisait pas `DIRECTION` au backend (cause racine du crash, en plus du routing front).
- `prisma generate` bloqué par EPERM Windows : le backend dev (watch) tenait la DLL du query engine ; il a fallu stopper le sous-arbre `nest start --watch` (puis le redémarrer en fin de session).
- `migrate dev` non-interactif inutilisable (warnings unicité) → contournement `migrate diff` + `migrate deploy`.

## 7. Suite

- **Reste pour clôturer V05** : LOT 5 (5.1 smoke e2e multi-école, 5.2 CI verte, 5.3 bug bash, 5.4 MAJ CLAUDE.md patterns V05 — partiellement fait ici, 5.5 tag `v0.5.0`).
- PR `feat/salim → develop` à ouvrir (3 commits LOT 6 : `b147640` backend, `78caba7` frontend, + ce commit docs).
- **Reseed dev** : un humain doit lancer `pnpm db:reset` sur les autres postes pour récupérer l'ownership (la migration seule laisse `ownerRpId` null → workspaces RP vides jusqu'au reseed).
- Soft-locks `schema.prisma` + `contracts` **libérés**.

## 8. Mises à jour annexes

- **ADR-0022** créé (acquis). **CLAUDE.md** : section « Patterns émergés V05 LOT 6 ». **tech-debt** : +TD-V05-LOT6-PROD-BACKFILL, +TD-V05-LOT6-WS-TRANSFER, +TD-V05-LOT6-SUBJ-SALLE-UNIQ ; TD-V03-SUIVI-ANNEE actualisée (scope école+owner posé, filtre année restant). **vague-05-lots.md** : LOT 6 ajouté et coché.
