# SPEC — VAGUE-01-01 · Planning RP (LOT 2)

**Vague :** 01 · **Lot officiel :** 2 (Frontend RP, tâches R.1–R.12)  
**Auteur :** Salim · **Date :** 2026-05-21 · **Statut :** Approuvée · **Branche initiale :** `feat/oumy` (base Libasse) · **Poursuite :** `feat/salim`

## Itérations LOT 2 (Salim, 2026-05-22)

> Numérotation officielle de la vague : **LOT 2** uniquement. Les anciens libellés
> « LOT 05–08 » ou specs `VAGUE-01-05`…`08` étaient erronés (réservés aux futurs
> LOT 3 Enseignant, etc.). Itérations documentées :

| Itération | Spec                                                 | Sujet                                       |
| --------- | ---------------------------------------------------- | ------------------------------------------- |
| A         | [VAGUE-01-01-a](VAGUE-01-01-a-shell-realignment.md)  | Shell PLANIT-IA, tokens, sidebar            |
| B         | [VAGUE-01-01-b](VAGUE-01-01-b-planning-fidelity.md)  | Fidélité visuelle toolbar / cartes / footer |
| C         | [VAGUE-01-01-c](VAGUE-01-01-c-planning-fullbleed.md) | Pleine page, drag (R.12 partiel)            |
| D         | [VAGUE-01-01-d](VAGUE-01-01-d-grid-interactions.md)  | 7 jours, resize, copier-coller (R.12)       |

Référence planning : `PLANIT-Strategie-VibeCode/vagues/vague-01-mvp-planning.md` (LOT 2, tâches R.1–R.12).

## Objectif

Implémenter la page `/rp` (planning hebdomadaire du Responsable Programme) sur
la stack Next.js 15, fidèle au prototype `PLANIT-IA/rp/screens/planning.jsx`
(+ `planning-canvas.jsx`, `form-modal.jsx`). Aucune copie de code UMD : on
**reprend** en JSX + TypeScript strict, branché sur la vraie API LOT 1.

## Périmètre

**IN** — composants `<PlanningGrid>` (R.2), `<SessionCard>` avec indicateur
"non publiée" (R.3), page `/rp` qui consomme B.1 (R.4), `<WeekNavigator>` (R.5),
`<StatsBar>` consommant B.7 (R.6), `<CreateSessionModal>` consommant B.2 (R.7),
`<SessionDetailDrawer>` mode édition consommant B.3 + B.4 (R.8), bouton
"Publier les modifications" consommant B.5 (R.9), boutons Exporter / Historique
/ Vue Étudiants **cachés** (R.10), scroll de la grille (R.11), actions Design
conservées (R.12).

