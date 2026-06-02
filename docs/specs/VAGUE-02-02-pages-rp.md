# SPEC — VAGUE-02-02 · Pages RP Enseignants / UE-Modules / Filières (LOT 5)

**Vague :** 02 · **Lot officiel :** 5 (Frontend RP — pages entités, tâches P.1–P.5)
**Auteur :** Libasse (micro-spec visuelle) + Salim (relecture) · **Date :** 2026-05-26 · **Statut :** Approuvée · **Branche :** `feat/salim` (spec) puis `feat/libasse` (implémentation)

> Référence planning : `PLANIT-Strategie-VibeCode/vagues/vague-02-lots.md` (LOT 5, tâches P.1–P.5).
> Décisions structurelles : `vague-02-index.md` (V2-D9, V2-D14).

---

## Objectif

Livrer côté RP les **3 pages CRUD** sur les entités métier introduites en LOT 2 backend : Enseignants, UE & Modules, Filières. Ajout de la **navigation latérale RP étendue** (4 entrées au lieu de 1). Pas de Figma — wireframes ASCII, alignés sur les tokens et primitives UI déjà livrées en V01.

L'objectif n'est **pas** de livrer la page de détail Module (V03, V2-D14) ni les fonctionnalités enseignants/AC enrichies (V03+).

---

## Périmètre

**IN** :

- `/rp/enseignants` (P.2) — liste + ajout + édition + suppression
- `/rp/ue-modules` (P.3) — accordéon UE + ajout module via `+` UE + édition UE et Module
- `/rp/filieres` (P.4) — liste + ajout + édition + suppression
- Navigation latérale RP étendue (P.5) — 4 entrées : Planning, Enseignants, UE & Modules, Filières

**OUT** :

- Page détail Module (V03, V2-D14)
- UI admin Settings (`dayStartHour`, `dayEndHour`) — V03
- Import en masse (CSV) — V03
- Pagination si volumétrie seed < 20 (V2-D14)
- Filtres si non justifiés par la seed (V2-D14)

---

## Mapping route ↔ fichier

| Route             | Fichier                                             | Composants principaux                                     |
| ----------------- | --------------------------------------------------- | --------------------------------------------------------- |
| `/rp/enseignants` | `apps/web/src/app/(planit)/rp/enseignants/page.tsx` | `<EnseignantsList>`, `<EnseignantFormModal>`              |
| `/rp/ue-modules`  | `apps/web/src/app/(planit)/rp/ue-modules/page.tsx`  | `<UEAccordionList>`, `<UEFormModal>`, `<ModuleFormModal>` |
| `/rp/filieres`    | `apps/web/src/app/(planit)/rp/filieres/page.tsx`    | `<FilieresList>`, `<FiliereFormModal>`                    |
| Sidebar           | `apps/web/src/components/layout/sidebar.tsx`        | Patch : ajouter 3 entrées de menu                         |

---

## Contrats consommés (depuis `@planit/contracts/entities`)

- `enseignantSchema` / `EnseignantDto`, `createEnseignantSchema`, `updateEnseignantSchema`, `enseignantStatutSchema` (`PERMANENT` | `VACATAIRE` | `INVITE`)
- `ueSchema` / `UEDto` (avec `modules: ModuleDto[]`), `createUeSchema`, `updateUeSchema`
- `moduleSchema` / `ModuleDto`, `createModuleSchema`, `updateModuleSchema`
- `filiereSchema` / `FiliereDto`, `createFiliereSchema`, `updateFiliereSchema`, `gradeSchema` (`LICENCE` | `MASTER`)

---

## Endpoints consommés (LOT 2 backend)

| API                                       | Page                                | Quand                                 |
| ----------------------------------------- | ----------------------------------- | ------------------------------------- |
| `GET /api/enseignants`                    | `/rp/enseignants`                   | mount                                 |
| `POST /api/enseignants`                   | modal create                        | submit                                |
| `PUT /api/enseignants/:id`                | modal edit                          | submit                                |
| `DELETE /api/enseignants/:id`             | confirm delete                      | confirm                               |
| `GET /api/ues` (avec `modules` imbriqués) | `/rp/ue-modules`                    | mount                                 |
| `POST /api/ues`                           | modal create UE                     | submit                                |
| `PUT /api/ues/:id`                        | modal edit UE                       | submit                                |
| `DELETE /api/ues/:id`                     | confirm delete UE                   | confirm (refusé si modules présents)  |
| `POST /api/ues/:ueId/modules`             | modal create Module (depuis `+` UE) | submit                                |
| `PUT /api/modules/:id`                    | modal edit Module                   | submit                                |
| `DELETE /api/modules/:id`                 | confirm delete Module               | confirm (refusé si séances présentes) |
| `GET /api/filieres`                       | `/rp/filieres`                      | mount                                 |
| `POST /api/filieres`                      | modal create                        | submit                                |
| `PUT /api/filieres/:id`                   | modal edit                          | submit                                |
| `DELETE /api/filieres/:id`                | confirm delete                      | confirm                               |

