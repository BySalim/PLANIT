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

| Membre                        | Branche        | Spécialité **indicative**        |
| ----------------------------- | -------------- | -------------------------------- |
| Salim Ouedraogo (@BySalim)    | `feat/salim`   | Tech Lead — arbitrage, ADR, spec |
| Oumy (@oumy-code)             | `feat/oumy`    | Frontend Web                     |
| Libasse (@cheelee08)          | `feat/libasse` | Frontend Mobile + design         |
| Oumar (@papiuzumaki)          | `feat/oumar`   | Backend (NestJS, Prisma)         |
| Djibril (@pape-djibrilbousso) | `feat/djibril` | DevOps + intégrations            |

> **⚠️ Les « spécialités » sont indicatives, pas contraignantes.** Ce qui détermine le travail d'un membre, c'est **le LOT qui lui est assigné**, pas son rôle nominal. La spécialité reflète juste l'expertise principale ; en pratique, **n'importe qui peut prendre n'importe quel LOT** (frontend, backend, devops, design) si la répartition de la vague le prévoit.
>
> **Le Tech Lead (Salim) décide qui fait quel LOT**, vague par vague, en fonction de la charge et des disponibilités. La répartition officielle se trouve dans `../PLANIT-Strategie-VibeCode/vagues/vague-XX-lots.md` (section « Répartition par membre »). Cette répartition fait foi.
>
> **Conséquence pour toi (Claude)** :
>
> - **NE PAS** flagger qu'un membre touche un fichier hors de sa spécialité nominale comme un problème (ex. Oumar qui code du frontend, Djibril qui touche au backend). Tant que c'est sur **sa propre branche** et que ça correspond à **son LOT assigné**, c'est légitime.
> - Le seul cross-domain qui mérite alerte, c'est **modifier la branche d'un autre membre** ou **bypasser la répartition de la vague** sans accord du TL.
> - En review, juger le travail sur ses mérites techniques (qualité, conformité spec, tests, conventions) — pas sur la corrélation rôle ↔ fichiers touchés.

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

### Patterns émergés post-LOT 2 (polish batch 2026-05-28)

> Ajustements pratiques sortis de l'usage interactif du planning V02. Détails complets dans `docs/agent-journal/salim/2026-05-28-vague02-polish-batch.md`.

- **Lazy load mode lite/full sur les list endpoints** — pattern appliqué sur `GET /ues`. Mode **lite par défaut** (UE seules + `moduleCount` via Prisma `_count`) → mount initial instantané. `?withModules=true` réactive le mode legacy pour les consommateurs qui ont besoin du nested (formulaire séance). Schéma Zod : champ `modules` rendu `.optional()` + ajout `moduleCount?: number` — un seul schéma couvre les deux modes. Le lazy fetch d'un détail (modules d'une UE déployée) passe par un endpoint dédié (`GET /ues/:ueId/modules`) + un hook React Query avec `enabled` piloté par l'état UI. À répliquer pour tout endpoint où la volumétrie nested pourrait dépasser ~100 KB.
- **Optimistic update sur les mutations V2** — pattern dans `useUpdateSessionV2Mutation` ([mutations-v2.ts](apps/web/src/lib/mutations-v2.ts)) : `onMutate` snapshot toutes les query lists matchant `planningV2Keys.all` puis patch immédiat ; `onError` rollback complet depuis le snapshot ; `onSettled` invalide pour resync sur l'autorité serveur (smart-dirty, `hasUnpublishedChanges`). Effet : drag&drop / resize / undo bougent la carte instantanément, rollback automatique si 429 ou autre erreur. À répliquer sur les autres mutations V2 (create / delete / publish) quand un besoin de fluidité similaire émerge — pas avant (complexité non gratuite).
- **Throttle calibré par usage réel** — `@Throttle({ limit: 60, ttl: 60_000 })` sur les mutations consommées par des interactions répétées (drag, resize, undo Promise.all). Garder 10/min pour les actions ponctuelles (create, delete, publish). Le défaut global 100/min/IP du `ThrottlerModule` reste le filet de sécurité. Toujours commenter le pourquoi du throttle au-dessus du décorateur.
- **Sidebar active state = best-match par href le plus long** ([sidebar.tsx](apps/web/src/components/layout/sidebar.tsx)) : `pathname.startsWith(item.href)` matche tout préfixe et fait apparaître plusieurs items actifs simultanément (ex. Planning + UE & Modules pour `/rp/ue-modules`). Calcul correct : filtrer les items dont `pathname === href || pathname.startsWith(href + '/')`, puis prendre le href le plus long. Un seul item actif, toujours le plus spécifique. Pattern à appliquer à toute future page imbriquée.
- **AbortController sur les fetch d'effets** — tout `useEffect` qui `fetch` puis `dispatch` doit cancel au cleanup. Sans ça, en test jsdom (et en navigation Next.js réelle pour les pages quittées), la résolution post-démontage déclenche un `dispatch` sur un environnement mort → React 19 lève `ReferenceError: window is not defined`, Vitest exit 1 malgré tests verts. Pattern dans [auth-context.tsx](apps/web/src/contexts/auth-context.tsx) — `AbortController` + flag `cancelled` lus dans `.then()`/`.catch()`, cleanup `useEffect` appelle `abort()`.
- **DevToolsFloater** (`apps/web/src/components/dev/dev-tools-floater.tsx`) — remplace l'ancien `<DevAuthBadge>` de V2-D16. Bouton rond gear draggable, position persistée dans `localStorage`, panneau auto-positionné côté libre de viewport. Gate `process.env.NODE_ENV !== 'development'` dans le wrapper exporté (tree-shake en build prod). Pour ajouter un nouvel outil de dev (test interactif d'une vue, switch de comportement, etc.) → étendre le panneau intérieur, pas créer un autre flottant.
- **Shell `surface`** ([shell.tsx](apps/web/src/components/layout/shell.tsx)) — prop optionnel qui fait passer le wrapper + le `<main>` en `bg-surface` (blanc). Utilisé sur les pages RP non-Planning (Enseignants, Filières, UE & Modules) pour un fond clair uniforme sans carte interne. Planning garde son `fullBleed` (grille blanche occupe tout). Pas de stats / subtitle dans le header en V2 — décision actée sur toute page RP non-Planning.