**OUT** — gestion de conflits salle/enseignant (V1-D4), authentification
(V1-D2), flux manuel `PROVISOIRE → VALIDE → PUBLIE` (V1-D3 : seul `isPublished`
pilote l'indicateur visuel), Enseignant/Étudiant (LOTs 3 et 4), WebSocket côté
client (utilisé par LOTs 3 et 4 via `useRealtimeSessions`, optionnel sur `/rp`).

## Mapping Design → composant

| Référence Design                                    | Composant à créer       | Localisation                                                 |
| --------------------------------------------------- | ----------------------- | ------------------------------------------------------------ |
| `PLANIT-IA/rp/screens/planning.jsx`                 | page `/rp`              | `apps/web/src/app/(planit)/rp/page.tsx`                      |
| `PLANIT-IA/rp/components/planning-canvas.jsx`       | `<PlanningGrid>`        | `apps/web/src/components/planning/planning-grid.tsx`         |
| carte séance dans `planning-canvas.jsx`             | `<SessionCard>`         | `apps/web/src/components/planning/session-card.tsx`          |
| navigation semaines (haut du planning)              | `<WeekNavigator>`       | `apps/web/src/components/planning/week-navigator.tsx`        |
| stats en haut du planning                           | `<StatsBar>`            | `apps/web/src/components/planning/stats-bar.tsx`             |
| `PLANIT-IA/rp/components/form-modal.jsx` (création) | `<CreateSessionModal>`  | `apps/web/src/components/planning/create-session-modal.tsx`  |
| `form-modal.jsx` (édition) + drawer détail          | `<SessionDetailDrawer>` | `apps/web/src/components/planning/session-detail-drawer.tsx` |
| bouton "Publier" du Design                          | `<PublishButton>`       | `apps/web/src/components/planning/publish-button.tsx`        |

## Contrats consommés (depuis `@planit/contracts`)

- `sessionSchema` / `SessionDto`
- `createSessionSchema` / `CreateSessionDto`
- `updateSessionSchema` / `UpdateSessionDto`
- `weekPlanningQuerySchema` / `WeekPlanningQueryDto`
- `sessionStatsSchema` / `SessionStatsDto`
- `sessionTypeSchema` (couleur par type)

## Endpoints consommés (LOT 1)

| API                                                 | Composant                     | Quand                                |
| --------------------------------------------------- | ----------------------------- | ------------------------------------ |
| `GET /api/sessions?weekStart&classeId?` (B.1)       | `/rp` page (R.4)              | mount + changement de semaine        |
| `GET /api/sessions/stats?weekStart&classeId?` (B.7) | `<StatsBar>` (R.6)            | mount + changement de semaine        |
| `POST /api/sessions` (B.2)                          | `<CreateSessionModal>` (R.7)  | submit du formulaire                 |
| `GET /api/sessions/:id` (B.4)                       | `<SessionDetailDrawer>` (R.8) | ouverture du drawer                  |
| `PUT /api/sessions/:id` (B.3)                       | `<SessionDetailDrawer>` (R.8) | submit du formulaire d'édition       |
| `POST /api/sessions/publish` (B.5)                  | `<PublishButton>` (R.9)       | clic sur "Publier les modifications" |

## Règles UI

- **Indicateur "non publiée"** (V1-D3) : badge ou bordure distincte sur
  `<SessionCard>` dès que `session.isPublished === false`. **Aucune dépendance
  au champ `status`** côté UI.
- **Couleur de la carte** : par `session.type` (CM/TD/TP/EXAM/RATTRAP/DEVOIR/EVENT)
  via tokens `@planit/design-tokens` — pas de hex en dur.
- **Bouton "Publier les modifications"** : `disabled` par défaut, actif dès
  qu'**au moins une** séance de la semaine affichée a `isPublished === false`.
  Calcul côté client à partir des sessions chargées (pas d'appel séparé).
- **Boutons cachés** (R.10) : Exporter, Historique, Vue Étudiants — commentaire
  `// V2: <feature>` dans le code, pas de rendu DOM.
- **Loading / error states** : pendant le fetch, `<PlanningGrid>` affiche un
  skeleton aligné sur la grille jours × heures. Erreur réseau → message visible
  - bouton "Réessayer".
- **Semaine par défaut** : semaine courante (lundi UTC). Calcul via helper
  partagé dans `apps/web/src/lib/week.ts` (à créer — `Africa/Dakar = UTC+0`,
  cohérent avec la seed).

## Acteur RP "courant"

Pas d'auth en Vague 01. Le sélecteur d'acteur de la topbar (0.9) sélectionne
`/rp` ; la page consomme `B.1` sans filtre `teacherId`/`studentId` (vue globale
RP). Le seed contient 1 seul RP (`seed-rp`). Pas de `classeId` non plus par
défaut (toutes les classes).

## Décisions sensibles à arbitrer pendant l'implémentation

- **TanStack Query vs `fetch` natif + state local** (à soulever par Oumy au
  démarrage de R.4) — décision sensible (ajout de dépendance). Recommandation
  Salim : TanStack Query pour bénéficier de l'invalidation post-mutation et du
  cache de semaine, mais c'est un trade-off.
- **Drag & drop** dans le Design : implémenter en R.12 **uniquement** si
  Hello.css présent dans le proto. Sinon reporter en V2 (tracer en tech-debt).
- **Validation client** : `zodResolver` + react-hook-form ou validation manuelle ?
  Aligner avec ce qui existe déjà dans `apps/web` (rien pour l'instant).

## Definition of Done

- `/rp` affiche les 6 séances seed avec le bon style et couleurs par type
- Créer une séance via la modal → elle apparaît immédiatement avec l'indicateur
  "non publiée"
- Modifier une séance (drawer) → elle repasse en "non publiée"
- Bouton "Publier les modifications" : `disabled` quand 0 pending, actif sinon
- Clic sur "Publier" → toutes les séances passent à publiées, indicateurs
  disparaissent, bouton se désactive
- Boutons Exporter / Historique / Vue Étudiants cachés
- Aucune erreur console
- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test` verts en local

## Hors scope (rappel)

Ces points sont gérés ailleurs et ne doivent **pas** être touchés sur cette
spec :

- Authentification réelle → Vague 02
- Conflits salle/enseignant → Vague 02
- WebSocket client `useRealtimeSessions` → LOTs 3 et 4 (Enseignant/Étudiant)
- Exports PDF/iCal → Vague 03
- Multi-classes / multi-enseignants par étudiant → Vague 02
