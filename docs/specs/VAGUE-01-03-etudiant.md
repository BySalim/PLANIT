# VAGUE-01-03 — Frontend Étudiant

**Vague :** 01 · **Lot :** 03 · **Auteur :** Oumar · **Date :** 2026-05-23  
**Branche :** `feat/oumar` → PR → `develop`

---

## Contexte

LOT 3 (enseignant) livré et stable. LOT 4 est son miroir côté étudiant : mêmes écrans, même
stack, même temps-réel — seule la clé de filtre API change (`studentId` au lieu de `teacherId`).

---

## Pages à implémenter

### 1. Accueil étudiant — `/etudiant`

**Composant :** `app/(planit)/etudiant/page.tsx`

Affiche :

- `Greeting` — message de bienvenue avec prénom et heure Dakar
- `HeroCurrentSession` — séance en cours ou prochaine du jour
- `SessionsTodayList` — liste des séances du jour
- `WeekStrip` — mini-calendrier semaine avec lien vers `/etudiant/planning`
- `PlanningUpdateModal` — modale temps-réel si publication de planning

Données : `GET /api/sessions?weekStart=<date>&studentId=<id>`  
Temps réel : `useRealtimeSessions(student.id)`

### 2. Planning étudiant — `/etudiant/planning`

**Composant :** `app/(planit)/etudiant/planning/page.tsx`

Affiche :

- Barre de contrôle : toggle `Jour / Semaine`, date-picker, filtre type, export
- `DayTimeline` (vue jour)
- `WeekTimeline` (vue semaine)
- `CalendarPicker` — sélecteur de date flottant
- `PlanningUpdateModal` — modale temps-réel

Données : `GET /api/sessions?weekStart=<date>&studentId=<id>`  
Navigation séance : `/etudiant/seance/[id]`

### 3. Détail séance étudiant — `/etudiant/seance/[id]`

**Composant :** `app/(planit)/etudiant/seance/[id]/page.tsx`

Affiche :

- Lien retour vers `/etudiant/planning`
- `SessionDetailView` — détail complet de la séance
- États : chargement, erreur avec retry, introuvable

Données : `GET /api/sessions/:id`  
Temps réel : `useRealtimeSessions(student.id)`

---

## Composants créés

| Composant     | Chemin                                 | Description                                                      |
| ------------- | -------------------------------------- | ---------------------------------------------------------------- |
| `MobileShell` | `components/etudiant/mobile-shell.tsx` | Shell mobile étudiant — tabs `/etudiant` et `/etudiant/planning` |

Tous les autres composants (Greeting, HeroCurrentSession, SessionsTodayList, WeekStrip,
DayTimeline, WeekTimeline, CalendarPicker, PlanningUpdateModal, SessionDetailView) sont importés
directement depuis `@/components/enseignant/`.

---

## Hook créé

| Hook                | Chemin                         | Description                                                              |
| ------------------- | ------------------------------ | ------------------------------------------------------------------------ |
| `useCurrentStudent` | `hooks/use-current-student.ts` | Identité étudiant hardcodée V1 — remplacée par auth en Vague 02 (TD-022) |

---

## API consommées

| Endpoint                  | Paramètres               | Description                                      |
| ------------------------- | ------------------------ | ------------------------------------------------ |
| `GET /api/sessions`       | `weekStart`, `studentId` | Liste des séances de la semaine pour un étudiant |
| `GET /api/sessions/:id`   | —                        | Détail d'une séance                              |
| `GET /api/sessions/stats` | `weekStart`              | Stats hebdomadaires (page accueil)               |

---

## Modifications de `lib/queries.ts`

- Ajout de `planningKeys.sessionsByStudent(weekStart, studentId)`
- Extension de `useWeekSessionsQuery` : paramètre optionnel `studentId`
- Si `studentId` fourni : `params.set('studentId', id)` + queryKey `sessionsByStudent`

---

## Hors périmètre

- Aucun nouveau composant UI dans `components/etudiant/` hormis `mobile-shell.tsx`
- Pas de gestion des rôles (Vague 02)
- Export ICS non implémenté (TD-019)