Tous guardés `RESPONSABLE_PROGRAMME` côté serveur.

---

## Wireframes ASCII

### Sidebar — état après P.5

```
┌──────────────────────────┐
│  PLANIT          [logo]  │
├──────────────────────────┤
│  🗓  Planning            │  ← actif sur /rp
│  👤  Enseignants         │  ← P.2
│  📚  UE & Modules        │  ← P.3
│  🎓  Filières            │  ← P.4
├──────────────────────────┤
│         [avatar]         │  ← topbar V01 (LOT 6 livré)
│       Aminata D.         │
│       [Déconnexion]      │
└──────────────────────────┘
```

Icônes depuis `packages/ui/src/icons/` (existantes ou à ajouter — Libasse confirme à la livraison).

---

### Page `/rp/enseignants` (P.2)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Enseignants                                       [+ Ajouter]     │
├─────────────────────────────────────────────────────────────────────┤
│  Statut: [Tous ▼]   Spécialité: [Toutes ▼]   Recherche: [______]   │  ← filtres activés UNIQUEMENT si seed ≥ 20 (V2-D14)
├─────────────────────────────────────────────────────────────────────┤
│  Nom complet         Email institutionnel  WhatsApp     Statut     │
│  ─────────────────── ─────────────────────  ──────────  ─────────  │
│  M. Oumar Ndiaye     oumar.ndiaye@…         +221 77 …   Permanent  │  [✏️] [🗑]
│  Mme Fatou Sall      fatou.sall@…           +221 77 …   Permanent  │  [✏️] [🗑]
│  M. Mamadou Ba       mamadou.ba@…           +221 77 …   Vacataire  │  [✏️] [🗑]
│  …                                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

**Modal `<EnseignantFormModal>` (create / edit)** :

```
┌─ Nouvel enseignant ─────────────────┐
│                                     │
│  Nom complet *                      │
│  [____________________________]     │
│                                     │
│  Email institutionnel *             │
│  [____________________________]     │
│                                     │
│  WhatsApp                           │
│  [+221 __________________]          │
│                                     │
│  Statut *                           │
│  ( ) Permanent                      │
│  ( ) Vacataire                      │
│  ( ) Invité                         │
│                                     │
│  Spécialité                         │
│  [____________________________]     │
│                                     │
│            [Annuler]  [Enregistrer] │
└─────────────────────────────────────┘
```

**Delete** : `confirm()` natif acceptable V02, modal de confirmation custom en V03 si besoin. Si l'API renvoie 409 (enseignant référencé par une séance), flash error « Cet enseignant est utilisé par N séances et ne peut pas être supprimé ».

---

### Page `/rp/ue-modules` (P.3)

