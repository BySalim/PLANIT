# Journal d'agent — Vague 01 · LOT 05 (Shell + Planning RP realignment)

**Date :** 2026-05-22
**Membre :** Salim Ouedraogo (`feat/salim`)
**Slug :** `vague01-shell-realignment`
**Durée :** 1 session Claude Code (Sonnet 4.6).
**Statut :** Code livré, build/lint/typecheck verts, vérifié visuellement.
PR vers `develop` en attente d'arbitrage.

---

## Directives reçues

- Revue UI du LOT 2 (Libasse) côté `/rp` côte-à-côte avec
  `PLANIT-IA/rp/screens/planning.jsx`. Deux écarts critiques :
  1. Topbar contient un **switcher d'acteur** (`RP / Enseignant / Étudiant`)
     qui court-circuite l'URL et n'a pas d'équivalent dans le proto Design.
  2. **Shell improvisé** : pas de sidebar, layout simple `max-w-6xl`. Tokens
     couleur eux-mêmes divergents (`#593114` au lieu de `#6B2D0E`).
- Décisions cadrées avec l'utilisateur :
  - Owner exceptionnel : Salim (TL) sur `feat/salim`. Libasse a déjà livré
    LOT 2 ; on évite la passe-de-bras.
  - **Switcher supprimé totalement** — URL = seule source de vérité.
  - Portée : **shell complet + planning RP réaligné**. Pages secondaires
    (Dashboard, Suivi, etc.) ne sont **pas** implémentées (sidebar liste +
    `href="#"`).

---

## Décisions techniques

| Décision                                                            | Justification                                                                                                                                                                |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sidebar dark theme par défaut                                       | Le proto offre dark + light ; le dark est plus distinctif et c'est ce qu'a choisi `direction/components/shell.jsx`. Cohérent inter-acteurs.                                  |
| Pas de drag-resize sidebar V1 (largeur fixe 248px)                  | Le proto utilise `useState + onMouseDown` + event listeners. Trop de surface complexe pour V1 sur du UMD non-React. Tracé TD-012, migration Vague 02.                        |
| Onglets `Classique/Classe/Salle/Prof` visibles mais 3/4 disabled    | Préserve la cohérence visuelle avec le proto sans devoir implémenter 3 vues supplémentaires. Tooltip "Disponible Vague 02". TD-011.                                          |
| Icônes inline SVG ajoutées à `packages/ui`                          | Aucune nouvelle dépendance npm. Pattern existant (`@planit/ui` exposait déjà 22 icônes). Ajouté 13 icônes manquantes (`InboxIcon`, `LayersIcon`, etc.). TD-013 trace Lucide. |
| `<Shell>` composant, pas dans le `layout.tsx`                       | Chaque page définit son propre `title / breadcrumb / activeNavId` (besoins différents `/rp` vs `/enseignant`). Le `layout.tsx` ne porte plus que `QueryProvider`.            |
| Couleur SessionCard reste par `type` (CM/TD/TP/EXAM)                | Le contrat `ModuleRef` n'a pas de `color`. Garder la palette par type évite de toucher `packages/contracts` (zone sensible). TD-015 ouvre la voie pour la palette module.    |
| Jours fériés hardcodés dans `apps/web/src/lib/holidays.ts`          | V1 démo only. Pas de table BD pour la disponibilité salle/calendrier scolaire. TD-016 pour exposer une API.                                                                  |
| Stats footer affiche `provisoires` (au lieu de `validées` du proto) | V1-D3 supprime le workflow `PROVISOIRE→VALIDE→PUBLIE`. `pending` du backend = "provisoires" pour l'utilisateur. Restera ainsi tant que le workflow n'est pas câblé.          |
| Topbar `PROFILE_INITIALS = 'AD'` hardcodé                           | V1 sans auth (V1-D2). On affiche un avatar fictif (Aïssatou Diallo). Vague 02 = vrai user via `useSession`.                                                                  |
| `subtitle?: string \| undefined` dans tous les props optionnels     | `exactOptionalPropertyTypes: true` dans tsconfig refuse `subtitle: undefined` sur `subtitle?: string`. Ajout du `\| undefined` est plus simple qu'un spread conditionnel.    |

---

## Décisions soumises à validation (validées avant code)

Posées via `AskUserQuestion` en plan mode :

