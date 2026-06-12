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
4. **Refuser tout commit sur `main`, `develop`, `staging`, ou sur la branche d'un autre membre.**

Si la branche n'est pas une `feat/<prénom>` connue (ou une `hotfix/*` explicitement demandée par le TL) → refuser d'écrire et demander confirmation.

---

## Stratégie de branches

```
main ← staging ← develop ← feat/*
                              ↖ hotfix/* → main (urgence prod)
```

- `main` : production stable, jamais touché directement — reçoit uniquement des merges depuis `staging` (ou `hotfix/*`)
- `staging` : **branche de test** — déployée sur la **VM self-host** (serveur de test, tag image `:staging`). Reçoit les PR depuis `develop` (ou `hotfix/*`)
- `develop` : intégration — toutes les PR de features ciblent `develop`
- `feat/<prénom>` : branche de travail de chaque membre — PR → `develop`
- `hotfix/*` : correctif urgent prod — PR → `main`, puis **re-merge dans `develop` + `staging`** pour ne pas régresser au prochain cycle. Création ponctuelle validée par le TL.

> Flux nominal : `feat/* → develop → staging → main`. La VM suit `staging` : toute promotion `develop → staging` est testée sur la VM avant la release `staging → main`. Guards CI : `protect-staging.yml` (source `develop`/`hotfix`) et `protect-main.yml` (source `staging`/`hotfix`).

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
- **URL auditée = `/login` uniquement** (depuis release V02) : le middleware edge redirige toute route applicative en 307 → `/login` en anonyme, donc auditer `/etudiant`/`/enseignant` faisait échouer l'audit `redirects` (faux négatif, le redirect d'auth est légitime) sur la 1ʳᵉ PR strict vers `main`. `/login` est le shell public commun aux 3 acteurs. Auditer le contenu connecté réel = run authentifié (`puppeteerScript`), tracé `TD-LH-AUTH-AUDIT`.
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

## Patterns émergés Vague 03 (référentiel académique + acteur AC + exports)

> Capitalisation de clôture V03 (LOT 8, 2026-06-06). Tout nouveau code suit ces conventions. ADR-0010, ADR-0011, ADR-0012 **confirmés mergés sur develop** — acquis, remettre en cause = nouvel ADR.

### Modèle académique versionné (ADR-0010, LOT 0/1)

- **Année courante = source de vérité unique `AnneeAcademique.etat = 'EN_COURS'`**, avec invariant « **au plus une** EN_COURS » **garanti en base** par un index unique partiel Postgres (`WHERE etat = 'EN_COURS'`), pas seulement applicatif. Résoudre l'année courante via `resolveCurrentYear` (`@planit/utils`) — jamais une date `new Date()`. Toute requête « par défaut année courante » (formations, classes, suivi) filtre sur cette année.
- **Maquette versionnée immuable inter-versions** : `Maquette` → `MaquetteVersion` (1 par année) → `MaquetteModule` (CM/TD/TP/TPE + semestre). « Renouveler » = **cloner** la dernière version vers l'année courante (409 si déjà une version pour l'année). On ne réécrit jamais une version passée — l'historique est préservé.
- **VHE/VHT jamais persistés** : toujours **calculés** via `computeVHE/computeVHT` (`@planit/utils`) à partir du `MaquetteModule`. Aucune colonne d'heures dérivées en base. Même principe que le suivi (heures faites dérivées).
- **Filtre année courante obligatoire sur les agrégats multi-années** : depuis le correctif LOT 9, tout agrégat de séances/classes (ex. pivot enseignant `mesEnseignements`) doit restreindre aux classes dont la formation est sur l'année `EN_COURS` — le modèle V03 a des classes multi-années (2024/2025/2026), un oubli de filtre agrège l'historique. L'angle mort résiduel côté scope RP est tracé `TD-V03-SUIVI-ANNEE`.

### Scope-aware RBAC AC (ADR-0010 V3-D9, LOT 2/6)

