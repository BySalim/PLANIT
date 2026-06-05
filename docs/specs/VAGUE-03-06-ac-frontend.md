# VAGUE-03-06 — Acteur AC (Attaché de Classe) — Frontend

> **Vague** : 03 · **LOT** : 6 · **Owner** : Oumy (`feat/oumy`) · **Date** : 2026-06-05
> **Backend** : déjà livré (B.7 — `GET /api/ac/me/scope` + scope-aware filtering dans Classes/Étudiants/Salles/Suivi/Planning).

## 1. Contexte

Le LOT 6 introduit l'**acteur AC** (`ASSISTANT_PROGRAMME`, UI = « Attaché de classe » /
**jamais « AP »**) côté frontend. Conformément à **V3-D13** (URLs role-agnostiques),
il **n'existe aucune route `/ac/…`** : l'AC est rendu sur les mêmes URLs propres
que le RP (`/`, `/planning`, `/classes`, `/etudiants`, `/suivi-modules`, etc.),
le branchement se fait **par le rôle** au runtime.

La sécurité réelle est **côté serveur** (`AcScopeService` filtre déjà les listes ;
mutations refusées 403 hors périmètre). Ce LOT est **uniquement UX** :

- Brancher le menu correct pour l'AC.
- Masquer les CTA RP-only sur les pages partagées.
- Restreindre l'écriture (planning lecture seule, pas de bouton « Terminer »).
- Rediriger gracieusement si l'AC force une URL RP-only.

## 2. Architecture front

### 2.1 Branchement par rôle (V3-D13)

- **`app/(planit)/page.tsx`** — déjà role-aware (rend `<RpPlanningView />` pour `RESPONSABLE_PROGRAMME`
  **et** `ASSISTANT_PROGRAMME`). Inchangé.
- **`app/(planit)/(gestion)/layout.tsx`** — gate déjà ouverte aux deux rôles
  (`RequireAuth roles={['RESPONSABLE_PROGRAMME', 'ASSISTANT_PROGRAMME']}`). Inchangé.
- **Nouveau route group `app/(planit)/(gestion)/(rp-only)/`** — wrapper invisible dans l'URL
  qui gate sur `RESPONSABLE_PROGRAMME` seul. On y déplace les pages qui n'existent que pour le
  RP (V3-D9 / OUT du périmètre AC) : `maquettes`, `formations`, `filieres`, `ue-modules`.
  Conséquence : un AC qui force `/maquettes` → `RequireAuth` redirige vers `/` (sa home AC),
  cf. comportement existant de `<RequireAuth>` (ligne 30 de `require-auth.tsx`).

### 2.2 Hooks transverses (nouveaux, `apps/web/src/hooks/`)

- **`useRole()`** — retourne `UserRole | null`. Sucre syntaxique au-dessus de `useAuth()`.
- **`useIsAc()` / `useIsRp()`** — booléens dérivés, pour éviter de répéter le check de string.
- **`useAcScope()`** — `useQuery` clé `['ac', 'scope']`, enabled uniquement si AC connecté.
  Source de vérité pour la page Salles (G.6) et le compteur classes du dashboard placeholder.

## 3. UX par sous-tâche

### G.1 — Rendu role-aware AC

- Home `/` rend `RpPlanningView` aussi pour AC (déjà OK). On y propage un **mode lecture seule**
  (cf. G.3).
- Route group `(rp-only)` pour les 4 pages RP-only — déplacement uniquement (URLs identiques).
- Aucun changement de `<RequireAuth>` (le comportement actuel — redirige vers `ROLE_HOME[role]`
  si rôle hors liste — couvre déjà le cas « AC qui force `/maquettes` »).

### G.2 — Menu AC (sidebar par rôle)

