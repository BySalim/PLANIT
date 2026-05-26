# PLANIT — Mémoire racine Claude Code

> **Charge ce fichier en PREMIER à chaque session.** Auto-suffisant : tout ce dont Claude a besoin est ici.

## Périmètre de lecture pour Claude

Tu **NE LIS PAS** les dossiers suivants (présents dans `../PLANIT-Strategie-VibeCode/`) — ils sont la propriété conceptuelle du tech lead :

- `strategies/` (méthodologie, réservée à Salim)
- `prompts/` (prompts opérationnels du tech lead)
- `doxcs/` (mémoire, mémoire de master, brouillons sources)
- `templates/` (modèles humains)

**Périmètre autorisé** : ce fichier, `.claude/agents/`, `.claude/commands/`, `../PLANIT-Strategie-VibeCode/vagues/vague-XX-*.md`, le code de ce repo (`apps/`, `packages/`, `infra/`, `docs/`).

Si une info te semble manquante, **demande à l'humain** — ne va pas explorer les dossiers ci-dessus.

---

## Identité projet

PLANIT — plateforme de gestion d'emploi du temps pour l'**ISM** (École d'Ingénieurs, Dakar). Équipe de 5 étudiants qui vibe-codent en autonomie. **Pas de date limite imposée** : `main` doit être démontrable à tout moment.

Stack : Next.js 15 + React 19 (web) · Expo (mobile) · NestJS (backend) · PostgreSQL 16 + Prisma · Redis 7 + Socket.IO · BullMQ · MinIO · Baileys WhatsApp · Orange SMS · Docker Compose · Hetzner CX22 · Turborepo + pnpm. **TypeScript strict partout.**

---

## Règles équipe — non-négociables

| Membre                        | Branche        | Spécialité                       |
| ----------------------------- | -------------- | -------------------------------- |
| Salim Ouedraogo (@BySalim)    | `feat/salim`   | Tech Lead — arbitrage, ADR, spec |
| Oumy (@oumy-code)             | `feat/oumy`    | Frontend Web                     |
| Libasse (@cheelee08)          | `feat/libasse` | Frontend Mobile + design         |
| Oumar (@papiuzumaki)          | `feat/oumar`   | Backend (NestJS, Prisma)         |
| Djibril (@pape-djibrilbousso) | `feat/djibril` | DevOps + intégrations            |

**À chaque démarrage de session, tu DOIS** :

1. Exécuter `git branch --show-current`
2. Identifier le membre selon le tableau
3. Annoncer : « Branche active : `feat/<X>` — session pour **Prénom**. »
4. **Refuser tout commit sur `main`, `develop`, ou sur la branche d'un autre membre.**

Si la branche n'est pas une `feat/<prénom>` connue → refuser d'écrire et demander confirmation.

---

## Stratégie de branches

```
main ← develop ← feat/*
```

- `main` : production stable, jamais touché directement — reçoit uniquement des merges depuis `develop`
- `develop` : intégration — toutes les PRs de features ciblent `develop`
- `feat/<prénom>` : branche de travail de chaque membre — PR → `develop`

---

## Mode autonome + décisions sensibles

Tu travailles en **autonomie** : tu exécutes les phases du workflow sans demander d'avis entre chaque batch.

Tu t'arrêtes UNIQUEMENT pour ces **décisions sensibles** :

| Cas                                                       | Raison                    |
| --------------------------------------------------------- | ------------------------- |
| Ajout/suppression d'une dépendance npm                    | Coût lock + sécurité      |
| Modification de `prisma/schema.prisma` au-delà du trivial | Impact migration          |
| Modification de `packages/contracts/`                     | Impact tous consommateurs |
| Suppression de code > 20 lignes                           | Risque perte              |
| Modification d'une convention dans ce CLAUDE.md           | Impact équipe             |
| Décision d'architecture non triviale                      | Nécessite ADR             |
| Changement d'API publique                                 | Compat clients            |
| Action sur `main` ou `develop`                            | Branches protégées        |

Tout le reste : tu décides, tu codes, tu commits, tu loggues.

---

## Workflow vibe code

```
PROBE → SPEC → PLAN → CODE → CHECK → JOURNAL
```

- **PROBE** (lecture seule) — lire spec/vague/ADR concernés, identifier ce qui existe
- **SPEC** — `docs/specs/VAGUE-XX-NN-<slug>.md` rédigée AVANT le code
- **PLAN** — en Plan Mode, tableau `# · Étape · Fichiers · Tests · Risque` (5-15 étapes)
- **CODE** — autonome sauf décisions sensibles, tests écrits EN MÊME TEMPS
- **CHECK** — feature testée navigateur, lint+typecheck+tests verts AVANT commit
- **JOURNAL** — entrée dans `docs/agent-journal/<membre>/`
- **COMMITS** — commits réguliers aux jalons logiques : un commit dès qu'une feature ou sous-tâche passe le CHECK au vert. Jamais un seul gros commit en fin de session ; jamais un commit par micro-édition.

Slash commands : `/feat-start`, `/feat-check`, `/vague-status`, `/adr`, `/journal`, `/onboard`, `/db-migrate`, `/security-audit`, `/tech-debt`.

Subagents (à invoquer **on-demand uniquement**, pas systématiquement — chaque cold-start coûte cher) : `spec-writer`, `frontend-builder`, `backend-builder`, `db-architect`, `reviewer`, `tester`.

---

## Vocabulaire métier impératif

| Code BD                 | Label UI                                           |
| ----------------------- | -------------------------------------------------- |
| `RESPONSABLE_PROGRAMME` | « RP »                                             |
| `ASSISTANT_PROGRAMME`   | **« AC »** (Attaché de Classe — **jamais « AP »**) |
| `ENSEIGNANT`            | « Enseignant »                                     |
| `ETUDIANT`              | « Étudiant »                                       |
| `RESPONSABLE_CLASSE`    | « Délégué »                                        |

**Statuts séance** : `PROVISOIRE` (orange) · `VALIDE` (bleu) · `PUBLIE` (vert)
**Types séance** : `CM`, `TD`, `TP`, `EXAM`, `RATTRAP`, `DEVOIR`, `EVENT`
**Fuseau horaire** : **toujours `Africa/Dakar`** via `@planit/utils/date`, jamais `new Date()` direct.

---

## Conventions code

- TypeScript strict, **pas de `any`**, pas de `as`, pas d'export par défaut (sauf pages/layouts Next.js obligatoires)
- Composants `kebab-case.tsx`, types `PascalCase`, fonctions `camelCase`
- UI labels en **français**, code en **anglais**
- Tokens de `@planit/design-tokens` (pas de hex en dur)
- Validation Zod via `@planit/contracts`
- Tests : Vitest unit + integration, Playwright e2e
- Commits : Conventional Commits (`feat`, `fix`, `refactor`, etc.), en-tête < 72 chars
- `exactOptionalPropertyTypes` activé : une prop optionnelle qui peut être absente **ET** vouloir prendre `undefined` doit être typée `T | undefined` explicitement (`foo?: string | undefined`)
- Pas de `console.log` / `console.warn` / `console.error` dans `apps/backend/src/` — utiliser le logger pino injectable (`@Inject(PINO_LOGGER)`). Linter `no-console` en place sur le backend.

---

## Patterns émergés Vague 01

> Ces patterns sont **acquis** : ne pas les remettre en cause sans ADR. Tout nouveau code suit ces conventions.

### Backend (NestJS)

- **Prisma direct dans les Services** — pas de Repository pattern pour l'instant. Un `SeanceService` consomme `PrismaService` directement. L'extraction `SeanceRepository` est tracée en tech-debt (`REPOSITORY-PATTERN`) et sera faite en V02 conjointement avec `AuthRepository`.
- **Validation Zod systématique** côté contracts via `ZodValidationPipe` global (`apps/backend/src/common/zod-validation.pipe.ts`). Tout DTO de body/query passe par un schéma Zod de `@planit/contracts`. Pas de validation `class-validator`.
- **Logger pino injectable** via `LoggerModule` (`apps/backend/src/common/logger.module.ts`) avec **redacter** sur `password`, `passwordHash`, `token`, `accessToken`, `refreshToken`, `authorization`, `cookie`, `mfaSecret` (variantes top-level **et** profondes `*.field`). Format `pino-pretty` en dev, JSON pur en prod/test.
- **CORS partagé** HTTP + WS : helper unique `common/cors.ts` consommé par `main.ts` et `WsGateway`. Empêche les régressions silencieuses sur le WS lors d'un fix HTTP.
- **Rate limiting global** : `ThrottlerModule` enregistré dans `app.module.ts` (100 req/min/IP). Les mutations sensibles peuvent surcharger via `@Throttle({...})` au niveau contrôleur.
- **PrismaService exporté** depuis `PrismaModule` (`@Global()`) — disponible partout sans `imports` supplémentaire.

### Frontend (Next.js + React 19)

- **Hooks d'acteur courant hardcodés V1** : `useCurrentTeacher()` et `useCurrentStudent()` (`apps/web/src/hooks/`) retournent un seed-id figé. Ils seront fusionnés en un futur `useCurrentActor()` quand l'auth arrivera en V02 (cf. tech-debt `TD-022`).
- **TanStack Query keys centralisées** dans `apps/web/src/lib/queries.ts` (`planningKeys`, etc.). Toute nouvelle query déclare sa clé ici — jamais d'inline.
- **WebSocket via hook** `useRealtimeSessions(userId, options)` (`apps/web/src/hooks/use-realtime-sessions.ts`). Encapsule la connexion `socket.io-client`, le toast de succès, et l'invalidation `planningKeys.all`. À réutiliser tel quel.
- **Tokens depuis `@planit/design-tokens`** — jamais de hex en dur dans les composants. Si un token manque, l'ajouter au package partagé puis le consommer.
- **Vues étudiant/enseignant** quasi-identiques (`/etudiant/page.tsx` ≈ `/enseignant/page.tsx`) : factorisation reportée à V02 (`FACTOR-PAGES`) — attend `useCurrentActor()`.

### Architecture

- **Statut séance V1** : `isPublished: boolean` simple (séance non publiée ou publiée). L'enum à 3 valeurs `PROVISOIRE/VALIDE/PUBLIE` est documentée dans le vocabulaire métier mais pas encore appliquée côté Prisma — bascule prévue V02.
- **Vue planning** : deux composants distincts en V1, `<PlanningGrid>` (RP — drag/resize/copier-coller) vs `<WeekTimeline>` (Enseignant/Étudiant — lecture). Décision de fusion ou de séparation actée par ADR à écrire début V02 (cf. tech-debt `FUSION-PLANNING`).
- **Realtime backend → frontend** : 1 event public en V01 (`session:published`). Cf. ADR-0004 et `docs/runbooks/ws-events.md`.

---

## Patterns émergés Vague 02 (LOT 1 + 2 + infra)

### Auth backend (LOT 1)

- **`@Public()` opt-in, `JwtAuthGuard` global fail-closed** via `APP_GUARD`. Tout endpoint est protégé par défaut — un endpoint public exige `@Public()` explicite (anti-oubli).
- **`@Roles('RESPONSABLE_PROGRAMME', ...)`** au niveau contrôleur/route pour le RBAC backend. Le `role` est embarqué dans le JWT access (`{ sub, role, email }`) — pas de hit BD à chaque requête.
- **`@CurrentUser()`** param decorator pour récupérer `{ id, role, email }` dans un controller. Ne pas accéder à `req.user` directement.
- **Cookies HttpOnly + SameSite=Strict + 2 secrets séparés** (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`). Pas de CSRF token (cf. ADR-0007 §2). `Secure=false` en dev uniquement (sinon le browser refuse en `http://localhost`).
- **Rotation refresh atomique + révocation de famille** : `prisma.$transaction([update old, create new])` ; si refresh révoqué rejoué → `updateMany` sur tous les tokens de la `familyId` (cf. ADR-0005 §5).
- **Throttle login** : `5/min/IP` en prod, `10000` en test (sinon `loginAs` enchaînés bloquent les tests). Pattern aligné sur `ThrottlerModule.forRoot`.

### Packaging des packages internes

- **Packages consommés à l'exécution par Node (`@planit/contracts`, `@planit/utils`)** : **compilés en CJS dans `./dist/`**, exports pointent vers ces builds. Node v24 ESM strict refuse les directory imports (`export * from './date'`) en source TS — d'où l'obligation de builder un JS standard.
- **Packages consommés uniquement par bundlers (`@planit/ui`, `@planit/design-tokens`)** : peuvent rester en source TS direct (Vite/Next.js transpilent).
- **`postinstall`** racine build automatiquement `contracts` + `utils` après chaque `pnpm install` — pas besoin de build manuel après un clone.
- **CI** : step `Build internal packages` avant lint/typecheck/test pour garantir que `dist/` existe.

### Orchestration scripts racine

- **`pnpm -r --parallel`** au lieu de `turbo` dans les scripts racine (`dev`, `build`, `lint`, `typecheck`, `test`). Smart App Control (Win11 22H2+) bloque `turbo.exe` non signé. Trade-off : pas de cache turbo (acceptable à cette taille). Réactivation tracée en tech-debt `TD-031`.

---

## Sécurité — règles dès jour 1

- Aucun secret en dur — `.env.example` documenté, `.env` gitignored, gitleaks actif
- Validation Zod systématique sur tout endpoint
- Logger redacter (jamais `password`/`token`/`mfaSecret` dans les logs)
- Pas de `eval`, pas de `dangerouslySetInnerHTML` sans justification commentée
- RBAC côté serveur sur chaque endpoint sensible (à partir de la Vague 02 où l'auth arrive)
- Schéma Prisma User prêt à l'auth (Vague 02)
- Couverture unit ≥50% sur les services backend obligatoire à partir Vague 02

---

## Soft-locks sur ressources partagées

Avant de toucher à `prisma/schema.prisma`, `packages/contracts/`, `packages/design-tokens/`, `docker-compose.dev.yml`, `Caddyfile` : lire `docs/shared-resources-lock.md`. **Poser un lock** au format `<membre> · <ressource> · <date> · <durée estimée>` ; le libérer en fin de session.

---

## Sync asynchrone (pas de réunion)

Pas de daily, kickoff, mid-sprint, démo, rétro. Tout se synchronise via :

- Fichier vague (`../PLANIT-Strategie-VibeCode/vagues/vague-XX-*.md`) avec statuts `[ ]` `[~]` `[x]`
- Pull Requests GitHub (PR → `develop`)
- `docs/agent-journal/<membre>/`
- `docs/shared-resources-lock.md`

---

## Format journal d'agent

À la fin de chaque feature, écrire `docs/agent-journal/<membre>/<YYYY-MM-DD>-<slug>.md`. Sections obligatoires (1 ligne minimum chacune) :

1. **Directives reçues** — ce que l'humain a demandé
2. **Décisions techniques** — prises en autonomie
3. **Décisions soumises à validation** — celles remontées à Salim
4. **Modifications** — fichiers créés/modifiés/supprimés + tests ajoutés
5. **Phase CHECK — résultats** — lint/typecheck/tests + smoke
6. **Surprises** — blocages, ambiguïtés, ce qui a divergé du plan
7. **Suite** — PR ouverte, prochaine tâche, soft-locks libérés
8. **Mises à jour annexes** — CLAUDE.md, ADR, tech-debt

Slash command : `/journal`.

---

## Structure repo

```
apps/         web · backend · mobile · whatsapp-bot
packages/     contracts · ui · design-tokens · config · utils
infra/        docker-compose.dev.yml · caddy/ · scripts/
docs/         specs/ · architecture/adr/ · runbooks/ · agent-journal/ · shared-resources-lock.md · tech-debt.md
.claude/      agents/ · commands/ · settings.json
```

---

## Pointeurs (les seuls que tu peux suivre)

- Vague active : `../PLANIT-Strategie-VibeCode/vagues/vague-01-index.md` puis `vague-01-lots.md` et `vague-01-scenarios.md` au besoin
- Subagents : `.claude/agents/`
- Slash commands : `.claude/commands/`
- Prototype design : `../PLANIT-IA/`
- ADR : `docs/architecture/adr/`
- Journal d'agent : `docs/agent-journal/<membre>/`
- Tech debt : `docs/tech-debt.md`
