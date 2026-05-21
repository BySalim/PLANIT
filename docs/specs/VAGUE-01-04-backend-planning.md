# SPEC — VAGUE-01-04 · Backend planning (LOT 1)

**Auteur :** Salim · **Date :** 2026-05-21 · **Statut :** Approuvée · **Branche :** `feat/salim`

## Objectif

Exposer l'API que les frontends RP / Enseignant / Étudiant consomment :
CRUD des séances, planning hebdomadaire, statistiques, publication groupée et
notification temps réel des acteurs concernés.

## Périmètre

IN — 6 endpoints REST sous `/api/sessions` + 1 gateway WebSocket + tests
d'intégration. OUT — gestion de conflits salle/enseignant (V1-D4), auth (V1-D2),
flux manuel de statut (V1-D3). Aucune modification de `schema.prisma`.

## Endpoints

| ID  | Route                                                         | Rôle                                                          |
| --- | ------------------------------------------------------------- | ------------------------------------------------------------- |
| B.1 | `GET /api/sessions?weekStart&classeId?&teacherId?&studentId?` | Séances d'une semaine, filtrables par acteur → `SessionDto[]` |
| B.2 | `POST /api/sessions`                                          | Crée une séance (`CreateSessionDto`) → `SessionDto` (201)     |
| B.3 | `PUT /api/sessions/:id`                                       | Met à jour (`UpdateSessionDto`) → `SessionDto`                |
| B.4 | `GET /api/sessions/:id`                                       | Détail d'une séance → `SessionDto`                            |
| B.5 | `POST /api/sessions/publish?classeId?`                        | Publie toutes les séances en attente → `SessionDto[]`         |
| B.7 | `GET /api/sessions/stats?weekStart&classeId?`                 | Compteurs du planning → `SessionStatsDto`                     |

Validation : `ZodValidationPipe` + schémas de `@planit/contracts`.
Erreurs : FK invalide → 400, id inconnu → 404, query/body invalide → 400.

## Règles métier

- **Création** : `status=PROVISOIRE`, `isPublished=false`, `lastModifiedAt=now`.
- **Modification** : force `isPublished=false`, `status=PROVISOIRE`, `lastModifiedAt=now`.
- **Publication** (B.5) : toutes les séances `isPublished=false` (filtrables par
  classe) → `isPublished=true`, `status=PUBLIE`, `lastPublishedAt=now`.
- Invariant : `isPublished === true ⟺ status === PUBLIE`.
- Filtre `studentId` : résolu vers la classe de l'étudiant.

## WebSocket (B.6)

- Handshake : `io(url, { auth: { userId } })` → la gateway joint la room `user:<id>`.
- À la publication : event `session:published` `{ sessions: SessionDto[] }` émis
  **uniquement** vers les acteurs concernés = enseignant(s) des séances publiées
  - étudiants de leurs classes. Aucune diffusion globale.

## Contrats

`packages/contracts/src/planning/index.ts` — ajout de
`sessionStatsSchema = { total, published, pending, byType: Record<SessionType, number> }`
et `SessionStatsDto`. Tout l'existant conservé.

## Tests (B.9)

Vitest + supertest + `unplugin-swc`, base dédiée `planit_test`, ≥ 12 tests
(1 happy + 2 erreurs par endpoint). Test clé : B.5 vérifie que
`emitSessionPublished` cible exactement les acteurs concernés.

## Definition of Done

6 endpoints répondent et apparaissent dans Swagger `/docs` · `publish` bascule
toutes les séances en attente · WS notifie seulement les acteurs concernés
(vérifié par test) · CI verte avec Postgres `planit_test`.
