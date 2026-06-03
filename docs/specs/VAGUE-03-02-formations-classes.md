# VAGUE-03-02 — Formations + Classes (+ fiche + inscription)

> **Statut** : IN PROGRESS (Oumy, 2026-06-03)
> **LOT** : 4 (C.1 → C.5). Owner officiel C.1 = Libasse ; rédigée ici par Oumy
> faute de spec préalable, pour ne pas coder sans la phase SPEC du workflow.
> **Réf design** : `PLANIT-Design/rp/screens/formations.jsx` + `classes.jsx`
> **Backend** : LOT 1+2 V03 (mergés sur `develop`) — `/api/formations`,
> `/api/classes`, `/api/classes/:id/etudiants`, `/api/etudiants/lookup`,
> `/api/classes/:id/inscriptions`, `/api/suivi-modules?classeId=`

---

## Principes

- Pages servies sous le route group `(gestion)` (RP + AC), URLs propres sans
  segment d'acteur (V3-D13) : `/formations`, `/classes`, `/classes/[id]`.
- Style : gabarit des pages V02 (`filieres/page.tsx`) — `<Shell>` + toolbar +
  table en grille. Tokens Tailwind (`text-text`, `bg-surface`, …), aucun hex en
  dur hors palettes déterministes déjà présentes.
- Data : `queries-v3.ts` / `mutations-v3.ts` (clés sous `academicKeys`,
  invalidation `academicKeys.all`). Mutations portent leur propre `useFlash`.
- **Le design est une référence visuelle ; la demande de la vague fait foi** là
  où elle diverge (colonnes Classes, Places, retrait WhatsApp).

---

## C.2 — Page Formations (`/formations`)

- Liste (table) : **Code** (mono) · **Niveau** (pill) · **Filière** (sigle) ·
  **Année** (libellé) · actions.
- Filtres : **filière** (select, sigles via `useFilieresQuery`) + **année**
  (select via `useAnneesQuery`, défaut = année courante `EN_COURS`).
- Actions par ligne : **Voir classes** (→ `/classes?formation=`… via filtre
  filière/année), **Voir maquette** (→ `/maquettes`), **Modifier** (modal).
- Bouton **« + Nouvelle formation »** → modal de création **année courante
  uniquement** : `code`, `niveau`, `filiereId`, `maquetteVersionId`,
  `isDoubleDiplome`. `anneeAcademiqueId` résolu serveur (jamais envoyé).
- **Écarts design** : pas de drill-down maquette inline (le design l'a) — on
  navigue vers la page Maquettes (source de vérité unique, LOT 3). Pas de
  multiselect classes (les classes pointent vers la formation, pas l'inverse).

## C.3 — Page Classes — liste (`/classes`)

- Recherche par **nom** (`q`) + filtre **filière (sigle)** + **année** (défaut
  année courante). Query `GET /api/classes?anneeId=&filiereSigle=&q=`.
- Colonnes (réf vague, **prioritaire sur le design**) : **Classe** = `Niveau` +
  `filière(sigle)` + `nom` (+ code mono) · **badge double-diplôme** si
  applicable · **Année** · **Places** = `inscrits / capaciteMax` (barre +
  ratio) · bouton **Voir** (→ fiche).
- Bouton **« + Nouvelle classe »** → modal : `code`, `name`, `formationId`
  (select des formations de l'année courante), `capaciteMax`.
- **Écarts design** : pas de colonnes Progression / État planning / WhatsApp
  (WhatsApp = V04+ ; progression vit dans la fiche + page Suivi LOT 5).

## C.4 — Fiche classe (`/classes/[id]`)

Route dédiée (deep-linkable depuis la liste **et** depuis Maquettes M.6).

- En-tête : code (mono) · nom (h1) · badges niveau / filière / année / double-
  diplôme. Bouton retour → `/classes`.
- **KPIs** : Places (inscrits/capacité) · Capacité · Niveau · (modules, dérivé
  du suivi).
- Onglets :
  - **Suivi pédagogique** : `GET /api/suivi-modules?classeId=` → liste lecture
    seule (module · UE · prévu(VHE) · fait · progression · enseignants). Pas de
    bouton « Terminer » ici (c'est la page Suivi LOT 5/E.4) — la fiche est une
    synthèse.
  - **Étudiants inscrits** : `GET /api/classes/:id/etudiants` → roster
    (nom · matricule · email). Bouton **« Inscrire un étudiant »** → modal C.5.
- **Écart** : carte « Groupe WhatsApp » du design = **hors V03** (V04+).

## C.5 — Modal inscription (flow email) — `components/inscriptions/`

**Composant partagé RP + AC** (réutilisé tel quel par G.5). Étapes :

1. **Email** : champ email + bouton « Rechercher ».
   `GET /api/etudiants/lookup?email=` → `{ found, etudiant }`.
2. Si **found** → afficher l'étudiant (nom · matricule) → bouton **« Inscrire »**
   → `POST /api/classes/:id/inscriptions` body `{ mode: 'existant', email }`.
3. Si **non trouvé** → formulaire `nomComplet` + `matricule` → bouton
   **« Créer et inscrire »** → body `{ mode: 'nouveau', email, nomComplet,
matricule }`.
4. Succès (201) → flash succès + invalidation (`academicKeys.all`) + fermeture.
5. **409** (doublon / règle double-diplôme ≤ 2/an, 1 par catégorie) → flash
   explicite : « Déjà inscrit dans une classe de cette catégorie cette année ».

---

## Done LOT 4

- Ajout d'une formation pour l'année courante → apparaît dans la liste.
- Liste classes filtrée par défaut sur l'année courante ; recherche nom +
  filtres filière/année OK.
- « Places » correct (inscrits/capacité) ; badge double-diplôme affiché.
- Inscription email inconnu → demande infos puis ajoute ; email connu → ajout
  direct ; même catégorie déjà inscrite → flash d'erreur clair.
- Lint + typecheck + tests verts ; aucune erreur console.
