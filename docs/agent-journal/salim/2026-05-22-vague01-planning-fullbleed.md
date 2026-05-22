# Journal d'agent — Vague 01 · LOT 07 (Planning RP — refonte pleine page)

**Date :** 2026-05-22
**Membre :** Salim Ouedraogo (`feat/salim`)
**Slug :** `vague01-planning-fullbleed`
**Durée :** 1 session Claude Code (Opus 4.7).
**Statut :** Code livré, lint/typecheck/build verts, vérifié visuellement
sur `http://localhost:3000/rp` (1440×900 et 1120×820).

---

## Directives reçues

- L'utilisateur a fourni un export HTML du prototype
  (`PLANIT · Espace Responsable Pédagogique.html`, snapshot de
  `localhost:5500/rp/`) et demandé d'« appliquer le même design à la page
  planning du RP ».
- Deux questions posées avant de coder (AskUserQuestion) :
  1. **Périmètre** → choix « Refonte layout + styles » : passer le planning en
     pleine page comme le proto, aligner toolbar / cartes / grille / footer,
     périmètre fonctionnel V1 conservé (boutons V2 désactivés). Les
     interactions V2 (drag&drop, panneaux, vues classe/salle/prof) restent
     **hors périmètre**.
  2. **Environnement** → autorisation de libérer le port 3001 (squatté par une
     instance Next.js orpheline) pour faire tourner le backend.

---

## Décisions techniques

