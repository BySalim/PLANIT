# Journal — Libasse · 2026-06-13 · vague05-lot4-refontes-transverses

## Directives reçues

Implémenter **LOT 4 V05 — Refontes transverses** (4.1 Suivi enrichi · 4.2
Overlay Enseignant · 4.3 Responsable RP surfacé · 4.4 Salle commune) **en
renfort sur Oumy + Oumar**, avec **accord explicite de Salim**. Même
pattern que LOT 4 V02 et LOT 5 V03. L'appui officiel de Libasse couvrait
uniquement 4.2 ; périmètre élargi validé.

Spec source : `vagues/vague-05-lots.md` § LOT 4. Décisions structurelles
référencées : V5-D5 (Responsable RP), V5-D6 (Salle commune), V5-D10 (Suivi
enrichi), V5-D11 (Overlay Enseignant).

## Décisions techniques

- **Découpage en 7 PR locales** sur `feat/libasse` (PR1 back 4.1, PR2 front
  4.1, PR3 back 4.3, PR4 front 4.3, PR5 4.2 overlay, PR6 4.4 badge, PR7
  CHECK+journal). Pas de SPEC formelle (choix du dev — workflow autonome).
- **Tout dérivé, zéro nouvelle persistence** : `statut` et `responsable`
  sur `SuiviModuleDto`, et `responsable` sur Classes/Formations/Maquettes
  sont calculés au mapping à partir d'`estTermine`/`heuresFaites` et de
  `Filiere.responsableRpId` (déjà en base depuis V05 LOT 0.3).
- **Modification de `packages/contracts/`** — strictement additive
  (`statut` requis nouveau · `responsable` optionnel partout). Aucun
  changement breaking côté consommateurs ; les anciens tests passent.
- **Composants partagés** : `<ResponsableCell>` + `<StatutPill>` dans
  `apps/web/src/components/shared/` plutôt que dupliqués dans chaque
  table (Suivi, Classes, Formations, Maquettes) — pattern post-LOT 2
  polish 2026-05-28 (mini-composants partagés sans gros refactor).
- **Salles page refonte RP** : le placeholder « Coming Soon » V03 est
  remplacé par une vraie table avec colonnes Salle/Type/Capacité/Responsable
  - badge « Commune ». Le backend `GET /api/salles` (livré 2.5) renvoyait
    déjà le bon scope école (un RP voit siennes + autres RP + communes).
- **Pas de modification du schéma Prisma** ni de nouvelle migration.

## Décisions soumises à validation

- **Périmètre LOT 4 V05 élargi** (4.1 + 4.2 + 4.3 + 4.4) : Libasse prend
  Oumy + Oumar avec accord Salim explicite, validé via `AskUserQuestion`
  au démarrage de session.
- **Modification `packages/contracts/`** : 5 schémas enrichis
  (suiviModuleSchema, classeV3Schema, formationSchema, maquetteSchema,
  salleListSchema). Aucune suppression, aucun renommage — additif strict.

## Modifications

### PR1 — backend 4.1 (Suivi enrichi)

- `packages/contracts/src/academic/index.ts` :
  - `suiviStatutSchema` = `z.enum(['a_planifier', 'en_cours', 'termine'])`
  - `suiviModuleSchema += statut` (requis) + `responsable` (nullable optional)
  - import `responsableRefSchema` depuis `../entities`
- `apps/backend/src/suivi-modules/suivi-modules.service.ts` :
  - `versionModuleInclude` étendu : `formation.filiere.responsableRp` (id, fullName)
  - helper pur `deriveStatut(estTermine, heuresFaites)` exporté localement
  - `list()` et `getOne()` mappent les 2 nouveaux champs

### PR2 — frontend 4.1 (colonnes Statut + Responsable sur Suivi)

- `apps/web/src/components/shared/statut-pill.tsx` (NEW)
  pill colorée 3 états (Terminé/En cours/À planifier)
- `apps/web/src/components/shared/responsable-cell.tsx` (NEW)
  avatar + nom (ou « — » si null)
- `apps/web/src/components/rp/suivi/rp-suivi-view.tsx` :
  - 2 nouvelles colonnes table après « Classe »
  - import StatutPill + ResponsableCell
- `apps/web/src/components/rp/suivi/suivi-skeleton.tsx` aligné 11 colonnes

### PR3 — backend 4.3 (Responsable surfacé)

- `packages/contracts/src/academic/index.ts` :
  - `maquetteSchema += responsable` (optional nullable)
  - `formationSchema += responsable`
  - `classeV3Schema += responsable`
- `apps/backend/src/classes/classes.service.ts` :
  - `classeInclude.filiere` + `classeInclude.formation.filiere` étendus
    avec `responsableRp` (id, fullName)
  - `toDto` mappe `responsable` depuis `formation.filiere ?? filiere`
- `apps/backend/src/formations/formations.service.ts` :
  - `formationInclude.filiere += responsableRp`
  - `toDto += responsable`
- `apps/backend/src/maquettes/maquettes.service.ts` :
  - 3 occurrences `include: { filiere: true, … }` mises à jour
  - `MaquetteRow` type étendu, `toMaquetteDto += responsable`

### PR4 — frontend 4.3 (colonne Responsable)