- **Owner** : Salim sur `feat/salim` (au lieu d'Oumy ou Libasse) ✅
- **Portée** : `Shell + planning RP réaligné` (au lieu de `shell seul` ou `big bang`) ✅
- **Switcher** : `supprimé totalement` (au lieu de page d'accueil ou sidebar) ✅

Pas d'autres arbitrages sensibles déclenchés (aucune nouvelle dépendance npm,
pas de touche `prisma/schema.prisma`, pas de modif `packages/contracts/`).

---

## Modifications effectuées

### Tokens couleur (Phase 1)

- [apps/web/src/app/globals.css](../../../apps/web/src/app/globals.css) :
  alignement complet sur `PLANIT-IA/shared/tokens.js` (`#6B2D0E / #E8620A` +
  toutes les déclinaisons). Ajout du bloc sidebar dark
  (`--color-sb-dark*`).
- [packages/design-tokens/src/colors.ts](../../../packages/design-tokens/src/colors.ts) :
  synchronisé. Ajout `sbDark`, `sbDark2`, `sbDarkText`, `sbDarkMuted`.
- [packages/ui/src/icons/index.tsx](../../../packages/ui/src/icons/index.tsx) :
  constantes `BRAND_MARRON / BRAND_ORANGE` recalées sur les nouvelles valeurs
  - 13 nouvelles icônes inline SVG (`InboxIcon`, `AlertTriangleIcon`,
    `LayersIcon`, `UserCogIcon`, `DoorIcon`, `UsersIcon`, `GraduationCapIcon`,
    `BookStackIcon`, `MessageCircleIcon`, `ChevronDownIcon`, `SearchIcon`,
    `PlusIcon`, `CheckSquareIcon`).

### Shell (Phase 2)

- [apps/web/src/components/layout/sidebar.tsx](../../../apps/web/src/components/layout/sidebar.tsx) :
  **nouveau**. Aside 248px sticky h-screen, fond `bg-sb-dark`. 4 sections
  collapsibles (PRINCIPAL · OFFRE DE FORMATION · RÉFÉRENTIELS · CONSULTATION).
  Logo gradient marron→orange. Profil utilisateur fictif + bouton Paramètres
  en bas. Item actif marqué par barre orange 3px + bg accent/15.
- [apps/web/src/components/layout/topbar.tsx](../../../apps/web/src/components/layout/topbar.tsx) :
  **réécriture complète**. Plus aucun onglet acteur. Breadcrumb + titre Poppins
  20px + sous-titre optionnel + recherche centrale (visuelle V1) + boutons
  conflits/demandes/notifs/avatar à droite.
- [apps/web/src/components/layout/shell.tsx](../../../apps/web/src/components/layout/shell.tsx) :
  **nouveau**. Wrapper Sidebar + Topbar + `<main>` qu'on instancie sur chaque
  page avec ses propres props.
- [apps/web/src/app/(planit)/layout.tsx](<../../../apps/web/src/app/(planit)/layout.tsx>) :
  vidé de son `<Topbar />` + wrapper `max-w-6xl`. Ne porte plus que
  `<QueryProvider>`.

### Planning components (Phase 3)

- [apps/web/src/components/planning/session-card.tsx](../../../apps/web/src/components/planning/session-card.tsx) :
  **refonte** au format `CourseCard` du proto. Affiche `module.name` en bold
  - classe pill + heures + durée + prof (icon UserSmall) + salle (icon MapPin)
  - badge catégorie (COURS / ÉVAL / ÉVÉN.) en bas droite. Conserve l'indicateur
    pointillé "Non publiée" pour `!isPublished` (V1-D3).
- [apps/web/src/components/planning/holiday-banner.tsx](../../../apps/web/src/components/planning/holiday-banner.tsx) :
  **nouveau**. Affiche les jours fermés de la semaine si la liste hardcodée
  contient une date matchante.
- [apps/web/src/components/planning/view-mode-tabs.tsx](../../../apps/web/src/components/planning/view-mode-tabs.tsx) :
  **nouveau**. 4 onglets ; seul "Classique" est `enabled`.
- [apps/web/src/lib/holidays.ts](../../../apps/web/src/lib/holidays.ts) :
  **nouveau**. Liste hardcodée + helper `getWeekHolidays(weekStart)`.
- [apps/web/src/lib/week.ts](../../../apps/web/src/lib/week.ts) : ajout
  `getWeekNumber()` (ISO week).
- [apps/web/src/components/planning/stats-bar.tsx](../../../apps/web/src/components/planning/stats-bar.tsx) :
  **réécriture** → exporte `PlanningFooter`. Stats à gauche, actions
  (Historique/Exporter/Aperçu étudiant/Publier) à droite. PublishButton intégré.
- [apps/web/src/components/planning/publish-button.tsx](../../../apps/web/src/components/planning/publish-button.tsx) :
  label "Publier la semaine (N)" (au lieu de "Publier les modifications").
- [apps/web/src/components/planning/week-navigator.tsx](../../../apps/web/src/components/planning/week-navigator.tsx) :
  enrichi avec chip `Cette semaine` (icône CalendarIcon) + numéro de semaine
  ISO (`S<n>`) sous la plage de dates.

### Pages

- [apps/web/src/app/(planit)/rp/page.tsx](<../../../apps/web/src/app/(planit)/rp/page.tsx>) :
  utilise `<Shell title breadcrumb activeNavId>`. Toolbar haut (WeekNavigator
  - ViewModeTabs + "+ Nouvelle séance"). HolidayBanner conditionnelle. Grid.
    Footer.
- [apps/web/src/app/(planit)/enseignant/page.tsx](<../../../apps/web/src/app/(planit)/enseignant/page.tsx>) /
  [etudiant/page.tsx](<../../../apps/web/src/app/(planit)/etudiant/page.tsx>) :
  wrappées dans `<Shell>` avec breadcrumb propre. Placeholder "Bientôt disponible".

### Specs / TD / annexes

- [docs/specs/VAGUE-01-05-shell-realignment.md](../../specs/VAGUE-01-05-shell-realignment.md) :
  nouvelle spec.
- [docs/tech-debt.md](../../tech-debt.md) : 6 nouvelles entrées TD-011 à TD-016.

---

## Résultats CHECK

```bash
pnpm --filter @planit/web lint        # ✓ No ESLint warnings or errors
pnpm --filter @planit/web typecheck   # ✓ 0 erreurs
pnpm --filter @planit/web build       # ✓ Compiled successfully in 17.0s
                                       # 8 static pages générées
```

**Vérification visuelle** (preview server `http://localhost:3002`, viewport 1440×900) :

- `/rp` : sidebar dark à gauche (logo + 4 sections + profil + paramètres),
  topbar (breadcrumb "Espace RP / Planning" + titre "Planning hebdomadaire"
  - recherche + avatar "AD"), toolbar (Cette semaine + dates + S<n> + tabs
    modes de vue + bouton "+ Nouvelle séance"), footer avec stats + actions.
    ✅ Aucun onglet RP/Enseignant/Étudiant visible.
- `/enseignant` : shell affiché, breadcrumb "Espace Enseignant", placeholder.
  ✅
- Backend Postgres down localement → message "Backend indisponible. Démarre
  Docker puis recharge." s'affiche au bon endroit (PlanningGrid error state +
  PlanningFooter error fallback). C'était l'objet de TD-fallback amélioré.
