# Journal — Vague 04 LOT 1 : Conteneurisation prod

> **Membre** : Salim (`feat/salim`) · **Date** : 2026-06-07 · **LOT** : Vague 04 — LOT 1 (1.1 → 1.8)

## 1. Directives reçues

Réaliser tout le LOT 1 (conteneurisation prod). Réassignation explicite du LOT à
la session du TL (officiellement Djibril + Oumy dans la répartition V04) — décision
prise via question de cadrage. PR #63 (LOT 0) déjà mergée sur `develop` par Salim ;
`feat/salim` fast-forward sur `develop` avant de démarrer.

## 2. Décisions techniques (autonomes)

- **`pnpm deploy --legacy --prod`** pour le bundle backend : pnpm v10 refuse le deploy
  non-injecté par défaut (`ERR_PNPM_DEPLOY_NONINJECTED_WORKSPACE`) → `--legacy` retenu
  (alternative `inject-workspace-packages=true` = impact lockfile, écartée).
- **Client Prisma régénéré dans le bundle `/app`** après deploy : sous pnpm, `prisma generate`
  écrit dans le store `.pnpm/...`, pas dans un emplacement copié par deploy. On relance
  `prisma generate --schema` avec cwd `/app` (CLI dispo dans le stage build) → client garanti
  dans `/app/node_modules`. `dist` + `prisma` aussi recopiés explicitement (robustesse vs sélection de fichiers de deploy).
- **Migrations via service `migrate` one-shot** (target `build`, qui contient le CLI Prisma) :
  `prisma migrate deploy` puis exit ; le backend `depends_on: migrate (service_completed_successfully)`.
  Évite d'embarquer le CLI Prisma (devDep) dans l'image runtime. **Aucun seed** (LOT 1.8).
- **Cache mount BuildKit du store pnpm** + `npm_config_fetch_retries/timeout` relevés : le réseau
  de cet env coupe (ECONNRESET) sur les gros downloads parallèles. Build **séquentiel** (backend, web).
- **Install filtré** (`--filter @planit/backend...` / `@planit/web...`) pour éviter de tirer Expo/mobile.
- **tini comme PID 1** (`ENTRYPOINT`) pour propager SIGTERM → `enableShutdownHooks` (drain Prisma).
- **Web `output: 'standalone'` + `outputFileTracingRoot`** (racine monorepo) sinon les packages
  `@planit/*` ne sont pas tracés dans le standalone.
- **Caddy TLS piloté par `$CADDY_TLS`** (`internal` par défaut pour localhost/VM, email pour ACME domaine réel).
- **CSP `connect-src` localhost gardé dev-only** (prod = same-origin via Caddy → `'self'`).
- **Validation env fail-fast** via Zod (dep déjà présente, aucune nouvelle) — requis : `DATABASE_URL`,
  `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` (≥32). Le reste a un défaut.
- **Pas de test unitaire `validateEnv`** : la suite backend est 100 % intégration DB (`global-setup`),
  un unitaire isolé y déclencherait le setup Postgres. Le fail-fast est **prouvé par le smoke conteneur**.
  Le pur-unitaire relève du LOT 2 (gate coverage).

## 3. Décisions soumises à validation

- **Réassignation du LOT 1** à la session TL (au lieu de Djibril/Oumy) — validée.
- **Aucune dépendance npm ajoutée.** `pnpm deploy --legacy` = flag CLI, pas un changement de deps.

## 4. Modifications

**Créés** :

- `docs/specs/VAGUE-04-01-conteneurisation.md` (SPEC)
- `apps/backend/Dockerfile` (multi-stage Alpine, non-root, tini, healthcheck `/api/health`)
- `apps/web/Dockerfile` (Next standalone, non-root, healthcheck `/`)
- `.dockerignore`
- `apps/backend/src/common/env.validation.ts` (Zod fail-fast)
- `infra/docker-compose.prod.yml` (postgres, redis, minio, **migrate** one-shot, backend, web, caddy ; limites mem/cpu, rotation logs, healthchecks, `restart: unless-stopped`)
- `infra/caddy/Caddyfile.prod`
- `infra/prod/env/.env.prod.example`

**Modifiés** :

- `apps/backend/src/main.ts` (`validateEnv()` + `enableShutdownHooks()` + `bootstrap().catch` → exit 1)
- `apps/web/next.config.ts` (`output:'standalone'`, `outputFileTracingRoot`, `connect-src` dev-only)
- `docs/shared-resources-lock.md` (lock posé puis libéré)

**Non commités** (gitignored) : `infra/prod/env/.env.prod` (secrets de smoke local).

## 5. Phase CHECK — résultats

- `pnpm --filter @planit/backend typecheck` ✓ · `lint` ✓
- `pnpm --filter @planit/web typecheck` ✓ · `lint` ✓
- `docker compose ... config -q` ✓
- **Smoke conteneur complet** (`up -d` stack 7 services) :
  - migrate : `exit=0` (migrations appliquées, **aucun seed**)
  - postgres/redis/minio/backend/web : **healthy** ; caddy up
  - `GET /api/health` → 200 ; `GET /api/health/ready` → 200 (`database: up`, chaîne Caddy→backend→PG)
  - `GET /` → 307 → `/login` 200 (titre réel, web servi via Caddy)
  - **non-root** : backend & web `uid=1000(node)`
  - **fail-fast** : sans env → message listant `DATABASE_URL`/`JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET`, `exit 1`
  - **arrêt gracieux** : `stop` en 1,1 s (pas de timeout/SIGKILL), exit 143 (SIGTERM), pas d'OOM
  - **restart** `unless-stopped` : backend re-healthy, `/api/health` 200
- Tailles : web **305 MB**, api **646 MB**, migrate 2.45 GB (= stage build, one-shot local).

## 6. Surprises

- Docker Desktop éteint au départ → démarré par l'humain.
- ECONNRESET sur `pnpm install` parallèle → corrigé (cache mount + retries + build séquentiel).
- pnpm v10 deploy non-injecté → `--legacy`.
- `[CORS] FRONTEND_URL non défini…` s'affiche avant `validateEnv` (side-effect d'import de `cors.ts`, pré-existant) — sans impact sur le fail-fast.

## 7. Suite

- LOT 4.4 (scan Trivy image/config) peut consommer ces images.
- LOT 5 (CD) : push GHCR + Railway + VM pull-based à partir des mêmes Dockerfiles.
- LOT 3.1 (perf k6) sur la stack conteneurisée.
- Soft-locks libérés (`infra/`, `next.config.ts`, `main.ts`).
- Dette tracée : `TD-V04-IMG-SIZE`, `TD-V04-DOCKER-CACHE`.

## 8. Mises à jour annexes

- `docs/tech-debt.md` : ajout section V04 Déploiement (image size, cache build).
- Statuts `vague-04-lots.md` 1.1→1.8 passés `[x]` (hors repo équipe).
- CLAUDE.md (patterns conteneurisation) : **reporté au LOT 7.4** (capitalisation clôture vague).
