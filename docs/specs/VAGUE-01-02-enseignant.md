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

| ID    | Décision                                                    | Justification                                                                                                         |
| ----- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| L3-D1 | Teacher ID hardcodé = `seed-teacher-algo` (M. Oumar Ndiaye) | V1-D2 — pas d'auth. Tech-debt pour Vague 02 (contexte d'auth).                                                        |
| L3-D2 | `socket.io-client@^4.8.1` ajouté à `apps/web`               | Même version que backend NestJS pour cohérence. Décision sensible validée.                                            |
| L3-D3 | Layout `<Shell>` réutilisé (sidebar + topbar Libasse)       | Cohérence UI avec `/rp`. Le Design mobile-first est porté dans la zone main, sans changer l'architecture.             |
| L3-D4 | Pas de formulaires modify/cancel sur le détail séance       | V1 backend n'expose pas d'endpoint "demande de modification". Le Design les montre mais ils sont hors scope V1.       |
| L3-D5 | Pas de notifications dans le DOM                            | V1-D5 — pas de système notif. L'icône cloche reste dans la topbar (de Libasse) mais sans badge actif côté enseignant. |

## Architecture des composants

### Routes (App Router)

```
app/(planit)/enseignant/
├── page.tsx                 → E.2 accueil
├── planning/page.tsx         → E.3 planning hebdo
└── seance/[id]/page.tsx      → E.4 détail séance
```

### Composants nouveaux

| Composant                    | Fichier                                          | Props                          | Référence                   |
| ---------------------------- | ------------------------------------------------ | ------------------------------ | --------------------------- |
| `<HeroCurrentSession>`       | `components/enseignant/hero-current-session.tsx` | `{ sessions, teacherId }`      | `home.jsx#HeroCard`         |
| `<SessionsTodayList>`        | `components/enseignant/sessions-today-list.tsx`  | `{ sessions, onSessionClick }` | `home.jsx` (liste)          |
| `<SessionDetailView>`        | `components/enseignant/session-detail-view.tsx`  | `{ session }`                  | `session-detail.jsx#detail` |
| `<Toast>`, `<ToastProvider>` | `components/ui/toast.tsx` + `toast-provider.tsx` | —                              | —                           |

### Hooks nouveaux

| Hook                          | Fichier                          | Retourne                                                        |
| ----------------------------- | -------------------------------- | --------------------------------------------------------------- |
| `useCurrentTeacher()`         | `hooks/use-current-teacher.ts`   | `{ id: string, fullName: string, role: 'ENSEIGNANT' }` hardcodé |
| `useRealtimeSessions(userId)` | `hooks/use-realtime-sessions.ts` | `void` (effet : invalide queries + toast)                       |
| `useToast()`                  | (via `<ToastProvider>`)          | `{ show(message): void }`                                       |

### Composants réutilisés (LOT 2 — Libasse)

- `<Shell>` — layout principal (sidebar + topbar)
- `<PlanningGrid>` — grille jours × heures
- `<WeekNavigator>` — navigation prev/next semaine
- `<PlanningFooter>` (alias `<StatsBar>`) — compteurs en bas
- `<SessionCard>` — carte séance individuelle
- `<SessionDetailDrawer>` — drawer LOT 2 (optionnel, ou full page)

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
- Pas de nouveau token requis
- Toast : couleur `success` (vert) pour les events de publication

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
- ❌ WeekStrip mobile (Design `home.jsx` — overlapping avec `<WeekNavigator>` existant)