- Sidebar lit `useAuth()` et choisit l'une des deux constantes `NAV_RP` / `NAV_AC`.
- `NAV_AC` strict (V3-D9 — exactement ces 8 entrées, ordre conservé) :

  | Groupe       | Item              | href               | Note                           |
  | ------------ | ----------------- | ------------------ | ------------------------------ |
  | PRINCIPAL    | Tableau de bord   | `/tableau-de-bord` | placeholder                    |
  | PRINCIPAL    | Planning          | `/`                | lecture seule                  |
  | PRINCIPAL    | Suivi des modules | `/suivi-modules`   | sans « Terminer »              |
  | PRINCIPAL    | Demandes          | `/demandes`        | placeholder                    |
  | MES CLASSES  | Étudiants         | `/etudiants`       | scoped backend                 |
  | MES CLASSES  | Classes           | `/classes`         | scoped backend (+ inscription) |
  | RÉFÉRENTIELS | Enseignants       | `/enseignants`     | lecture                        |
  | RÉFÉRENTIELS | Salles            | `/salles`          | salles du RP manager           |

- Le bloc profil sidebar (actuellement hardcodé `PROFILE = { firstName: 'Aïssatou', … }`) est
  branché sur `useAuth()` (initials de `state.user.fullName`, label rôle via helper
  `roleLabel(role)`). **Fix opportuniste** : la sidebar a toujours affiché « Aïssatou Diallo —
  Responsable de programme » quel que soit le rôle connecté. C'est aussi un bug RP (faux nom
  affiché) — corrigé ici sans surcoût car on touche déjà le fichier.

### G.3 — Planning AC (lecture seule)