```
┌──────────────────────────────────────────────────────────────────────┐
│  UE & Modules                                       [+ Ajouter UE]  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ▼ 🔵 ALGO-UE  Algorithmique & Structures           [✏️ Éditer UE]  │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  🔷 ALGO   Algorithmique Avancée              [✏️]  [🗑]      │ │
│  │  🔷 DSTR   Structures de Données              [✏️]  [🗑]      │ │
│  │                                                                │ │
│  │                                              [+ Ajouter module]│ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ▶ 🟢 DATA-UE  Données & Systèmes                   [✏️ Éditer UE]  │
│                                                                      │
│  ▶ 🟠 NET-UE   Réseaux & Sécurité                   [✏️ Éditer UE]  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

- `▼ / ▶` : accordéon expand/collapse. Tous repliés au mount par défaut. État expand mémorisé en localStorage (clé `rp:ue-accordion`).
- Pastille colorée à gauche du code UE = `ue.color`.
- Pastille colorée à gauche du code Module = `module.color`. Cette couleur est celle utilisée par les séances du module sur le planning RP (V2-D9).
- Le bouton `+ Ajouter module` est rendu **uniquement à l'intérieur d'une UE dépliée** (pas de raccourci global). Cohérent avec V2-D14 (« on ajoute le module seulement à partir de son UE »).

**Modal `<UEFormModal>` (create / edit)** :

```
┌─ UE ────────────────────────────────┐
│                                     │
│  Code *                             │
│  [_______________________]          │
│                                     │
│  Libellé *                          │
│  [____________________________]     │
│                                     │
│  Couleur *                          │
│  [🔴][🟠][🟡][🟢][🔵][🟣]…          │  ← palette restreinte 12 couleurs (cf. ci-dessous)
│                                     │
│            [Annuler]  [Enregistrer] │
└─────────────────────────────────────┘
```

**Modal `<ModuleFormModal>` (create / edit)** :

```
┌─ Module (UE: ALGO-UE) ──────────────┐
│                                     │
│  Code *                             │
│  [_______________________]          │
│                                     │
│  Libellé *                          │
│  [____________________________]     │
│                                     │
│  Couleur *                          │
│  [🔴][🟠][🟡][🟢][🔵][🟣]…          │
│                                     │
│            [Annuler]  [Enregistrer] │
└─────────────────────────────────────┘
```

**Palette restreinte (12 couleurs prédéfinies)** — décision Libasse à acter à l'implémentation :

```
Bleu       #2563EB  #1D4ED8  #3B82F6
Vert       #059669  #047857  #10B981
Orange     #D97706  #B45309  #F59E0B
Rouge      #DC2626  #B91C1C  #EF4444
```

Pas de full color picker (sur-engineering, V02-risks). Palette extensible en V03 si demande utilisateur.

**Delete UE** : refusé si modules présents → flash error « Supprimez d'abord les N modules de cette UE ». Delete module : refusé si séances présentes → flash error idem.

---

### Page `/rp/filieres` (P.4)

```
┌──────────────────────────────────────────────────────────────────────┐
│  Filières                                          [+ Ajouter]      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  GLRS                                                          │ │
│  │  Génie Logiciel Réseaux et Système                             │ │
│  │  [Licence]                                       [✏️]  [🗑]   │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  GL                                                            │ │
│  │  Génie Logiciel                                                │ │
│  │  [Master]  [Double diplôme]                      [✏️]  [🗑]   │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

Affichage cards (vs table) car peu d'attributs par ligne et le badge double-diplôme se voit mieux ainsi.

**Modal `<FiliereFormModal>` (create / edit)** :

```
┌─ Filière ───────────────────────────┐
│                                     │
│  Sigle *                            │
│  [_______]      ex: GLRS            │
│                                     │
│  Libellé *                          │
│  [____________________________]     │
│  ex: Génie Logiciel Réseaux …       │
│                                     │
│  Grade *                            │
│  ( ) Licence                        │
│  ( ) Master                         │
│                                     │
│  [ ] Double diplôme                 │
│                                     │
│            [Annuler]  [Enregistrer] │
└─────────────────────────────────────┘
```

---

## Composants UI à réutiliser

Tous déjà livrés en V01 (`apps/web/src/components/ui/`) :

- `<Modal>` (`modal.tsx`) — base des 3 modals create/edit
- `<Button>` (`button.tsx`) — actions primary/secondary/destructive
- `<Input>` (`input.tsx`) — text fields
- `<Select>` (`select.tsx`) — pour les enums (statut, grade)
- `<FormField>` (`form-field.tsx`) — wrapper label + erreur sous l'input
- `<ToastProvider>` / `useToast()` — base des flash messages (V01) ; sera étendu en LOT 4 avec variantes warning/error explicites (`<Flash>` V02-D12). Pour P.2-P.4, utiliser le toast V01 en attendant le composant final ; bascule en LOT 4 si livré avant

**Nouveau** :

- `<ColorPalettePicker>` — `apps/web/src/components/ui/color-palette-picker.tsx`, 12 swatches en grille 3x4, props `{ value, onChange, palette }`. Réutilisable UE et Module.
- `<Accordion>` — `apps/web/src/components/ui/accordion.tsx` — léger (state local + transition CSS). Si une lib existe déjà côté V01 (à vérifier), Libasse réutilise.

---

## États / props (signatures)

