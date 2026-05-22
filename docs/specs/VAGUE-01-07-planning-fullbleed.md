# SPEC — VAGUE-01-07 · Planning RP pleine page + interactions de base

**Auteur :** Salim · **Date :** 2026-05-22 · **Statut :** Approuvée (rétro) · **Branche cible :** `feat/salim`

> Spec rédigée après implémentation pour boucler la chaîne documentaire
> VAGUE-01-05 → 06 → **07** → 08. Référence : journal
> `docs/agent-journal/salim/2026-05-22-vague01-planning-fullbleed.md`.

## Objectif

Appliquer le layout pleine page du prototype PLANIT-IA (`RPPlannerTimeline`) à
la page `/rp` : toolbar et footer figés, grille à scroll interne, en-têtes
sticky, cartes fidèles au proto. Ajouter la **sélection** et le **drag & drop**
des séances (hors périmètre initial du LOT 06, demandé en cours de session).

## Périmètre IN

| Sujet                                                                  | Composant        | Localisation                                                       |
| ---------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------ |
| Shell pleine page (`fullBleed`)                                        | `<Shell>`        | `apps/web/src/components/layout/shell.tsx`                         |
| Colonne flex toolbar / grille / footer                                 | page `/rp`       | `apps/web/src/app/(planit)/rp/page.tsx`                            |
| `HOUR_HEIGHT` 78 px, `min-w` grille, en-têtes blancs centrés sticky    | `<PlanningGrid>` | `apps/web/src/components/planning/planning-grid.tsx`               |
| Toolbar / week-nav / view-mode-tabs compacts                           | barre planning   | `planning-toolbar.tsx`, `week-navigator.tsx`, `view-mode-tabs.tsx` |
| Cartes : badge catégorie, chip classe translucide, bordure non publiée | `<SessionCard>`  | `session-card.tsx`                                                 |
| Sélection (clic), drawer (double-clic), drag & drop (PUT)              | grille + carte   | `planning-grid.tsx`, `session-card.tsx`                            |

## Périmètre OUT (reportés — voir LOT 08 et TD-009)

- Grille **7 jours** (dimanche) — LOT 08.
- **Copier-coller** clavier — LOT 08.
- **Resize** poignées haut/bas — LOT 08.
- Undo/redo, vues Classe/Salle/Prof, vue Jour, panneaux — TD-009 (partiel),
  TD-011, TD-017, TD-019.

## Critères de succès

- `/rp` pleine page : seule la grille scrolle ; en-têtes jours + rail heures
  restent visibles.
- Simple clic = sélection ; double-clic = drawer ; drag = PUT avec calage 30 min.
- `pnpm --filter @planit/web lint / typecheck / build` verts.

## Références

- Journal : `docs/agent-journal/salim/2026-05-22-vague01-planning-fullbleed.md`
- Précédent : `docs/specs/VAGUE-01-06-planning-fidelity.md`
- Suivant : `docs/specs/VAGUE-01-08-planning-grid-interactions.md`