### Lighthouse CI — signal partout, gating à deux niveaux

- **Le job `lighthouse` tourne sur toutes les PRs** ciblant `develop`/`main`. Chaque dev voit l'impact perf/a11y/SEO de ses changements dès l'ouverture de la PR, via les artefacts uploadés (rapports HTML accessibles depuis Actions et via les liens `storage.googleapis.com` postés dans les logs).
- **Gating à deux niveaux** :
  - PR ciblant `main` (release `develop → main`) → **toujours bloquante**, auto-strict, pas besoin de label. C'est le moment où on garantit la qualité officielle.
  - PR ciblant `develop` → bloquante **uniquement si** la PR porte le label `lighthouse-strict`. Sinon `continue-on-error: true` — annotations warning mais job vert.
- **Politique des seuils dans `.github/lighthouserc.json`** : catégories `performance` ≥ 0.85 et `accessibility` ≥ 0.9 restent `error` (non-négociables, on score actuellement 0.97 / 1.0). Tous les **audits a11y critiques** (`landmark-one-main`, `image-alt`, `unsized-images`, `html-has-lang`, `meta-viewport`, `color-contrast`, etc.) restent `error`. **Onze audits non actionnables dans le scope V02** sont explicitement downgrade à `warn` : `csp-xss` (chantier nonce → `TD-LH-CSP-NONCE`), `errors-in-console` (401 audit anonyme légitime → `TD-LH-CONSOLE-AUTHME`), `total-byte-weight` + 5 audits perf + 3 audits cache (sprint perf V03 → `TD-LH-PERF`). Liste complète et justification dans le runbook.
- **Backend obligatoire dans le job LH** depuis pré-release V02 : sans lui, le fetch initial `/auth/me` du AuthProvider lance un `ERR_CONNECTION_REFUSED` que Chrome log en console. Le job lance désormais Postgres + backend dummy avant d'auditer le frontend.
- **Usage du label** : pose `lighthouse-strict` sur une PR feature pour une responsabilisation ponctuelle ou un sprint perf. Pas par défaut sur develop — sinon on retombe dans l'effet « Lighthouse rouge récurrent ignoré ».
- **Pour repasser un audit `warn` en `error`** : adresser la dette (`TD-LH-*`), confirmer score réel ≥ 0.9 sur 2 runs consécutifs, retirer la ligne du tableau `assertions` dans `lighthouserc.json`. Documenter dans le runbook.
- Détails dans `docs/runbooks/ci-lighthouse.md`.

### Patterns émergés clôture Vague 02 (2026-05-31)

> Capitalisation finale avant tag `v0.2.0`. Tout nouveau code suit ces conventions.

