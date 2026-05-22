# SPEC — VAGUE-01-01-c · LOT 2 — Planning RP pleine page + drag (R.12)

**Vague :** 01 · **Lot officiel :** 2 (Frontend RP) · **Itération :** C (pleine page + drag)  
**Auteur :** Salim · **Date :** 2026-05-22 · **Statut :** Approuvée (rétro) · **Branche :** `feat/salim`  
**Spec parente :** [`VAGUE-01-01-planning-rp.md`](VAGUE-01-01-planning-rp.md) · **Précédent :** [01-b](VAGUE-01-01-b-planning-fidelity.md)  
**Journal :** `docs/agent-journal/salim/2026-05-22-vague01-planning-fullbleed.md`

## Objectif

Appliquer le layout pleine page du prototype PLANIT-IA (`RPPlannerTimeline`) à
la page `/rp` : toolbar et footer figés, grille à scroll interne, en-têtes
sticky, cartes fidèles au proto. Ajouter la **sélection** et le **drag & drop**
des séances (hors périmètre initial de l'itération B, demandé en cours de session — **R.12**).

## Périmètre IN

| Sujet                                                                  | Composant        | Localisation                                                       |
| ---------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------ |
| Shell pleine page (`fullBleed`)                                        | `<Shell>`        | `apps/web/src/components/layout/shell.tsx`                         |
| Colonne flex toolbar / grille / footer                                 | page `/rp`       | `apps/web/src/app/(planit)/rp/page.tsx`                            |
| `HOUR_HEIGHT` 78 px, `min-w` grille, en-têtes blancs centrés sticky    | `<PlanningGrid>` | `apps/web/src/components/planning/planning-grid.tsx`               |
| Toolbar / week-nav / view-mode-tabs compacts                           | barre planning   | `planning-toolbar.tsx`, `week-navigator.tsx`, `view-mode-tabs.tsx` |
| Cartes : badge catégorie, chip classe translucide, bordure non publiée | `<SessionCard>`  | `session-card.tsx`                                                 |
| Sélection (clic), drawer (double-clic), drag & drop (PUT)              | grille + carte   | `planning-grid.tsx`, `session-card.tsx`                            |

## Périmètre OUT (reportés — voir itération D et TD-009)

- Grille **7 jours** (dimanche) — itération D ([01-d](VAGUE-01-01-d-grid-interactions.md)).
- **Copier-coller** clavier — itération D.
- **Resize** poignées haut/bas — itération D.
- Undo/redo, vues Classe/Salle/Prof, vue Jour, panneaux — TD-009 (partiel),
  TD-011, TD-017, TD-019.

## Critères de succès

- `/rp` pleine page : seule la grille scrolle ; en-têtes jours + rail heures
  restent visibles.
- Simple clic = sélection ; double-clic = drawer ; drag = PUT avec calage 30 min.
- `pnpm --filter @planit/web lint / typecheck / build` verts.

## Références

- Journal : `docs/agent-journal/salim/2026-05-22-vague01-planning-fullbleed.md`
- Itération précédente : [`VAGUE-01-01-b`](VAGUE-01-01-b-planning-fidelity.md)
- Itération suivante : [`VAGUE-01-01-d`](VAGUE-01-01-d-grid-interactions.md)