| Décision                                                                | Justification                                                                                                                                                                                                                                                                              |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Prop `fullBleed` sur `<Shell>`                                          | Le proto est en pleine page (`height: calc(100vh - 64px)`, grille à scroll interne). `fullBleed` → conteneur `h-screen overflow-hidden`, `<main>` sans padding ni scroll propre. La page gère sa colonne flex. Plus propre qu'un positionnement absolu.                                    |
| Page `/rp` en colonne flex `h-full`                                     | Toolbar / bandeau / toggle `flex-shrink-0`, grille `flex-1 min-h-0`, footer `flex-shrink-0`. Footer toujours visible, seule la grille scrolle.                                                                                                                                             |
| `HOUR_HEIGHT` 64 → 78 px                                                | Aligné sur `HOUR_H = 78` du proto (`planning-canvas.jsx`). Cartes de séance 2h = 152 px → contenu aéré, fidèle au proto.                                                                                                                                                                   |
| Grille `min-w` 720 → 964 px                                             | `COL_MIN_W = 150` du proto × 6 colonnes + 64 px de rail = 964. Garantit des colonnes ≥ ~150 px → l'horaire des cartes ne se tronque jamais.                                                                                                                                                |
| En-têtes jours + colonne heures `sticky`                                | `sticky top-0` sur la ligne d'en-tête, `sticky left-0` sur le rail des heures, coin `z-30`. Restent visibles pendant le scroll interne de la grille.                                                                                                                                       |
| En-têtes de grille (ligne jours + colonne heures) en blanc `bg-surface` | Retour utilisateur : le timeline du proto (`RPPlannerTimeline`) rend coin/en-têtes/rail sur `C.surface` (blanc), pas sur le `#F4F4F0` de l'ancien `PlannerClassic`. En-têtes blanches, distinguées par les bordures uniquement. Texte des jours **centré** (comme le bloc texte du proto). |
| `<SessionCard>` : badge catégorie COURS/EVAL/EVENT en bas-droite        | Calqué sur `RPTimelineBlock` du proto (le badge existe bien dans la grille timeline, pas seulement au catalogue — le LOT 06 s'était basé sur la mauvaise carte). Couleur `text-text-muted` au lieu du `#44403C` exact (compromis no-hex-en-dur).                                           |
| Chip classe translucide `bg-white/75`                                   | Le proto utilise `rgba(255,255,255,0.75)` pour laisser transparaître la teinte du module. `bg-white/75` = équivalent Tailwind, pas de hex.                                                                                                                                                 |
| Indicateur « non publiée » = bordure pointillée + point ambre           | V1-D3 demande « badge OU bordure distincte ». La bordure pointillée suffit ; le point en haut-droite renforce. Texte « Non publiée » retiré pour rester fidèle au proto (qui n'a pas ce concept) — l'`aria-label` porte l'information.                                                     |
| `NewSessionButton` : label responsive (`xl:` plein / sinon « Séance »)  | Calqué sur le `NewSessionButton` responsive du proto. Toolbar tient à 1440 ; en deçà elle scrolle horizontalement (`overflow-x-auto`, comme le proto).                                                                                                                                     |
| `whitespace-nowrap` + `&nbsp;` sur la ligne horaire                     | Sur cartes étroites « 10:00 – 12:00 · 2h » se cassait en deux lignes. Corrigé.                                                                                                                                                                                                             |
| `ViewModeTabs` (Classique/Classe/Salle/Prof) en segmented subtil        | Le proto distingue ce switcher (onglet actif blanc surélevé sur fond `bg`) du toggle Semaine/Jour (rempli marron). Les deux composants reflètent maintenant cette distinction.                                                                                                             |

---

## Décisions soumises à validation (validées)

- **Périmètre** « Refonte layout + styles » : validé par l'utilisateur via
  AskUserQuestion avant le code.
- **Libération du port 3001** : validée — process Next.js orphelin (PID 27792)
  tué, backend redémarré dessus.
- Aucune dépendance npm ajoutée. Aucune modif `prisma/schema.prisma`,
  `packages/contracts/`, ni `packages/design-tokens/` (ressources sensibles
  intactes).

---

## Modifications effectuées

### Layout pleine page

- `apps/web/src/components/layout/shell.tsx` : prop `fullBleed` —
  `h-screen overflow-hidden` + `<main>` sans padding/scroll.
- `apps/web/src/app/(planit)/rp/page.tsx` : `Shell fullBleed`, contenu en
  colonne flex `h-full`, grille dans un wrapper `flex-1 min-h-0`.

### Toolbar

- `planning-toolbar.tsx` : barre flush (`h-[52px]`, `border-b`, `px-3`,
  `overflow-x-auto`), séparateurs verticaux, contrôles compacts (h-8), CTA
  « Nouvelle séance » à label responsive.
- `week-navigator.tsx` : refonte — `‹` / bouton « Cette semaine » + icône
  calendrier / `›`, puis label date « 18 mai – 24 mai 2026 / S21 » non encadré.
- `view-mode-tabs.tsx` : segmented control subtil (onglet actif blanc).

### Grille

- `planning-grid.tsx` : conteneur `h-full overflow-auto`, en-têtes jours +
  colonne heures `sticky` et **blanches** (`bg-surface`), en-têtes jours
  **centrés**, `HOUR_HEIGHT` 78, `min-w` 964, icône `BarChartIcon` dans le
  coin, retrait de la carte bordée externe.

### SessionCard

- `session-card.tsx` : rayon 10 px, badge catégorie COURS/EVAL/EVENT en
  bas-droite, chip classe translucide, ligne horaire `nowrap`.

### Barres figées

- `stats-bar.tsx` (PlanningFooter) : `flex-shrink-0`, sans wrap, boutons h-8.
- `view-scope-toggle.tsx` : barre `h-9` `flex-shrink-0` avec `border-b`.
- `holiday-banner.tsx` : barre flush (`border-b`, `flex-shrink-0`).
- `publish-button.tsx` : hauteur h-8 (cohérence toolbar/footer).

### Sélection + déplacement des séances (retour utilisateur)

- `session-card.tsx` : props `selected` / `onSelect` / `onOpen` / `onDragStart`
  / `isDragging`. Simple clic = sélectionner (anneau 2 px couleur module),
  double-clic = ouvrir le drawer de détail. Carte `draggable`, opacité réduite
  pendant le drag. Calqué sur `RPTimelineBlock` du proto.
- `planning-grid.tsx` : passé en client component. État sélection + drag ;
  colonnes jour = cibles de drop ; aperçu de dépôt pointillé ; calage 30 min ;
  calcul du nouveau `startAt`/`endAt` (durée conservée) ; appel
  `useUpdateSessionMutation` (PUT B.3 — déjà en place). Aucun check de conflit
  (V1-D4). Aucune modif contracts/schéma.
- `rp/page.tsx` : drawer de détail ouvert sur **double-clic** (`onSessionOpen`).

---

## Résultats CHECK

```bash
pnpm --filter @planit/web typecheck   # ✓ 0 erreur
pnpm --filter @planit/web lint        # ✓ 0 warning / 0 erreur
pnpm --filter @planit/web build       # ✓ exit 0 — /rp 49.1 kB, First Load 174 kB
```

**Vérification visuelle** (`http://localhost:3000/rp`, 1440×900 et 1120×820) :

- ✅ Planning en pleine page : toolbar et footer figés, grille à scroll interne
- ✅ En-têtes jours + colonne heures `sticky` confirmés en scrollant, fond blanc
- ✅ Toolbar complète et tenue à 1440 (déborde + scroll horizontal en deçà)
- ✅ Cartes : module + chip classe + horaire (une ligne) + prof + salle + badge
  catégorie ; bordure pointillée sur les non publiées
- ✅ Footer : compteurs + auto-publication + 3 boutons V2 désactivés + Publier
- ✅ Simple clic = sélection (anneau) ; double-clic = ouverture du drawer
- ✅ Drag d'une séance → PUT → déplacée à la nouvelle heure, repassée non
  publiée, compteur « Publier » incrémenté (vérifié via l'API)
- ✅ Aucune erreur console côté `/rp`

---

## Surprises

1. **`next build` pendant que `next dev` tourne** → les deux écrivent dans le
   même `apps/web/.next` → corruption → « Internal Server Error » sur le dev
   server. Résolu : kill du dev server, `rm -rf .next`, redémarrage. **À
   retenir : ne jamais lancer `build` pendant que le `dev` tourne sur le même
   package** (ou prévoir un `distDir` séparé pour le CHECK).
2. **Port 3001 (backend) squatté** par une 2ᵉ instance Next.js orpheline — le
   backend ne pouvait pas démarrer, `/rp` n'affichait aucune séance.
3. Le **badge catégorie** du proto est rendu par `RPTimelineBlock` (carte de la
   grille timeline), pas par `CourseCard` (carte du catalogue). Le LOT 06 avait
   lu `CourseCard` et conclu à tort qu'il n'y avait pas de badge dans la grille.

---

## Suite

- **Avant merge** : créer la PR `feat(web): vague 01 LOT 07 - planning pleine
page` vers `develop`.
- **TD potentielle** : à largeur < ~1340 px (sidebar large), la toolbar déborde
  et le CTA peut être partiellement masqué (scroll horizontal, comme le proto).
  Acceptable pour V1 ; à tracer si gênant.
- **Déplacement de séance livré** : le drag&drop de base (TD-009) entre dans V1
  sur demande du Tech Lead — glisser une carte vers un nouveau créneau. Le
  redimensionnement, le copier/coller, l'undo/redo et les panneaux restent V2.
- **Reste hors périmètre** (V2) : vues classe/salle/prof (TD-011), vue Jour
  (TD-017), panneaux glissants, modale de publication, gestion des conflits.
- Données seed altérées par le test de drag (1 séance déplacée) — `db:seed`
  (idempotent) restaure l'état initial si besoin.

---

## Mises à jour annexes

- `vague-01-mvp-planning.md` : pas de changement de statut (R.12 reste `[~]`,
  drag&drop V2). Une ligne LOT 07 pourra être ajoutée au log d'évolution
  (fichier hors repo).
- ADR : pas de nouvel ADR — choix compatibles avec les ADR existants.
- `docs/shared-resources-lock.md` : aucun lock posé (aucune ressource sensible
  touchée).