- **Pattern auth frontend complet** ([auth-context.tsx](apps/web/src/contexts/auth-context.tsx) + [require-auth.tsx](apps/web/src/components/auth/require-auth.tsx) + [middleware.ts](apps/web/src/middleware.ts) + [api.ts](apps/web/src/lib/api.ts) + [forbidden-listener.tsx](apps/web/src/components/auth/forbidden-listener.tsx)) : `<AuthProvider>` dans root layout boot via `fetch('/auth/me')`, `useAuth()` retourne `{ state, login, logout }` où `state.status ∈ {loading, authenticated, unauthenticated}`. **`middleware.ts` = gating _optimiste_ (pattern Next 15)** : vérifie la présence du cookie `access` et redirige non-auth → `/login?returnUrl=…`, et `/login`+cookie → cible. Sécurité réelle = guards RBAC backend (le middleware est UX, pas la frontière). `<RequireAuth roles={...}>` reste pour l'enforcement **par rôle** (JWT opaque côté edge) + filet. **`returnUrl`** validé anti open-redirect via `safeReturnUrl` ([lib/return-url.ts](apps/web/src/lib/return-url.ts)), partagé middleware + page `/login` (en `<Suspense>` pour `useSearchParams`). `app/page.tsx` = résolveur client `ROLE_HOME[role]`. Intercepteur 401 dans `request()` tente UN refresh atomique (singleton `pendingRefresh`) puis rejoue ; échec → `/login`. 403 → `CustomEvent('api:forbidden')` → `<ForbiddenListener>`. **AuthProvider StrictMode-safe** : le chemin de succès du `fetch('/auth/me')` ne dépend PAS d'un flag `cancelled` muté par le cleanup (sinon, sous double-invoke + proxy rapide, le dispatch est skippé → bloqué en `loading`) ; seuls les rejets `signal.aborted` sont ignorés.
- **Proxy same-origin dev = mirror prod** ([next.config.ts](apps/web/next.config.ts) `rewrites()` `/api/:path*` → backend ; prod = Caddy). `API_BASE='/api'` (relatif) → cookies d'auth **first-party**, pas de CORS, dev == prod. Le WebSocket garde une URL absolue (`WS_URL`). **⚠️ Piège CSP/eval** : la CSP `script-src` doit inclure **`'unsafe-eval'` en DEV uniquement** — Next dev (webpack `eval-source-map`) exécute les modules via `eval()` ; sans ça, **React n'hydrate pas** (app non-interactive : login muet, spinners infinis), et un audit Lighthouse (prod, sans eval) ne le détecte pas. Toujours tester une CSP en `next dev` ET `next start`.
- **Gate hooks de données sur `state.status === 'authenticated'`** ([queries.ts](apps/web/src/lib/queries.ts), [use-realtime-sessions.ts](apps/web/src/hooks/use-realtime-sessions.ts)) : les hooks `useWeekSessionsQuery`, `useSessionDetailQuery`, `useWeekStatsQuery` lisent `useAuth()` et conditionnent `enabled`. `useRealtimeSessions` n'ouvre pas le socket avant auth. Bénéfice : aucun fetch/socket sortant pendant la fenêtre entre mount et redirection RequireAuth — pas de bruit console (audit Lighthouse `errors-in-console`), pas de 401 inutiles côté backend. À répliquer sur tout nouveau hook qui consomme un endpoint protégé. Tests : `vi.mock('@/contexts/auth-context')` retournant `state.status: 'authenticated'` pour préserver l'intention nominale (cf. `apps/web/src/hooks/__tests__/use-week-sessions-query.test.tsx`).
- **Pattern smart dirty** (V2-D7, ADR-0008) : source de vérité serveur = `Seance.publishedSnapshot` (JSON figé du dernier publish) + `hasUnpublishedChanges` recalculé à chaque `GET` ([apps/backend/src/seance-v2/seance-v2.service.ts](apps/backend/src/seance-v2/seance-v2.service.ts)). Client peut diffrer en local pour réactivité immédiate du badge ; retour à l'état publié → snapshot identique → badge disparaît automatiquement. Le `publishedSnapshot` est comparé avec normalisation (tri des clés) pour éviter les faux dirty dus à l'ordre JSON. À conserver inchangé tant qu'on n'a pas d'usage cross-session.
- **Pattern undo/redo client-side** (V2-D11, LOT 4) : `useUndoRedo<T>()` ([packages/ui/src/hooks/](packages/ui/src/hooks/use-undo-redo.ts)), pile bornée (50), scope = frame d'édition non publiée. Chaque action push `{ action, payload, inverse }` ; `CTRL+Z` rejoue `inverse`, `CTRL+SHIFT+Z` rejoue `action`. `publish()` vide la pile. Pas d'undo cross-session (refresh = pile vide). Boutons toolbar miroir des raccourcis. Pour étendre à de nouvelles mutations : capture `inverse` au moment du push (snapshot, pas reference) — sinon rollback partiel sur mutations chainées.
- **Pattern multi-classes** (V2-D6) : `Seance ↔ Classe` en N-N via table jointure `SeanceClasse`. Filtre API `?classeId=X` matche toute séance dont la jointure contient X (et non plus égalité directe). Le frontend reçoit `classes: ClasseDto[]` (pas `classe: ClasseDto`) sur le SessionV2Dto. Composant `<ClasseChipsPicker>` ([apps/web/src/components/planning/classe-chips-picker.tsx](apps/web/src/components/planning/classe-chips-picker.tsx)) pour la sélection multiple. Migration depuis V01 : ajout de la table jointure + script de copie `classeId → SeanceClasse(seanceId, classeId)`.
- **ADR-0007, ADR-0008, ADR-0009 confirmés mergés sur develop** (Vague 02). Ces décisions sont **acquises** : remettre en cause = nouvel ADR.

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