- **`AcScopeService` transverse** ([apps/backend/src/ac/ac-scope.service.ts](apps/backend/src/ac/ac-scope.service.ts)) : un AC ne voit que ses **classes assignées** (`AssistantClasse`) + les **salles dont son RP manager est responsable** (`Salle.rpResponsableId`). Le filtrage est **toujours côté serveur**, jamais un masquage UI. Les services scoped (classes, étudiants, salles, suivi, planning) appellent `isAc(role)` puis `getAssignedClasseIds` / `assertCanAccessClasse`. Pour les non-AC, `isAc()` renvoie `false` → aucune restriction (les guards `@Roles` font le reste).
- **Pattern de durcissement scope (LOT 9)** : quand un endpoint accepte un `?classeId=` explicite, **contrôler l'appartenance** avant de renvoyer le scope — AC via `assertCanAccessClasse`, étudiant via ses inscriptions de l'année courante. Sinon fuite de périmètre (un acteur scopé lit une classe hors de son périmètre). Le test de non-régression doit couvrir le cas « acteur scopé + classeId d'une autre classe → 403 ».
- **Assignation RP→AC bornée au management** : un RP n'assigne/retire des classes qu'aux AC qu'il **manage** (`User.managerRpId`). `assertManages` lève 404 (AC inconnu) / 403 (AC d'un autre RP) avant toute mutation.

### Inscriptions + double-diplôme (ADR-0011, LOT 2)

- **Règle double-diplôme garantie en base** : `Inscription` porte `isDoubleDiplome` **dénormalisé** (recopié depuis `Formation.isDoubleDiplome` à l'inscription) + contrainte `@@unique([etudiantId, anneeAcademiqueId, isDoubleDiplome])`. → au plus 1 classe non-DD **et** 1 classe DD par an (≤ 2 inscriptions/an). La violation = contrainte unique Postgres → traduite en **409** par le backend. On dénormalise parce que Postgres ne peut pas indexer à travers une jointure (même arbitrage que smart-dirty V02 : stocker pour garantir).
- **Flow d'inscription email-first + DTO discriminated union** : l'inscription part **toujours de l'email** (`GET /api/etudiants/lookup?email=`), puis `POST /api/classes/:id/inscriptions` avec un body **discriminated union** `{ mode: 'existant', etudiantId }` | `{ mode: 'nouveau', nomComplet, matricule, … }` (Zod `z.discriminatedUnion` dans `@planit/contracts`). Partagé RP **et** AC (AC restreint à ses classes via le scope).

### Exports client-side (V3-D11, LOT 7)

- **Export image/PDF 100% côté client** ([apps/web/src/lib/export.ts](apps/web/src/lib/export.ts)) : `html-to-image` (`toPng`, capture DOM → data-URL) + `jspdf` (PDF A4). Libs validées au spike LOT 0.8 (décision sensible 2 deps actée). Pas de rendu serveur. `toPng` requiert un vrai navigateur (canvas) → **ne pas appeler dans jsdom sans mock** ; les tests mockent le canvas et testent la logique séparément. Le backend n'expose que les **données** d'export (`GET /api/maquette-versions/:vid/export`), le rendu visuel est client.

### Frontend V03

- **Skeletons de chargement par page** ([apps/web/src/components/rp/\*/\*-skeleton.tsx](apps/web/src/components/rp/)) : chaque liste/fiche lourde (classes, formations, étudiants, suivi) a son skeleton dédié monté pendant le `isLoading` TanStack Query. À répliquer pour toute nouvelle page liste/fiche.
- **Routing role-aware sans segment d'acteur (V3-D14)** : une URL unique `/suivi-modules` rend la variante RP/AC · Enseignant · Étudiant selon le rôle (`useRole()`), pas de `/rp/...` vs `/etudiant/...` dupliqués. Les hooks `useRole()` / `useAcScope()` ([apps/web/src/hooks/](apps/web/src/hooks/)) pilotent l'affichage. Pattern à suivre pour toute future vue multi-acteurs.

---

## Patterns émergés Vague 04 — LOT 8 (déploiement réel, production)

> Capitalisation du go-live prod (**ADR-0017**, 2026-06-11). Acquis : tout nouveau code/ops prod suit ces conventions.

- **Prod = 2ᵉ instance de la machinerie VM** (pas de stack prod séparée) : la production (box **Hetzner**, `planit.sn`) réutilise tels quels `infra/docker-compose.prod.yml`, `infra/ansible/site.yml`, `infra/prod/scripts/cd-pull.sh` + `planit-cd.timer`. La seule différence prod ↔ staging vit dans **`/opt/planit/cd.env`** (`IMAGE_TAG=main` vs `staging`) et **`/opt/planit/.env.prod`** (`PLANIT_DOMAIN`, `CADDY_TLS`) — **jamais dans le code/playbook**. La **VM on-prem = staging (`:staging`)**, la **box cloud = prod (`:main`)**. Tout nouvel essentiel prod se branche **par variable**, pas par fork.
- **Scripts d'exploitation one-off dans `apps/backend/src/scripts/`** (compilés en `dist/scripts/`, exécutés dans l'**image runtime** via `docker compose run --rm backend node dist/scripts/<x>.js`) — pattern `revoke-all-sessions`, étendu par `bootstrap-prod` (4 comptes cœur RP/AC/enseignant/étudiant, **idempotent** upsert par email, mdp forts lus de l'env, hashing argon2id ADR-0007) et `reset-password` (faute d'email, TD-003). Toute action admin/ops sensible = un **script CLI** ici (pas d'endpoint HTTP), env-driven + fail-fast. Scripts npm `bootstrap:prod` / `reset:password`.
- **Page publique = groupe `(legal)` hors `(planit)` + allowlist middleware** : une route accessible sans auth se place **hors** du groupe applicatif (qui porte `<RequireAuth>`) et s'ajoute à `PUBLIC_PATHS` dans [middleware.ts](apps/web/src/middleware.ts) (deny-by-default). Les pages légales sont des **server components statiques** (`metadata` + tokens design, zéro JS client). À répliquer pour toute future page publique.
- **Backups prod à 3 niveaux** ([backup.sh](infra/prod/scripts/backup.sh)) : local (rotation GFS) → off-box NFS **TrueNAS** → **off-site cloud S3-compatible (rclone B2/R2)**, dump chiffré **age**. Les 2 cibles off-site sont **fatales** (alerte Uptime Kuma) car couvrent des pannes distinctes (VM détruite / site on-prem KO). Variables dans `cd.env` (`PLANIT_BACKUP_*`).
- **Onboarding prod = manuel via l'UI V03** : référentiel **et** étudiants saisis à la main (étudiants par le flux d'inscription **email-first** existant). **Pas d'import de masse** (décision TL — évite une dépendance de parsing). Pas d'écran admin (différé, `TD-V04-ADMIN-PROVISIONING`). Reset mot de passe au pilote = CLI (emails différés, TD-003).

