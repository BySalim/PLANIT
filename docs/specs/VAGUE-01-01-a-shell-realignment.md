# SPEC — VAGUE-01-01-a · LOT 2 — Réalignement shell + planning RP (PLANIT-IA)

**Vague :** 01 · **Lot officiel :** 2 (Frontend RP) · **Itération :** A (shell)  
**Auteur :** Salim · **Date :** 2026-05-22 · **Statut :** Approuvée · **Branche :** `feat/salim`  
**Spec parente :** [`VAGUE-01-01-planning-rp.md`](VAGUE-01-01-planning-rp.md)

## Objectif

Aligner l'interface `apps/web` sur la référence design `PLANIT-IA/rp/` après revue
utilisateur du LOT 2 (livré par Libasse). Deux écarts critiques :

1. **Switcher d'acteur en header** (`topbar.tsx`) duplique l'URL et n'a pas
   d'équivalent dans le prototype Design → à supprimer totalement.
2. **Shell improvisé** (topbar minimaliste + `<main max-w-6xl>`) au lieu du
   shell Design (sidebar dark 248px à 4 sections, topbar breadcrumb + recherche
   - conflits + notifs + avatar, footer enrichi). Tokens couleurs eux-mêmes
     divergent : `#593114 / #ee7023` au lieu de `#6B2D0E / #E8620A`.

## Périmètre

**IN**

| Référence Design                                           | Composant à créer / modifier              | Localisation                                               |
| ---------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------- |
| `PLANIT-IA/rp/components/shell.jsx` (Sidebar)              | `<Sidebar>` (nouveau)                     | `apps/web/src/components/layout/sidebar.tsx`               |
| `PLANIT-IA/rp/components/shell.jsx` (Topbar)               | `<Topbar>` (réécriture)                   | `apps/web/src/components/layout/topbar.tsx`                |
| wrapper Sidebar + Topbar + main                            | `<Shell>` (nouveau)                       | `apps/web/src/components/layout/shell.tsx`                 |
| `PLANIT-IA/shared/tokens.js`                               | tokens couleurs alignés                   | `apps/web/src/app/globals.css` + `packages/design-tokens/` |
| `PLANIT-IA/rp/components/planning-canvas.jsx` (CourseCard) | `<SessionCard>` (refonte)                 | `apps/web/src/components/planning/session-card.tsx`        |
| `planning-canvas.jsx` (toolbar)                            | tabs modes de vue + bannière fériés       | `apps/web/src/components/planning/planning-grid.tsx`       |
| `planning-canvas.jsx` (footer)                             | `<PlanningFooter>` (réécriture stats-bar) | `apps/web/src/components/planning/stats-bar.tsx`           |
| `planning-canvas.jsx` (week strip)                         | `<WeekNavigator>` enrichi                 | `apps/web/src/components/planning/week-navigator.tsx`      |
| `PLANIT-IA/rp/screens/planning.jsx`                        | page `/rp` orchestrée par Shell           | `apps/web/src/app/(planit)/rp/page.tsx`                    |

**OUT** (reportés en TD ou en vagues ultérieures)

- Pages secondaires (Dashboard, Suivi, Demandes, Conflits, Filières,
  Formations, UE & Modules, Maquettes, Étudiants, Classes, Enseignants,
  Personnel, Salles, Messagerie, Communications, Activité) : la sidebar les
  liste mais cliquer dessus ne fait rien (`href="#"`).
- Modes de vue **Classe / Salle / Prof** : onglets visibles mais désactivés
  → TD-011.
- **Drag-resize de la sidebar** : largeur fixe 248px → TD-012.
- **Recherche** : input visuel sans logique back → TD-014.
- **Migration vers lucide-react** : on enrichit `packages/ui` avec les icônes
  manquantes (inline SVG) → TD-013.
- Spécialisation Sidebar par rôle (enseignant/étudiant) : LOT 3/4.
- Auth, conflits réels, exports PDF/iCal : Vague 02+.

## Décisions structurantes

- **Owner exceptionnel** : Salim (TL) sur `feat/salim`. Le LOT 2 ayant été
  livré par Libasse, on évite la passe-de-bras et on porte le refactor au TL.
- **Switcher d'acteur supprimé totalement** : URL = source unique de vérité.
  Aucun moyen UI de changer de rôle. Vague 02 ajoutera l'auth.
- **`/` redirige toujours vers `/rp`** (statu quo).
- **Pas de nouvelle dépendance npm** : icônes inline via `packages/ui`
  enrichi. Aucun ajout dans `package.json`.
- **Sidebar dark** : on adopte le thème dark (`#2A1C12` background) du
  prototype, qui est plus distinctif que la variante light.

## Tokens à corriger

| Variable                | Avant     | Après            |
| ----------------------- | --------- | ---------------- |
| `--color-primary`       | `#593114` | `#6B2D0E`        |
| `--color-primary-hover` | `#6f3e1e` | `#8B3A12`        |
| `--color-primary-50`    | `#fbf5f1` | `#FCF7F4`        |
| `--color-primary-100`   | `#f0ddd0` | `#F5E6DC`        |
| `--color-primary-200`   | `#d8b79a` | `#E8C9B0`        |
| `--color-accent`        | `#ee7023` | `#E8620A`        |
| `--color-accent-100`    | `#fde9d5` | `#FDE8D0`        |
| `--color-accent-600`    | `#c85a16` | `#C44E07`        |
| `--color-accent-800`    | `#743108` | `#742E04`        |
| `--color-border-soft`   | `#f0edeb` | `#F0EDEB` (idem) |