- Une seule prop `readOnly?: boolean` (défaut `false`) propagée par `RpPlanningView` quand le
  rôle est `ASSISTANT_PROGRAMME` :
  - `PlanningToolbar` : masque le bouton « + Nouvelle séance » et les boutons undo/redo
    (aucune action d'édition possible donc historique sans objet).
  - `PlanningGrid` : désactive drag/resize/click-vide-pour-créer (les handlers `onCreateAtSlot`
    et `onPushUndo` ne sont plus fournis).
  - `PlanningFooter` : masque le bouton « Publier les modifications » (smart-dirty hors scope AC).
  - **Inchangé** : double-clic → drawer détail (lecture), navigation semaines, export PNG/PDF
    (lecture, OK pour AC), badges et stats footer.
- Le breadcrumb « Espace RP » devient « Mon espace » quand `readOnly` (neutre, pas spécifique RP).

### G.4 — Suivi des modules AC (sans Terminer)

- La page `/suivi-modules` lit déjà `useAuth()` et désactive « Terminer / Rouvrir » et le bulk
  select pour les non-RP.
- Pour AC : on **masque** purement les CTA (au lieu de les désactiver). Le bouton « Voir » reste
  (lecture des séances du module suivi). Pas de barre bulk pour l'AC.
- Filtres et tri inchangés ; le scope est appliqué par le backend (l'AC ne voit que ses classes).

### G.5 — Étudiants + Classes (avec inscription)

- `/etudiants` — réutilisé tel quel. Pas de CTA création (déjà absent — V3-D6 : aucune création
  directe depuis cette page). Liste filtrée backend.
- `/classes` — masquer le bouton « + Nouvelle classe » et l'icône « Modifier » pour AC. Le
  bouton « Voir » est conservé.
- `/classes/[id]` — fiche conservée à l'identique. Le bouton « + Inscrire un étudiant » reste
  pour AC (autorisé par V3-D9 : inscription RP+AC partagée). La modale `<InscriptionModal>`
  est déjà conçue role-agnostic (commentaire de tête : « partagé RP + AC »).
- Erreur 403 si l'AC tente de modifier une classe hors périmètre : déjà géré par
  `<ForbiddenListener>` + flash.

### G.6 — Enseignants + Salles

- `/enseignants` — masquer les CTA « + Ajouter », « Modifier », « Supprimer » pour AC. Liste,
  pagination, recherche et bouton « Voir » conservés (lecture).
- `/salles` — **page nouvelle** :
  - AC connecté → tableau simple des salles retournées par `useAcScope()` (id + nom).
  - RP connecté → message court « Liste complète à venir (V04) ». Pour V03 on n'a pas
    d'endpoint `GET /api/salles` exposant la liste exhaustive aux RP.
  - Lecture seule pour les deux rôles. Pas de filtres en V03.

### G.7 — Placeholders Tableau de bord + Demandes

- `/tableau-de-bord` et `/demandes` — pages nouvelles, accessibles RP+AC (placeholder commun).
- Composant `<ComingSoonPlaceholder title subtitle icon>` partagé (réutilisé par les deux pages).
  Contenu : illustration légère (icône `@planit/ui` agrandie) + titre + sous-titre + retour
  optionnel vers `/`.

## 4. Décisions

- **D1 — Branchement par rôle, pas par URL** (V3-D13 confirmé). Aucune page `/ac/…`.
- **D2 — `NAV_AC` strict** (V3-D9). Ordre et groupes décidés ici (PRINCIPAL / MES CLASSES /
  RÉFÉRENTIELS), à confirmer en review si le TL préfère un autre découpage.
- **D3 — `readOnly` propagée par prop** au lieu de dupliquer `<AcPlanningView>`. Un seul
  parcours de code, tests plus simples, divergence visuelle nulle.
- **D4 — Route group `(rp-only)` plutôt que gate par page**. Une seule barrière, déplacement
  trivial, aucune URL ne change.
- **D5 — Salles RP en placeholder doux V03**. Pas d'endpoint `GET /api/salles` complet exposé
  au RP en V03 ; la page existe pour AC, l'extension RP est tracée tech-debt (`TD-V03-SALLES-RP`).
- **D6 — Fix opportuniste du `PROFILE` hardcodé sidebar** : on en profite pour le brancher sur
  `useAuth()`, car de toute façon la sidebar est modifiée pour le menu role-aware.
- **D7 — Masquer (pas désactiver) les CTA RP-only** sur les pages partagées (G.4/G.5/G.6).
  Plus propre visuellement pour l'AC ; cohérent avec ses entrées de menu strictes.

## 5. Done criteria (cf. LOT 6)

- [x] Login AC → arrive sur `/` (vue planning lecture seule)
- [x] Menu AC strictement conforme V3-D9 (8 entrées, aucune URL `/ac`)
- [x] AC ne peut **pas** créer/modifier une séance ni terminer un module
- [x] AC peut inscrire un étudiant dans une de ses classes (modale partagée)
- [x] AC ne voit que ses classes assignées et les salles de son RP (filtrage backend)
- [x] AC qui force `/maquettes` → redirigé vers `/` par `<RequireAuth>` (route group `(rp-only)`)

## 6. Hors scope (V04+)

- Vrai dashboard AC (KPIs, classes attachées, séances pending) — placeholder V03.
- Workflow Demandes (composer, suivi, statuts) — placeholder V03.
- Module Émargement (présence/absence) — V04 (présent dans le design `atc/attendance.jsx`).
- CRUD Salles complet pour RP (`/salles` côté RP) — `TD-V03-SALLES-RP`.
- Charge horaire enseignant — V04 (cf. décisions V3 globales).

## 7. Risques & contre-mesures

| Risque                                                                 | Atténuation                                                                                                               |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Casser une page RP en réorganisant `(gestion)` → `(gestion)/(rp-only)` | Les URLs sont identiques (route group invisible). Build Next vérifie le routage ; tests existants devraient rester verts. |
| `readOnly` planning bug : un slot AC déclenche encore la modale create | Tests E2E couvrent le double-clic détail vs clic vide ; revue manuelle navigateur.                                        |
| Sidebar profil casse côté RP existant                                  | Fallback : si `state.status !== 'authenticated'` → garde ancien placeholder « … ». Test snapshot du nouveau bloc.         |
| `useAcScope` boucle infinie si appelé sans gate                        | `enabled` dépend de `useIsAc()` ; tests vérifient `enabled=false` pour les autres rôles.                                  |