```ts
type EnseignantFormModalProps = {
  open: boolean;
  onClose: () => void;
  enseignant?: EnseignantDto; // undefined = create
  onSaved?: (enseignant: EnseignantDto) => void;
};

type UEFormModalProps = {
  open: boolean;
  onClose: () => void;
  ue?: UEDto;
  onSaved?: (ue: UEDto) => void;
};

type ModuleFormModalProps = {
  open: boolean;
  onClose: () => void;
  ue: UEDto; // toujours requis (un module appartient à une UE)
  module?: ModuleDto; // undefined = create
  onSaved?: (module: ModuleDto) => void;
};

type FiliereFormModalProps = {
  open: boolean;
  onClose: () => void;
  filiere?: FiliereDto;
  onSaved?: (filiere: FiliereDto) => void;
};

type ColorPalettePickerProps = {
  value: string;
  onChange: (color: string) => void;
  palette?: string[]; // defaults to PLANIT_PALETTE constant
};
```

---

## Stack libs (cohérent V01 + LOT 6)

- `react-hook-form` + `@hookform/resolvers/zod` (V01)
- TanStack Query : `useQuery(['enseignants'])`, `useQuery(['ues'])`, `useQuery(['filieres'])`, `useMutation` pour create/update/delete avec invalidation des queries impactées
- Tous les fetches passent par `apps/web/src/lib/api.ts` (V01) qui gère déjà les cookies, le refresh 401, et le `/api` prefix (LOT 6 livré)

---

## Décisions sensibles à arbitrer pendant l'implémentation

| Sujet                                                                | Recommandation                                                                                                                   | Qui décide                               |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Liste tabulaire vs cards pour `/rp/enseignants`                      | Tabulaire (5 colonnes lisibles ; cards si Libasse préfère pour cohérence visuelle)                                               | Libasse                                  |
| Lib accordion pour UE                                                | Custom léger (state + CSS) — pas de Radix/Headless UI ajouté pour ça                                                             | Libasse                                  |
| Palette couleurs : 12 fixes vs full picker                           | **12 fixes** (recommandé, V02-risks tracé) ; full picker en V03 si demande                                                       | Libasse                                  |
| Confirmation delete : `confirm()` natif vs modal custom              | `confirm()` natif V02 ; modal custom V03                                                                                         | Libasse                                  |
| État accordion (replié/déplié) : localStorage vs URL                 | localStorage (clé `rp:ue-accordion`) — URL trop bruyant                                                                          | Libasse                                  |
| Filtres `/rp/enseignants` : afficher dès maintenant ou conditionnels | Conditionnels (si seed retourne ≥ 20 enseignants), V2-D14                                                                        | Libasse (à confirmer à l'implémentation) |
| Couleur du Module : optionnelle (hérite UE) vs requise               | **Requise** — cohérent V2-D9 (« couleur module = couleur de ses séances »). UE et Module ont chacun leur couleur, pas d'héritage | Salim (acté)                             |

---

## Definition of Done (P.1 → P.5)

**Fonctionnel** :

- `/rp/enseignants` : liste affichée, ajout / édition / suppression fonctionnels avec flash succès. Tentative de suppression d'un enseignant référencé par une séance → flash error explicite
- `/rp/ue-modules` : accordéon par UE, ajout d'une UE et d'un module (via `+` UE) fonctionne. Édition UE et Module fonctionnent. Suppression UE refusée si modules présents, suppression Module refusée si séances présentes
- Couleur d'un Module mise à jour → la prochaine séance créée avec ce Module sur `/rp` affiche la nouvelle couleur sur sa `<SessionCard>`
- `/rp/filieres` : liste avec badges grade/double-diplôme, CRUD fonctionnel
- Sidebar : 4 entrées visibles côté RP, active state correct sur la route courante

**Qualité** :

- Aucune erreur console
- `pnpm lint`, `pnpm typecheck`, `pnpm test --filter=web`, `pnpm build` verts en local
- Test unitaire `<ColorPalettePicker>` (sélection, change handler)
- Tests d'intégration page (`@testing-library`) : 1 happy path par page (load + create) — total 3 tests

**Documentation** :

- Journal d'agent Libasse `docs/agent-journal/libasse/YYYY-MM-DD-vague02-lot5.md` rédigé en fin de LOT
- `tech-debt.md` mis à jour si des points sont remis à V03 (full color picker, modal de confirmation, pagination, filtres)

---

## Hors scope (rappel)

- ❌ Page détail Module (V03, V2-D14)
- ❌ UI admin Settings (`dayStartHour`, `dayEndHour`) — V03
- ❌ Import CSV en masse — V03
- ❌ Édition multi-attributs en ligne (inline editing dans la table) — V03 si besoin
- ❌ Affichage des classes par filière — V03
- ❌ Drag&drop pour réordonner UE / Module — V03 si besoin
