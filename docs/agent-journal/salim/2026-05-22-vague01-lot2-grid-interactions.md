# Journal d'agent — Vague 01 · LOT 2 — itération D (Grille 7j, resize, copier-coller)

**Date :** 2026-05-22  
**Membre :** Salim Ouedraogo (`feat/salim`)  
**Slug :** `vague01-lot2-grid-interactions`  
**Spec :** `docs/specs/VAGUE-01-01-d-grid-interactions.md`  
**Statut :** Livré (commits lot 08 + colonnes 250 px)

---

## Directives reçues

- Poursuite du **LOT 2** (Frontend RP) après l'itération C (pleine page + drag).
- Compléter **R.12** : 7 jours, resize, copier-coller (cf. `vague-01-mvp-planning.md`).

---

## Décisions techniques

| Décision                               | Justification                                                       |
| -------------------------------------- | ------------------------------------------------------------------- |
| `DAY_COUNT = 7`                        | Semaine calendaire complète ; scroll horizontal si viewport étroit. |
| Copie en mémoire (`copiedSession`)     | Pas de clipboard API ; suffisant pour V1.                           |
| Collage via `useCreateSessionMutation` | POST existant ; copie en non publiée côté backend.                  |
| `stopPropagation` sur clic carte       | Évite la désélection par le clic fond.                              |
| Resize `document` listeners            | Geste fluide hors carte.                                            |
| Colonnes `minmax(250px, 2fr)`          | Lisibilité vs proto 150 px.                                         |
| `BOTTOM_PAD = HOUR_HEIGHT / 2`         | Respiration sous 20h.                                               |

---

## Décisions soumises à validation

Aucune.

---

## Modifications effectuées

| Commit                | Contenu                         |
| --------------------- | ------------------------------- |
| `eb28f4c`             | `DAY_COUNT` 6 → 7               |
| `13c34f0`             | Désélection + Ctrl/Cmd+C/V      |
| `8640077` / `10f5d10` | Resize, lignes-guides, colonnes |
| `69a7a3f`             | Colonnes min 250 px             |

- `planning-grid.tsx`, `session-card.tsx`
- **À ne pas versionner** : `apps/mobile/.expo/*` (artefacts locaux)

---

## Résultats CHECK

```bash
pnpm --filter @planit/web typecheck   # ✓
pnpm --filter @planit/web lint        # ✓
pnpm --filter @planit/web build       # ✓
```

- [ ] 7 colonnes ; scroll horizontal
- [ ] Copier-coller ; resize ; drag (iter. C) OK

---

## Surprises

- Numérotation erronée « LOT 08 » dans les commits — corrigée en doc (itération D du LOT 2).
- TD-009 obsolète — mis à jour.

---

## Suite

- PR vers `develop` : **LOT 2** complet (itérations A–D).
- Undo/redo : TD-009 / TD-019 (Vague 02).

---

## Mises à jour annexes

- [x] Specs `VAGUE-01-01-a` … `d` (renommage depuis 05–08)
- [x] `docs/tech-debt.md` — TD-009, TD-021
- [x] `vague-01-mvp-planning.md` — R.12 → `[x]` (log évolution)