- Pages /enseignant et /etudiant typecheck-passent même sans `'use client'`
  (composants serveurs, le Shell est server-compatible car Sidebar/Topbar sont
  les seuls `'use client'`).

Non testé en local (Docker down) : flow CRUD séances + publish, WebSocket
broadcast. Ces flows sont **non régressés** (les composants `<CreateSessionModal>`,
`<SessionDetailDrawer>`, `<PublishButton>` ne sont pas touchés sauf le label).

---

## Surprises

1. **`exactOptionalPropertyTypes: true`** dans le tsconfig partagé rejette
   `<Topbar subtitle={undefined} />` quand le prop est typé `subtitle?: string`.
   Il faut taper `subtitle?: string | undefined`. Petite friction TypeScript
   strict — à documenter pour les futurs membres.
2. **Port 3000 occupé par le dev server du user** lors du démarrage preview ;
   le preview MCP est passé en `autoPort: true` et a sélectionné le port 3002
   sur lequel Next.js a effectivement démarré (3000=user, 3001=backend, 3002=web preview).
3. **`@planit/ui` consommé en source** (pas de build step) — modifier les
   icônes/tokens est immédiatement visible côté apps/web sans `pnpm build`.
   Convention saine, on garde.
4. **`'use client'` n'est plus dans la page `/rp`** — wait, **si** : `<Shell>`
   contient `<Topbar>` qui est client, mais le composant Shell lui-même est
   serveur. Il faut que la page le wrappe en `'use client'` à cause de
   `useState` (createOpen, weekStart, etc.). C'est ce que fait la page.

---

## Suite

- **Avant merge** : créer la PR `feat(web): vague 01 LOT 05 - shell + planning realignment` vers `develop`.
- **À noter dans la PR** : changement des tokens de couleur — si Libasse a
  des screenshots locaux avec l'ancienne palette `#593114`, ils seront à
  refaire.
- **TD ouverts** : TD-011 (modes de vue Classe/Salle/Prof), TD-012 (drag-resize
  sidebar), TD-013 (migration Lucide), TD-014 (recherche topbar), TD-015
  (palette par module), TD-016 (jours fériés via API). Tous targetés Vague 02.
- **Pour LOT 3 (Enseignant) et LOT 4 (Étudiant)** : pourront réutiliser
  `<Shell>` tel quel. Spécialiser la sidebar avec un prop `role` pour afficher
  une nav adaptée. La structure actuelle (V1) montre la nav RP pour tous, ce
  qui est OK pour démo.

---

## Mises à jour annexes

- `PLANIT-Strategie-VibeCode/vagues/vague-01-mvp-planning.md` : à mettre à
  jour avec une ligne LOT 05 pointant vers la spec. **Non fait** dans cette
  session (fichier hors repo, à coordonner avec un commit séparé sur le repo
  stratégie).
- README.md (root et `apps/backend/`) : pas de modif requise (la stack et
  les commandes ne changent pas).
- ADR : pas de nouvel ADR — les choix faits sont compatibles avec
  ADR-0001/0002/0003.
