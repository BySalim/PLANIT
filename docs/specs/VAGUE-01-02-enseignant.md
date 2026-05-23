# VAGUE-01-02 — Frontend Enseignant (LOT 3)

> Spec courte (1 page) pour les écrans Enseignant de la Vague 01.
> Référence Design : `PLANIT-IA/enseignant/screens/{home,planning,session-detail}.jsx`.

## Périmètre

| Tâche   | Description                                                                    | Référence Design     |
| ------- | ------------------------------------------------------------------------------ | -------------------- |
| **E.2** | Page `/enseignant` — accueil avec hero séance en cours + liste séances du jour | `home.jsx`           |
| **E.3** | Page `/enseignant/planning` — planning hebdo filtré sur l'enseignant courant   | `planning.jsx`       |
| **E.4** | Page `/enseignant/seance/[id]` — détails d'une séance (vue lecture seule V1)   | `session-detail.jsx` |
| **E.5** | Hook `useRealtimeSessions()` — WebSocket → invalidation TanStack Query         | —                    |
| **E.6** | Toast in-app à la réception d'un event `session:published`                     | —                    |
| **E.7** | Boutons Exporter / Notifications cachés (V1-D7)                                | —                    |

## Décisions V1 (validées avec Oumy)

> ⚠ **La vue web `/enseignant` et `/etudiant` est une simulation mobile** — elle existe pour démontrer l'UX cible en attendant l'app Expo (Vague 04). Le shell est volontairement étroit (`max-w-md`) et bottom-tabbed pour reproduire le rendu mobile sur navigateur.

| ID    | Décision                                                                            | Justification                                                                                                                                                       |
| ----- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L3-D1 | Teacher ID hardcodé = `seed-teacher-algo` (M. Oumar Ndiaye)                         | V1-D2 — pas d'auth. Tech-debt pour Vague 02 (contexte d'auth).                                                                                                      |
| L3-D2 | `socket.io-client@^4.8.1` ajouté à `apps/web`                                       | Même version que backend NestJS pour cohérence. Décision sensible validée.                                                                                          |
| L3-D3 | **`<MobileShell>` custom** (header sticky + tab-bar flottante) au lieu de `<Shell>` | La vue web enseignant/étudiant simule le rendu mobile cible. Le `<Shell>` desktop (sidebar+topbar) reviendra en V2 quand l'app Expo prendra le relai. Tracé TD-027. |
| L3-D4 | Pas de formulaires modify/cancel sur le détail séance                               | V1 backend n'expose pas d'endpoint "demande de modification". Le Design les montre mais ils sont hors scope V1.                                                     |
| L3-D5 | Pas de notifications dans le DOM                                                    | V1-D5 — pas de système notif. La cloche du `<MobileShell>` reste sans badge actif.                                                                                  |
| L3-D6 | `date-fns@^4.1.0` ajouté à `apps/web`                                               | Manipulation pure de dates (`addDays`, `startOfWeek`, `format`, `isSameDay`). `@planit/utils/date` reste obligatoire pour `now()` (fuseau Africa/Dakar).            |
| L3-D7 | `<PlanningUpdateModal>` à la place du simple toast (E.6)                            | UX plus visible quand l'enseignant n'est pas focus sur l'app. Le toast reste disponible (option `showToast` du hook).                                               |

## Architecture des composants

### Routes (App Router)

```
app/(planit)/enseignant/
├── page.tsx                 → E.2 accueil
├── planning/page.tsx         → E.3 planning hebdo
└── seance/[id]/page.tsx      → E.4 détail séance
```

### Composants nouveaux

| Composant                    | Fichier                                           | Props                           | Référence                    |
| ---------------------------- | ------------------------------------------------- | ------------------------------- | ---------------------------- |
| `<MobileShell>`              | `components/enseignant/mobile-shell.tsx`          | `{ children, unread? }`         | `enseignant/app.jsx`         |
| `<Greeting>`                 | `components/enseignant/greeting.tsx`              | `{ fullName, now }`             | `home.jsx`                   |
| `<HeroCurrentSession>`       | `components/enseignant/hero-current-session.tsx`  | `{ sessions, now }`             | `home.jsx#HeroCard`          |
| `<SessionsTodayList>`        | `components/enseignant/sessions-today-list.tsx`   | `{ sessions, onSessionClick }`  | `home.jsx` (liste)           |
| `<WeekStrip>`                | `components/enseignant/week-strip.tsx`            | `{ sessions, now, onDayClick }` | `home.jsx` (bande jours)     |
| `<DayTimeline>`              | `components/enseignant/day-timeline.tsx`          | `{ date, sessions, now, ... }`  | `planning.jsx` (vue jour)    |
| `<WeekTimeline>`             | `components/enseignant/week-timeline.tsx`         | `{ weekStart, sessions, ... }`  | `planning.jsx` (vue semaine) |
| `<CalendarPicker>`           | `components/enseignant/calendar-picker.tsx`       | `{ open, selectedDate, ... }`   | `planning.jsx` (datepicker)  |
| `<SessionDetailView>`        | `components/enseignant/session-detail-view.tsx`   | `{ session }`                   | `session-detail.jsx#detail`  |
| `<PlanningUpdateModal>`      | `components/enseignant/planning-update-modal.tsx` | `{ open, sessions, onClose }`   | —                            |
| `<Toast>`, `<ToastProvider>` | `components/ui/toast.tsx` + `toast-provider.tsx`  | —                               | —                            |

