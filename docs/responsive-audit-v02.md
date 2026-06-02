# Audit responsive Vague 02 — LOT 7 D.1

> Date d'audit : 2026-05-28  
> Auditeur : Oumar (feat/oumar)  
> Périmètre : 6 pages × 3 viewports (375 mobile, 768 tablet, 1280 desktop)

---

## Périmètre audité

| Page                     | Route                    | Acteur     |
| ------------------------ | ------------------------ | ---------- |
| Accueil enseignant       | `/enseignant`            | Enseignant |
| Planning enseignant      | `/enseignant/planning`   | Enseignant |
| Détail séance enseignant | `/enseignant/seance/:id` | Enseignant |
| Accueil étudiant         | `/etudiant`              | Étudiant   |
| Planning étudiant        | `/etudiant/planning`     | Étudiant   |
| Détail séance étudiant   | `/etudiant/seance/:id`   | Étudiant   |

---

## Résultats par viewport

### 375 px — Mobile

| Page                     | État avant LOT 7 | État après LOT 7 | Notes                                                     |
| ------------------------ | ---------------- | ---------------- | --------------------------------------------------------- |
| Accueil enseignant       | ✅ OK (max-w-md) | ✅ OK            | Header + cards + tab bar flottante                        |
| Planning enseignant      | ✅ OK            | ✅ OK            | Vue Jour/Semaine avec toggle, DayTimeline scroll vertical |
| Détail séance enseignant | ✅ OK            | ✅ OK            | Layout mobile-first, infos en haut, bouton retour         |
| Accueil étudiant         | ✅ OK            | ✅ OK            | Identique enseignant (composants partagés)                |
| Planning étudiant        | ✅ OK            | ✅ OK            | Vue Jour/Semaine, DayTimeline                             |
| Détail séance étudiant   | ✅ OK            | ✅ OK            | Layout mobile-first                                       |

### 768 px — Tablet

| Page                     | État avant LOT 7                          | État après LOT 7                          | Notes                                               |
| ------------------------ | ----------------------------------------- | ----------------------------------------- | --------------------------------------------------- |
| Accueil enseignant       | ⚠️ Centré max-w-md, espace vide bilatéral | ✅ Sidebar 256px + contenu pleine largeur | `max-md:max-w-md` retire la contrainte en ≥md       |
| Planning enseignant      | ⚠️ Centré max-w-md                        | ✅ Sidebar + planning pleine largeur      | WeekTimeline bénéficie de la largeur supplémentaire |
| Détail séance enseignant | ⚠️ Centré max-w-md                        | ✅ Sidebar + contenu étendu               | `sm:text-2xl` sur le titre (déjà présent)           |
| Accueil étudiant         | ⚠️ Centré max-w-md                        | ✅ Sidebar + contenu pleine largeur       |                                                     |
| Planning étudiant        | ⚠️ Centré max-w-md                        | ✅ Sidebar + planning pleine largeur      |                                                     |
| Détail séance étudiant   | ⚠️ Centré max-w-md                        | ✅ Sidebar + contenu étendu               |                                                     |

### 1280 px — Desktop

| Page                     | État avant LOT 7                  | État après LOT 7                     | Notes                             |
| ------------------------ | --------------------------------- | ------------------------------------ | --------------------------------- |
| Accueil enseignant       | ⚠️ Même que 768 (centré max-w-md) | ✅ Sidebar 256px + contenu adaptatif | Large content area pour les cards |
| Planning enseignant      | ⚠️ Centré max-w-md                | ✅ Sidebar + planning responsive     | Vue Semaine confortable à 1280px  |
| Détail séance enseignant | ⚠️ Centré max-w-md                | ✅ Layout desktop confortable        | `sm:text-2xl` sur le h2 du module |
| Accueil étudiant         | ⚠️ Centré max-w-md                | ✅ Sidebar + contenu adaptatif       |                                   |
| Planning étudiant        | ⚠️ Centré max-w-md                | ✅ Sidebar + planning responsive     |                                   |
| Détail séance étudiant   | ⚠️ Centré max-w-md                | ✅ Layout desktop confortable        |                                   |

---

## Casses identifiées et corrigées

### MobileShell — Navigation

- **Avant** : `max-w-md mx-auto flex-col` sur tous viewports — simulait un téléphone centré sur desktop
- **Après** : `max-md:max-w-md max-md:mx-auto` (mobile seulement) + `md:flex-row` + `DesktopSidebar` sur ≥768px
- Sidebar desktop : logo PLANIT, tabs Accueil/Planning, user info + logout
- Tab bar flottante : masquée via `md:hidden` sur ≥768px
- Header compact : masqué via `md:hidden` sur ≥768px

### Date en anglais — session-detail-drawer.tsx (TD-V02-LOT3-B)

- **Avant** : `format(start, 'eeee d MMMM yyyy')` sans locale → "Thursday 28 May 2026"
- **Après** : `format(start, 'eeee d MMMM yyyy', { locale: fr })` → "jeudi 28 mai 2026"

---

## Problèmes résiduels (non bloquants)

| ID     | Description                                                                                       | Impact                                               | Priorité |
| ------ | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | -------- |
| —      | `WeekTimeline` fixe à `COL_W=168px` par jour — pas encore responsive en dessous de 600px          | Scroll horizontal OK sur mobile, layout ne casse pas | Faible   |
| —      | `DayTimeline` : axe horaire `TIME_COL_W=40px` fixe — OK sur mobile (375px = 335px pour la grille) | Confort réduit sous 360px de largeur                 | Faible   |
| TD-027 | La `DesktopSidebar` introduite est basique (pas de menu Notifications, pas de raccourcis RP)      | V02 : minimal viable ; à enrichir en V03+            | Moyenne  |

---

## Accessibilité — Points notables

- ✅ `<main>` landmark présent dans `MobileShell` (les deux versions enseignant/étudiant)
- ✅ `<header>` avec `sticky top-0` — élément sémantique HTML5
- ✅ `<nav aria-label="Navigation principale">` sur tab bar ET sidebar desktop
- ✅ `<aside aria-label="Navigation principale">` sur la sidebar desktop
- ✅ `aria-current="page"` sur le lien actif
- ✅ `aria-label` sur tous les boutons icône
- ✅ `lang="fr"` sur `<html>` (root layout)
- ✅ `<article>` + `<header>` + `<section>` sur `SessionDetailView`
- ⚠️ `WeekTimeline` : les blocks séance sont des `<button>` sans texte lisible clair — `aria-label` présent mais pourrait être enrichi

---

## Captures d'écran

> Les captures avant/après sont jointes dans le journal d'agent
> `docs/agent-journal/oumar/2026-05-28-vague02-lot7.md`.

---

_Document généré dans le cadre du LOT 7 (D.1) — Vague 02._
