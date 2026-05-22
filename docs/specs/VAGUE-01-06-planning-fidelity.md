# SPEC — VAGUE-01-06 · Fidélité Planning RP au prototype PLANIT-IA

**Auteur :** Salim · **Date :** 2026-05-22 · **Statut :** Approuvée · **Branche cible :** `feat/salim`

## Objectif

Après le LOT 05 (shell + premier passage planning), revue côte-à-côte du
rendu `/rp` avec les screenshots `localhost:5500/rp/` du prototype
`PLANIT-IA`. Plusieurs écarts visuels et d'interaction subsistent. Ce LOT 06
les corrige sans toucher au backend (LOT 1) ni aux contrats.

## Périmètre IN

| Sujet                                                                      | Composant                                         | Localisation                                                                  |
| -------------------------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------- |
| Palette par module (6 teintes brown/blue/green/red/orange/purple)          | helper `paletteForSession()` + `SessionCard`      | `apps/web/src/lib/module-palette.ts` + `components/planning/session-card.tsx` |
| Card sessions au format proto (pas de badge type top / catégorie bottom)   | `<SessionCard>` (refonte)                         | `apps/web/src/components/planning/session-card.tsx`                           |
| Shortcut `⌘K` indicateur dans la recherche topbar                          | `<Topbar>`                                        | `apps/web/src/components/layout/topbar.tsx`                                   |
| Toolbar enrichi (undo/redo + sélecteur classe + exporter + CTA orange vif) | `<PlanningToolbar>` (nouveau)                     | `apps/web/src/components/planning/planning-toolbar.tsx`                       |
| Toggle Semaine/Jour + compteur séances                                     | `<ViewScopeToggle>` (nouveau)                     | `apps/web/src/components/planning/view-scope-toggle.tsx`                      |
| Footer : ajouter compteur "validées" + bouton Publier gradient             | `<PlanningFooter>` + `<PublishButton>` (refontes) | `apps/web/src/components/planning/stats-bar.tsx` + `publish-button.tsx`       |
| Bandeau fériés : couleurs précises `#FEF3C7 / #FDE68A / #FCD34D / #78350F` | `<HolidayBanner>` (ajustement)                    | `apps/web/src/components/planning/holiday-banner.tsx`                         |
| Sidebar drag-resize (56 → 320 px) + mode réduit + floating toggle          | `<Sidebar>` (refonte)                             | `apps/web/src/components/layout/sidebar.tsx`                                  |
| Compteurs topbar (3 conflits, 5 demandes, 3 notifs) en mode démo V1        | page `/rp`                                        | `apps/web/src/app/(planit)/rp/page.tsx`                                       |

## Périmètre OUT (reportés)

- **Drag&drop séances dans la grille** (TD-009 déjà ouvert).
- **`module.color` dans le contrat** : V1 utilise un hash déterministe
  `colorForModule(moduleId)` pour assigner brown/blue/green/orange.
  Vague 02 ajoutera le champ à `ModuleRef` (TD-018).
- **Undo/Redo + sélecteur classe + exporter** : visibles mais désactivés
  (TD-019). Demandent un store dédié + endpoint export.
- **Vue Jour** dans `<ViewScopeToggle>` désactivée (TD-017).
- **Compteurs topbar branchés** sur de vrais hooks : V1 hardcode 3/5/3 pour
  matcher la démo. TD-020 trace la migration vers `useConflictsQuery` etc.
- **Sub-views byclass/byroom/byteacher** du proto : V1 n'a que la vue
  classique (TD-011 déjà ouvert).

## Décisions techniques

- **Palette par module via hash** : `paletteForSession(moduleId, type)` choisit
  parmi 4 couleurs assignables (brown/blue/green/orange) par hash stable de
  `module.id`. Les catégories `evaluation` (EXAM/RATTRAP/DEVOIR) et
  `evenement` (EVENT) écrasent ce choix vers `red` / `purple` respectivement.
  C'est conforme à la réservation chromatique du proto.
- **`SessionCard` ne porte plus de badge type top-right ni de pill catégorie
  bottom** en V1. La couleur de la barre verticale + du fond communique tout :
  on retombe sur le rendu proto. Le badge type est gardé uniquement pour le
  catalogue (V2).
- **Topbar 2 icônes** : `InboxIcon` (Demandes) + `BellIcon` (Notifications).
  C'est ce que montrent les screenshots PLANIT-IA récents.
- **`+ Nouvelle séance` orange vif `#EA580C`** : reprend exactement la valeur
  `ORANGE = '#EA580C'` du composant `NewSessionButton` du proto. Plus saturé
  que `--color-accent` (`#E8620A`) pour le rendre proéminent comme CTA principal.
- **`<PublishButton>` gradient marron→orange** + ombre orange souple :
  reproduit fidèlement le style proto (`linear-gradient(135deg, primary, accent)`
  - `box-shadow: 0 2px 8px -2px accent`).
- **Sidebar drag-resize avec floating toggle** : reproduction exacte du
  pattern proto (mouseDown sur poignée 4px à droite, listeners sur `document`,
  bouton chevron en position `fixed`, rotation 180° quand collapsed).
- **Compteur "validées" calculé client-side** depuis `sessions` (status ===
  'VALIDE'). Le backend stats endpoint ne l'expose pas — V1-D3 simplifie
  vers `pending` total. Pour la fidélité du footer, on calcule localement.

## Critères de succès

- `/rp` rend visuellement à ≥ 95 % de la référence PLANIT-IA :
  - Sidebar dark drag-resizable, mode réduit fonctionnel, floating toggle.
  - Topbar avec ⌘K + 2 icônes badge orange + avatar.
  - Toolbar avec tous les éléments (undo/redo/cette-semaine/classe/view-tabs/exporter/+nouvelle).
  - Cartes session colorées par module (6 teintes), prof + salle inline.
  - Bandeau jaune fériés au bon ton.
  - Footer 4 compteurs + 3 boutons V2 + Publier gradient.
- Aucune régression : créer/éditer/publier séance fonctionne.
- `pnpm --filter @planit/web lint / typecheck / build` verts.
- TD-017 → TD-020 ajoutés à `docs/tech-debt.md`.

## Hors scope (rappel)

- Backend (LOT 1 fini, non touché).
- Contracts (non touché).
- LOT 3/4 (enseignant/étudiant) : la sidebar/topbar/shell sont génériques et
  ces pages bénéficient automatiquement.