### Hooks nouveaux

| Hook                          | Fichier                          | Retourne                                                        |
| ----------------------------- | -------------------------------- | --------------------------------------------------------------- |
| `useCurrentTeacher()`         | `hooks/use-current-teacher.ts`   | `{ id: string, fullName: string, role: 'ENSEIGNANT' }` hardcodé |
| `useRealtimeSessions(userId)` | `hooks/use-realtime-sessions.ts` | `void` (effet : invalide queries + toast)                       |
| `useToast()`                  | (via `<ToastProvider>`)          | `{ show(message): void }`                                       |

### Composants réutilisés (LOT 2 — Libasse)

- Aucun pour cette vague côté `/enseignant` — le `<MobileShell>` remplace `<Shell>`, les timelines mobiles remplacent `<PlanningGrid>`/`<WeekNavigator>`. Les composants RP restent intacts. Cf. TD-027 pour le retour au shell desktop en V2.

## API consommée

| Endpoint                                  | Hook                                             | Filtre teacher                                     |
| ----------------------------------------- | ------------------------------------------------ | -------------------------------------------------- |
| `GET /api/sessions?weekStart=&teacherId=` | `useWeekSessionsQuery(weekStart, { teacherId })` | ⚠ extension du hook actuel pour accepter teacherId |
| `GET /api/sessions/:id`                   | `useSessionDetailQuery(id)`                      | —                                                  |
| `GET /api/sessions/stats?weekStart=`      | `useWeekStatsQuery(weekStart)`                   | (pas de filtre teacher V1 — stats globales)        |
| WebSocket `session:published`             | `useRealtimeSessions(teacherId)`                 | côté serveur (room `user:${id}`)                   |

## Contrat WebSocket (E.5)

```typescript
// Connexion
import { io } from 'socket.io-client';
const socket = io(API_BASE, { auth: { userId: currentTeacher.id } });

// Réception
socket.on('session:published', ({ sessions }: { sessions: SessionDto[] }) => {
  queryClient.invalidateQueries({ queryKey: planningKeys.all });
  toast.show('Le planning a été mis à jour');
});
```

## UI / Tokens

- Tous les tokens via `@planit/design-tokens` (déjà importés dans `globals.css`)
- Couleurs types séance : utilise les mappings établis dans `<SessionCard>` (LOT 2)
- Nouvelle utility `@utility bg-brand-gradient` dans `globals.css` (gradient marron→orange via tokens, plus de hex en dur dans les composants)
- Toast : couleur `success` (vert) pour les events de publication
- **Fuseau** : tous les `now` passent par `now()` de `@planit/utils/date` (Africa/Dakar) — `new Date()` interdit pour le moment courant

## Définition de Done

- ✅ `/enseignant` affiche hero "Séance en cours" ou message "Aucune séance en cours" + liste séances du jour de M. Ndiaye
- ✅ `/enseignant/planning` affiche les 2 séances de M. Ndiaye (CM ALGO lundi 10h + TD ALGO lundi 14h)
- ✅ `/enseignant/seance/seed-seance-01` affiche les détails complets de la séance
- ✅ Quand RP publie une modif, l'enseignant reçoit le toast en temps réel (uniquement si la séance le concerne)
- ✅ Pas de boutons Exporter / Notifications côté enseignant
- ✅ Aucune erreur console
- ✅ `pnpm lint` / `typecheck` / `test` verts

## Hors scope (rappel)

- ❌ Formulaires "demande de modification" / "annuler séance" (Design les montre mais V1 backend ne les supporte pas)
- ❌ Multi-enseignant via topbar
- ❌ Auth réelle
- ❌ Notifications push réelles
- ❌ Module progress block (Design `home.jsx`)
- ❌ Shell desktop pour `/enseignant` et `/etudiant` (V2 — voir TD-027)
- ❌ App mobile Expo (Vague 04)
