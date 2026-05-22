# SPEC — VAGUE-01-08 · Grille planning — 7 jours, resize, copier-coller

**Auteur :** Salim · **Date :** 2026-05-22 · **Statut :** Approuvée (rétro) · **Branche cible :** `feat/salim`

## Objectif

Compléter `<PlanningGrid>` après le LOT 07 : aligner la semaine sur **7 jours**
(lundi → dimanche), améliorer la lisibilité des colonnes, et livrer les
interactions clavier / souris encore listées comme V2 dans TD-009 (copier-coller,
resize). Le drag & drop reste celui du LOT 07.

## Périmètre IN

| Sujet             | Détail                                                                                                                              | Fichiers                                |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Semaine 7 jours   | `DAY_COUNT` 6 → 7 ; scroll horizontal si largeur utile < ~1814 px (`64 + 7×250`)                                                    | `planning-grid.tsx`                     |
| Désélection       | Clic sur le fond de grille ; `stopPropagation` sur les cartes                                                                       | `planning-grid.tsx`, `session-card.tsx` |
| Copier-coller     | `Ctrl/Cmd+C` copie la séance sélectionnée ; `Ctrl/Cmd+V` POST une copie au créneau sous le curseur (calage 30 min, durée conservée) | `planning-grid.tsx`                     |
| Resize            | Poignées haut/bas sur chaque carte ; preview pointillée + lignes-guides horaires ; PUT à la fin du geste                            | `planning-grid.tsx`                     |
| Espacement grille | `BOTTOM_PAD` = 30 min sous 20h ; colonnes `minmax(250px, 2fr)` ; lignes-guides pendant drag et resize                               | `planning-grid.tsx`                     |

## Périmètre OUT

- **Undo/redo** (toolbar) — TD-009 / TD-019.
- **Validation conflits** au drop, resize ou collage — V1-D4 inchangé.
- **Buffer copie persistant** (localStorage / serveur) — mémoire session uniquement.
- Fichiers `.expo/` générés localement (mobile) — hors périmètre web, non versionnés idéalement.

## Décisions techniques

- **Position de collage** : `lastMousePosRef` mis à jour au `mousemove` sur
  chaque colonne jour — le collage suit la colonne sous le curseur, pas la
  sélection.
- **Resize document-level** : `mousemove` / `mouseup` sur `document` pour ne
  pas perdre le geste si le curseur sort de la carte (même pattern que la
  sidebar LOT 06).
- **Lignes-guides** : affichage `fmtHour` sur les créneaux de début/fin
  pendant drag et resize pour feedback visuel (proto timeline).
- **Largeur colonnes 250 px** : compromis lisibilité (horaire + prof sur une
  ligne) vs scroll horizontal ; le proto cible `COL_MIN_W = 150` mais les
  cartes RP sont plus denses.

## Critères de succès

- Grille affiche lun → dim ; dimanche accepte créneaux et drag/drop.
- Clic fond → plus de sélection ; clic carte → sélection conservée.
- `Ctrl/Cmd+C` puis `Ctrl/Cmd+V` → nouvelle séance visible (POST).
- Poignées resize → durée modifiée (PUT), calage 30 min.
- Lint / typecheck / build web verts.

## Références

- Journal : `docs/agent-journal/salim/2026-05-22-vague01-planning-lot08.md`
- Précédent : `docs/specs/VAGUE-01-07-planning-fullbleed.md`
- Dette : `docs/tech-debt.md` (TD-009 mis à jour, TD-021 ajouté)