### Maquette pilotée par la formation + double-diplôme filière (ADR-0018)

> Capitalisation issue de l'onboarding prod réel (révise ADR-0010/0011). **Acquis** : remettre en cause = nouvel ADR.

- **La maquette est un sous-produit automatique de la formation** : on ne crée/renomme/renouvelle **plus** une maquette directement (endpoints `POST /maquettes`, `PUT /maquettes/:id`, `POST /maquettes/:id/renew` **retirés**). `FormationsService.create` appelle `MaquettesService.ensureMaquetteAndVersion(tx, …)` dans **une transaction** : find-or-create `Maquette(filière, niveau)` puis version de l'année courante (réutilise → renouvelle par clone profond modules+heures → sinon vide). `/maquettes` = **lecture + composition** uniquement.
- **Création formation = filière + niveau** ; tout le reste **dérivé serveur** via helpers purs `@planit/utils` (mêmes formules backend + aperçu front) : `formationCode` (`{SIGLE}-{NIVEAU}-{libelléAnnée}`, ex. `GLRS-L3-2025-2026`), `maquetteNom` (`Maquette {niveau} {sigle}`), `semestreAbsolu`/`semestreLabel` (rang 1|2 → S1…S10 selon niveau). Garde `@@unique([filiereId, niveau, anneeAcademiqueId])` sur Formation (+ 409 lisible) ; `@@unique([filiereId, niveau])` sur Maquette (nom hors clé).
- **Composition = on ajoute un _module_, l'UE suit** : un module ajouté démarre à **0 h** ; l'UE n'est jamais ajoutée explicitement (déduite de `Module.ueId`, sert d'en-tête de regroupement). Sélecteur = [add-module-modal.tsx](apps/web/src/components/rp/maquettes/add-module-modal.tsx) (modale par semestre, recherche, groupé par UE avec couleurs réelles, exclut les modules déjà présents).
- **`isDoubleDiplome` = propriété de la `Filiere`** (retiré de `Formation`). Classes/inscriptions le **dérivent** via `Classe → Formation → Filiere`. `Inscription.isDoubleDiplome` reste **dénormalisé** (clé du `@@unique` ADR-0011 inchangé) ; seule la **source** change (`isDoubleDiplomeInscription` lit `formation.filiere.isDoubleDiplome`). Migration `20260612080000_formation_maquette_autoflow` (l'index partiel `EN_COURS` n'est pas touché).

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