- `apps/web/src/app/(planit)/(gestion)/classes/page.tsx` :
  - grille étendue de 5 → 6 colonnes (+180px pour Responsable)
  - nouvelle cellule avec `<ResponsableCell>`
- `apps/web/src/app/(planit)/(gestion)/(rp-only)/formations/page.tsx` :
  - grille étendue de 5 → 6 colonnes (+180px)
  - cellule Responsable
- `apps/web/src/components/rp/maquettes/maquette-list.tsx` :
  - ligne sigle filière enrichie avec `· {responsable.fullName}` discret

### PR5 — frontend 4.2 (Overlay Enseignant)

- `apps/web/src/components/rp/enseignants/enseignant-detail-drawer.tsx`
  (NEW) — drawer md calqué sur `etudiant-detail-drawer.tsx` :
  - en-tête avatar + nom + email + WhatsApp
  - section Statut (pill PERMANENT/VACATAIRE) + Spécialité
  - bouton « Modifier la fiche » rendu uniquement si `useIsRp()` true
- `apps/web/src/app/(planit)/(gestion)/enseignants/page.tsx` :
  - state `detailTarget` + bouton « Voir » qui ouvre le drawer (au lieu
    du modal d'édition)
  - drawer wired en bas du JSX ; `onEdit` ferme le drawer puis ouvre le
    modal d'édition existant

### PR6 — frontend 4.4 (badge Salle commune)

- `packages/contracts/src/academic/index.ts` :
  - `salleListSchema = z.array(salleSchema)` exporté
- `apps/web/src/lib/queries-v3.ts` :
  - import SalleDto + salleListSchema
  - `academicKeys.salles()`
  - `useSallesFullQuery()` (lecture liste complète, scope école côté serveur)
- `apps/web/src/app/(planit)/(gestion)/salles/page.tsx` (refonte RP) :
  - remplace le `ComingSoonPlaceholder` par `<SallesRpView>` (table 4 cols)
  - badge « Commune » accent-100 quand `rpResponsable === null`
  - vue AC inchangée (V03 LOT 6)

### PR7 — CHECK + journal

- `docs/agent-journal/libasse/2026-06-13-vague05-lot4-refontes-transverses.md`
  (ce fichier)

## Résultats CHECK

Lancés depuis la racine après stop des dev servers :

- `pnpm lint` → ✓ 3/3
- `pnpm typecheck` → ✓ 6/6
- `pnpm test` → ✓ **428 tests** (275 backend · 99 web · 33 utils · 21 UI)
- Backend `nest build` → ✓
- Frontend `next build` → ✓ compile + 22 pages SSG ; échec final sur
  copie `standalone` (EPERM symlinks Windows non-admin, **non-bloquant
  CI Linux** — bien tracé `TD-WIN-SYMLINK` côté projet)

### Smoke tests navigateur (MCP Claude_Preview)

| Tâche                      | Validation                                                                                                                               |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **4.1** Suivi enrichi      | 11 colonnes visibles. Algorithmique Avancée → statut « Terminé », responsable « Mme Aminata Diallo » (avatar MD)                         |
| **4.3** Classes            | colonne « Responsable » visible, 5 cellules renseignées « Mme Aminata Diallo »                                                           |
| **4.2** Overlay Enseignant | clic « Voir » M. Mamadou Ba → drawer ouvert : statut Vacataire, spécialité Réseaux, bouton « Modifier la fiche » présent (RP)            |
| **4.4** Salles             | 5 salles RP de l'école visibles : Amphi A (siennes), Labo Informatique (autre RP : Cheikh Diop), Amphi mutualisé → badge « **Commune** » |

## Surprises

- **`User.fullName` vs `Enseignant.nomComplet`** : le `select` Prisma
  pour `Filiere.responsableRp` devait utiliser `fullName` (User) et non
  `nomComplet` (Enseignant). Typecheck a flaggé directement, fix trivial.
- **`responsableRefSchema` cross-file** : il vit dans `entities/` et le
  Suivi est dans `academic/` — un seul `import` ajouté résout proprement,
  pas besoin de duplication.
- **Build `next` Windows standalone EPERM** : connu du projet (TD existant
  côté config tracing standalone) ; la compilation logique passe + les 22
  pages se génèrent. Aucun impact CI.
- **Cookie expiration** pendant les smoke MCP successifs → re-login direct
  via `fetch('/api/auth/login')` (même pattern V03 LOT 5).

## Suite

- **Commiter en 7 commits successifs** sur `feat/libasse` (un par PR
  logique) puis pousser et ouvrir PR `feat/libasse → develop`.
- **Smoke manuel par Libasse** : vérifier en local
  - Sélection multi sur Suivi → bulk Marquer terminés (régression possible
    si statut interfère avec sélection)
  - Cycle Direction (login direction.ism@planit.test) → confirmer que la
    vue Suivi sera lecture seule quand le LOT 3 V05 ouvre `/suivi-modules`
    aux Direction (notre `canEdit = isRP` est calibré pour ça)
- **Aucune tech debt nouvelle** — patterns réutilisés à 100%.

## Mises à jour annexes

- Aucune modification de `CLAUDE.md` (les patterns émergés du LOT 4 V05
  seront capitalisés à la clôture V05 LOT 5.4 par Salim).
- ADR-0019/0020 mergés sur develop, non touchés.
- `docs/tech-debt.md` non modifié.