**Ajouts** (sidebar dark) :

```
--color-sb-dark:       #2A1C12
--color-sb-dark-2:     #3A2A1E
--color-sb-dark-text:  #F5E6DC
--color-sb-dark-muted: rgba(245,230,220,0.55)
```

## Icônes à ajouter dans `packages/ui`

Manquantes par rapport à `PLANIT-IA/shared/icons.jsx` + besoins de la sidebar :

`InboxIcon`, `AlertTriangleIcon`, `LayersIcon`, `UserCogIcon`, `DoorIcon`,
`UsersIcon`, `GraduationCapIcon`, `BookStackIcon`, `MessageCircleIcon`,
`ChevronDownIcon`, `SearchIcon`, `PlusIcon`.

Toutes inline SVG (style Lucide stroke 24×24), pas de dépendance externe.

## Règles UI

- **Sidebar dark** sticky, 248px, 4 sections collapsibles :
  - **PRINCIPAL** : Tableau de bord · Planning (actif) · Suivi des modules ·
    Demandes (badge si > 0) · Conflits (badge rouge si > 0)
  - **OFFRE DE FORMATION** : Filières · Formations · UE & Modules · Maquettes
  - **RÉFÉRENTIELS** : Étudiants · Classes · Enseignants · Personnel · Salles
  - **CONSULTATION** : Messagerie · Communications · Activité
  - Item actif : barre orange 3px à gauche + bg `rgba(232,98,10,0.15)` + texte blanc
  - Footer : avatar (initiales) + nom + rôle ("Responsable de programme") +
    bouton Paramètres
- **Topbar** sticky 64px : breadcrumb (12px gris) + titre (Poppins 20px) +
  sous-titre optionnel + recherche centrale (300px) + bouton conflits (rouge
  clair si > 0) + bouton Demandes + bouton Notifications + avatar.
- **SessionCard** revue :
  - Barre verticale gauche 4px colorée par module (réutilise palette `TYPE_STYLES`)
  - Badge type en haut droit (CM/TD/TP/EXAM…) — neutre gris pour cours, rouge
    pour eval (EXAM/RATTRAP), bleu/violet pour event
  - Module code en bold 13px (continue à utiliser `session.module.code` faute
    de `session.module.name` — TD à tracer si besoin)
  - Classe pill (`session.classe.code`) sur fond clair
  - Heures `08:00 – 10:00` + durée `2h`
  - Prof name (`session.teacher.firstName + lastName`) avec icône UserSmall
  - Salle (`session.salle.name`) avec icône MapPin
  - Bord pointillé orange + badge "Non publiée" si `!isPublished` (déjà en place)
- **Bannière jours fériés** : si la semaine contient un jour férié, afficher en
  haut de la grille un bandeau jaune clair `Jour(s) fermé(s) cette semaine : <jour> — <nom>`.
  V1 : liste hardcodée minimaliste (Victoire 1945 → 8 mai, Indépendance → 4 avril,
  Korité/Tabaski/Toussaint → dates 2026 hardcodées).
- **Onglets modes de vue** : `Classique` (actif) | `Classe` | `Salle` | `Prof`
  (3 derniers disabled avec tooltip "Disponible Vague 02").
- **Footer planning** : à gauche `<total> séances · <published> publiées ·
<validated> validées · <pending> provisoires` (texte 12px gris). À droite :
  `Auto-publication vendredi 22:00` (gris) · `Historique` · `Exporter` ·
  `Aperçu étudiant` (3 boutons ghost) · **`Publier la semaine`** (bouton
  orange primaire, c'est l'existant `<PublishButton>`).
  - Boutons Historique/Exporter/Aperçu étudiant : visibles mais désactivés
    avec tooltip "Vague 02" (continuer la convention R.10 — caché ou disabled).
- **WeekNavigator** : prev/next + chip `Cette semaine` (lundi date – dimanche
  date) + label `S<n>` (numéro ISO de semaine) + bouton "Aujourd'hui".

## Endpoints consommés

Aucun nouveau. Réutilise les endpoints LOT 1 existants :

- `GET /api/sessions` (déjà via `useWeekSessionsQuery`)
- `GET /api/sessions/stats` (déjà via `useWeekStatsQuery`)
- `POST /api/sessions/publish` (déjà via `usePublishSessionsMutation`)

## Definition of Done

- `/rp` charge avec une sidebar dark 4 sections à gauche, topbar enrichi en
  haut, planning au centre, footer enrichi en bas.
- Aucun onglet RP/Enseignant/Étudiant n'est visible nulle part.
- `/`, `/enseignant`, `/etudiant` continuent de fonctionner — les deux derniers
  affichent le shell + un placeholder propre.
- Création de séance, ouverture du drawer détail, publication : aucune
  régression fonctionnelle.
- `pnpm --filter @planit/web lint / typecheck / build` verts.
- TD-011/012/013/014 ajoutés à `docs/tech-debt.md`.
- Journal `docs/agent-journal/salim/2026-05-22-vague01-shell-realignment.md`
  rédigé après merge.

## Hors scope (rappel)

- Backend (LOT 1 fini, pas touché).
- WebSocket client (déjà fonctionnel via `useRealtimeSessions`).
- Auth / conflits réels / multi-classes / exports PDF : Vagues 02+.
- Spécialisation Sidebar pour Enseignant/Étudiant : LOT 3/4.
