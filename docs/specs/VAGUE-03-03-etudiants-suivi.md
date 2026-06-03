# VAGUE-03-03 — Pages Étudiants + Suivi des modules

> **Statut** : IN PROGRESS (Libasse, 2026-06-03)
> **Périmètre** : LOT 5 V03 (E.1→E.5) — pris **en renfort** par Libasse avec accord Salim/Oumar (Oumar restant sur LOTs 1/2/6 backend)
> **Réf design** : `PLANIT-Design/rp/screens/students.jsx` + `PLANIT-Design/rp/screens/suivi-modules.jsx`
> **Backend** : LOT 2 V03 mergé — endpoints `/api/etudiants`, `/api/etudiants/:id`, `/api/suivi-modules`, `/api/suivi-modules/:id/seances`, `PATCH /api/suivi-modules/:id/(terminer|rouvrir)`
> **Spec V03 source** : `vague-03-lots.md` § LOT 5

---

## Décisions structurelles V03 héritées

- **V3-D9** RBAC : pages Étudiants + Suivi accessibles **RP + AC** (AC scopé à ses classes côté backend). Le frontend ne filtre rien — il consomme ce que le backend renvoie.
- **V3-D13** : URLs role-agnostiques. Les pages vivent dans `(planit)/(gestion)/` — pas de préfixe `/rp/`.
- **V3-D6** Étudiants : **lecture/recherche seule**. Pas de création directe (l'inscription se fait depuis la page Classes, LOT 4). On retire donc le bouton « Inscrire un étudiant » présent dans le design.
- **V3-D7** Inscriptions : N inscriptions par étudiant (multi-année + double-diplôme). L'historique chronologique est servi par `EtudiantDetailDto.inscriptions`.
- **V3-D8** Suivi : tout dérivé (heuresFaites + progression + enseignants) sauf `estTermine`. Le bouton « Terminer/Rouvrir » est **RP only** (le backend renverra 403 pour AC).

---

## Layout général

```
┌──────────────────────────────────────────────────────────┐
│ Shell (sidebar gestion + topbar role-aware)              │
│ ┌──────────────────────────────────────────────────────┐ │
│ │  Header : titre + breadcrumb                          │ │
│ ├──────────────────────────────────────────────────────┤ │
│ │  Toolbar : search + filtres                            │ │
│ ├──────────────────────────────────────────────────────┤ │
│ │  Table / Cards (skeleton → données → empty state)      │ │
│ └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
+ Drawer latéral droit (fiche étudiant / séances) au clic
```

Pages **non master-detail** (≠ Maquettes M.2) : liste pleine largeur,
détail dans un drawer latéral. Un seul drawer à la fois.

---

## E.2 — Page Étudiants (`/etudiants`)

### Toolbar

- **Recherche** (`<SearchInput>` débouncé 250 ms, largeur ~320 px) — filtre
  sur `nomComplet`, `email`, `matricule` (backend `?q=`)
- **Filtre classe** (select dropdown) : « Toutes les classes » + liste des
  classes de la BD (réutilise `useClassesQuery()` LOT 4 si dispo, sinon
  on filtre côté client à partir des `inscriptions` des étudiants
  retournés — tech-debt si besoin)
- **PAS** de bouton « + Inscrire » (V3-D6, divergence vs design assumée)

### Table

5 colonnes :

| Colonne   | Source                            | Notes                                                                        |
| --------- | --------------------------------- | ---------------------------------------------------------------------------- |
| Étudiant  | `nomComplet` + initiales (avatar) | Avatar hash-coloré (réutilise palette d'`enseignants` page)                  |
| Matricule | `matricule` (nullable)            | Police mono ; `—` si null                                                    |
| Email     | `email`                           | Truncate avec `title` tooltip                                                |
| Classe(s) | dernière inscription / chip       | Calculé côté client à partir de la 1ʳᵉ inscription si dispo ; `Aucune` sinon |
| Voir      | bouton « Voir »                   | Ouvre `EtudiantDetailDrawer`                                                 |

- **Skeleton** : 5-8 lignes en pulse pendant `isLoading`
- **Empty state** : `<EmptyState>` centré avec message « Aucun étudiant trouvé »
- **Pagination** : pas de pagination V1 (la seed est petite, le backend
  retourne tout). Tech-debt à tracer si la volumétrie monte.
- **Sticky header** sur la table

### Endpoint consommé

```
GET /api/etudiants?q=<query>
→ EtudiantDto[]
```

### Détail : la classe affichée par ligne

L'endpoint `GET /api/etudiants` retourne uniquement `EtudiantDto` (sans
inscriptions). Pour afficher la classe sans une 2ᵉ requête par étudiant,
**deux options** :

1. **MVP** : afficher uniquement nom/matricule/email + bouton « Voir » →
   la classe apparaît dans la fiche drawer (E.3).
2. **Plus** : backend ajoute `lastClasseCode` à `EtudiantDto` — tech-debt
   à proposer à Oumar si jugé utile en V3 ou V4.

→ **On part sur l'option 1 (MVP)**. Colonne « Dernière classe » ajoutée
en V4 si Oumar expose l'info.

---

## E.3 — Fiche étudiant (`EtudiantDetailDrawer`)

Composant `<EtudiantDetailDrawer>` ouvert depuis le bouton « Voir » de E.2.
Réutilise le composant `<Drawer>` de `@/components/ui/drawer.tsx`.

### En-tête

- Avatar (initiales + couleur hash sur l'id)
- **Nom complet** (h2)
- **Matricule** (mono) · **email** (lien `mailto:`)
- Pas de badge statut (le backend `EtudiantDto` ne porte pas `statut` —
  pas dans le contrat V3)

### Historique des inscriptions

Liste **chronologique inverse** (plus récent en haut) de
`InscriptionHistoryItemDto[]` :

```
┌────────────────────────────────────────┐
│ Année 2025-2026               EN COURS │  ← chip vert si année EN_COURS
├────────────────────────────────────────┤
│ Classe   GL3-A                          │
│ Formation Génie Logiciel · L3           │
│ Filière  IDA — Informatique             │
│ Double-diplôme                          │  ← chip orange si isDoubleDiplome
└────────────────────────────────────────┘
```

- Si `inscriptions.length === 0` → message « Aucune inscription enregistrée »
- Le chip « EN COURS » apparaît si l'année correspond à l'année courante
  (à déduire de l'ordre — la 1ʳᵉ entrée de la liste si on suppose tri
  backend ; sinon comparer avec `useAnneesQuery()` filtré sur `statut=EN_COURS`)

### Actions

- **Pas de bouton éditer** (le design en a un mais V3 ne l'expose pas)
- **Pas de bouton désinscrire** (géré depuis page Classes, LOT 4)

### Endpoint consommé

```
GET /api/etudiants/:id
→ EtudiantDetailDto = EtudiantDto + { inscriptions: InscriptionHistoryItemDto[] }
```

---

## E.4 — Page Suivi des modules (`/suivi-modules`)

### Toolbar

4 contrôles alignés gauche → droite :

- **Recherche** (`<SearchInput>` débouncé 250 ms) sur le nom/code du module
- **Filtre classe** (`<Select>`) : toutes / `classeId`
- **Filtre semestre** (`<Select>`) : tous / S1 / S2
- **Filtre statut** (`<Select>`) : tous / `a_planifier` / `en_cours` / `termine`

Tous propagés sur `useSuiviModulesQuery(query)` (backend filtre).

### Ligne sommaire (sous la toolbar)

`N modules · X terminés · Y en cours · Z à planifier` (calcul client).

### Barre de sélection bulk (conditionnelle)

Visible quand `selectedIds.size > 0` :

```
[N module(s) sélectionné(s)]    [Marquer terminés]   [Annuler]
```

- « Marquer terminés » → boucle `useTerminerSuiviMutation` pour chaque id
  sélectionné (Promise.all). Flash de succès agrégé : « N modules
  marqués terminés ».
- « Annuler » → vide `selectedIds`

### Table

9 colonnes :

| #   | Colonne     | Source                           | Notes                                                                 |
| --- | ----------- | -------------------------------- | --------------------------------------------------------------------- |
| 1   | ☐ Checkbox  | local                            | Désactivé si `estTermine` (rangée terminée immuable sauf via Rouvrir) |
| 2   | Module      | `module.code` + `module.libelle` | Bar coloré gauche (couleur module si dispo, sinon hash)               |
| 3   | Classe      | `classeCode`                     | Badge clair                                                           |
| 4   | UE          | `module.ueCode` (si exposé)      | Badge coloré                                                          |
| 5   | Prévu       | `heuresPrevues`                  | Format `Xh`                                                           |
| 6   | Fait        | `heuresFaites`                   | Format `Xh`, vert si > 0                                              |
| 7   | Progression | `progression`                    | Barre + % ; couleur seuil : ≥95 vert · 60-95 orange · <60 bleu        |
| 8   | Enseignants | `enseignants[]`                  | Liste compacte « Nom (Xh) » ; multi via `+N`                          |
| 9   | Action      | bouton                           | `Terminer` si `!estTermine`, `Rouvrir` sinon                          |

- **Fond rangée** : vert clair si `estTermine`, bleu clair si sélectionnée
- **Skeleton** : 6 lignes en pulse
- **Empty state** : « Aucun module suivi pour ces filtres »

### Endpoint consommé

```
GET /api/suivi-modules?classeId&semestre&statut&q
→ SuiviModuleDto[]

PATCH /api/suivi-modules/:id/terminer  (RP only)
PATCH /api/suivi-modules/:id/rouvrir   (RP only)
→ SuiviModuleDto
```

### RBAC côté UI

- AC : les boutons `Terminer/Rouvrir` **restent visibles mais désactivés
  avec tooltip** (le backend renvoie 403 si AC tente quand même). On lit
  `useAuth().user.role` pour décider.

---

## E.5 — Voir les séances d'un module suivi

**Plus vs design** (le design ne l'expose pas explicitement) : un bouton
**« Voir les séances »** en complément du `Terminer/Rouvrir`, dans la
colonne Action ou dans un menu contextuel ⋯.

### Composant

`<SuiviSeancesDrawer suiviId={...} onClose={...}>` : ouvert depuis E.4.

Liste les séances **COURS** du module suivi (le backend filtre déjà sur
`type=COURS` côté `seancesForSuivi`). Pour chaque séance :

```
┌──────────────────────────────────────────────┐
│ ALGO — Cours magistral             [PUBLIÉE] │
│ Lun. 25 mai 2026 · 10:00 → 12:00              │
│ Amphi A · M. Oumar Ndiaye                    │
└──────────────────────────────────────────────┘
```

- Tri chronologique inverse (plus récente en haut)
- Compteur en en-tête : « N séances »
- Empty state : « Aucune séance n'a encore eu lieu pour ce module »
- Lecture seule (pas d'édition depuis ce drawer — clic sur une séance
  pourrait à terme naviguer vers la fiche, mais hors scope V3 LOT 5)

### Endpoint consommé

```
GET /api/suivi-modules/:id/seances
→ SessionV2Dto[]
```

---

## Fichiers à produire

| Fichier                                                           | Description                                                                                   |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `apps/web/src/lib/queries-v3.ts` (extends)                        | `useEtudiantsQuery`, `useEtudiantDetailQuery`, `useSuiviModulesQuery`, `useSuiviSeancesQuery` |
| `apps/web/src/lib/mutations-v3.ts` (extends)                      | `useTerminerSuiviMutation`, `useRouvrirSuiviMutation`                                         |
| `apps/web/src/components/ui/search-input.tsx` (nouveau)           | Input débouncé réutilisable                                                                   |
| `apps/web/src/app/(planit)/(gestion)/etudiants/page.tsx`          | Entry point Étudiants                                                                         |
| `apps/web/src/components/rp/etudiants/etudiants-page.tsx`         | Logique principale (toolbar + table)                                                          |
| `apps/web/src/components/rp/etudiants/etudiants-table.tsx`        | Table 5 colonnes                                                                              |
| `apps/web/src/components/rp/etudiants/etudiant-detail-drawer.tsx` | Drawer fiche                                                                                  |
| `apps/web/src/components/rp/etudiants/etudiants-skeleton.tsx`     | Skeleton table                                                                                |
| `apps/web/src/app/(planit)/(gestion)/suivi-modules/page.tsx`      | Entry point Suivi                                                                             |
| `apps/web/src/components/rp/suivi/suivi-page.tsx`                 | Logique principale (filtres + table)                                                          |
| `apps/web/src/components/rp/suivi/suivi-table.tsx`                | Table 9 colonnes + multi-sel                                                                  |
| `apps/web/src/components/rp/suivi/suivi-seances-drawer.tsx`       | Drawer E.5                                                                                    |
| `apps/web/src/components/rp/suivi/suivi-skeleton.tsx`             | Skeleton table                                                                                |

Sidebar `(planit)/_components/sidebar.tsx` (ou équivalent) — vérifier que
les items « Étudiants » et « Suivi des modules » pointent vers les
nouvelles routes (probablement à ajuster si déjà câblé sur `href="#"`).

---

## Décisions tactiques

- **Drawer** (pas Modal) pour `EtudiantDetailDrawer` et `SuiviSeancesDrawer` :
  contenu lecture-seule, navigation latérale plus pertinente qu'un modal
  centré. Réutilise `@/components/ui/drawer.tsx` (existant, utilisé dans
  Planning).
- **SearchInput débouncé** créé localement (pas de composant partagé pour
  l'instant). Si LOT 4/V03 le requiert aussi, le promouvoir dans
  `@/components/ui/`.
- **Pas de pagination V1** — la seed est petite. Tracer en tech-debt :
  `TD-V03-LOT5-PAGINATION` à activer si volumétrie > 100.
- **Multi-sélection bulk** : pattern `useState<ReadonlySet<string>>`
  identique au planning-grid LOT 4 V02. Pas de Zustand.

## Out of scope

- Pagination des listes (V4 si besoin)
- Édition de la fiche étudiant (V3-D6)
- Création d'étudiant (passe par l'inscription depuis Classes, LOT 4)
- Désinscription (page Classes, LOT 4)
- Navigation séance → fiche séance depuis E.5 (V3 hors LOT 5)

## Verification (Done LOT 5)

- Recherche par nom / matricule / email fonctionne
- Aucun bouton d'ajout d'étudiant
- Fiche affiche historique d'inscriptions multi-année
- Suivi affiche prévu / fait / progression / enseignants conformes
- « Voir les séances » liste bien les séances COURS du module
- AC ne peut pas Terminer/Rouvrir (UI désactivée + backend 403 failsafe)
- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` verts
