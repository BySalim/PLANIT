# VAGUE-04-01 — Conteneurisation prod (LOT 1)

> **Statut** : **En cours**. **Demandeur** : Salim (TL, réassignation du LOT 1 à sa session).
> **Branche** : `feat/salim` (base `develop` @ #63 mergé). **Cadre** : ADR-0013 (déploiement), ADR-0014 (qualité), conventions `docs/runbooks/v04-conventions-qualite-infra.md`.
> **Lié à** : LOT 5 (CD consomme les images), LOT 4.4 (scan d'image), LOT 3.1 (perf sur stack conteneurisée).

## 1. Problème

PLANIT est démontrable en local (`pnpm dev` + `docker-compose.dev` pour PG/Redis/MinIO) mais **n'a aucune image conteneurisée**. Pas de `Dockerfile`, pas de `.dockerignore`, pas de `docker-compose.prod`, pas de `Caddyfile.prod`. Sans ça, ni la VM self-host ni Railway (LOT 5) ne peuvent être déployés, et le scan d'image (LOT 4.4) n'a rien à analyser.

## 2. Décision (cadrée par ADR-0013 §2-§4)

Produire **deux images Docker** (`planit-api`, `planit-web`) multi-stage Alpine, non-root, et une **stack prod** orchestrée par Caddy, démarrable d'une commande.

### Contraintes techniques relevées (PROBE)

| Fait                                                                                                         | Conséquence Dockerfile                                                                                         |
| ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Monorepo pnpm@10.33.4, workspace `apps/*`+`packages/*`, Node ≥22 (`.nvmrc`=24)                               | Base `node:24-alpine`, `corepack enable`, install via `pnpm` au niveau racine                                  |
| `postinstall` build `@planit/contracts` + `@planit/utils` (→ `dist/`, CJS)                                   | Le stage build doit avoir ces dist avant de builder backend/web                                                |
| Backend : `build = prisma generate && nest build` → `dist/`, `start = node dist/main`                        | Stage runtime = `node dist/main` + `@prisma/client` généré + `prisma/` (pour `migrate deploy`)                 |
| Backend health : `/api/health` (liveness, **sans** dépendance) + `/api/health/ready` (DB)                    | Healthcheck Docker → `/api/health` (liveness), readiness exploitée par compose/Caddy                           |
| Web : Next 15, `transpilePackages` pour `ui/design-tokens/contracts/utils`, **pas** de `output:'standalone'` | Ajouter `output:'standalone'`, copier `.next/standalone` + `.next/static` + `public`, `start = node server.js` |
| Web `next.config.ts` : rewrite `/api/*`→`BACKEND_ORIGIN`, CSP avec `connect-src localhost:3001`              | En prod Caddy fait le proxy `/api` ; CSP prod doit autoriser l'origine prod (var)                              |
| `ui/design-tokens/config` = source TS (pas de build)                                                         | Pas de dist à produire ; Next les transpile au build web                                                       |

### Conventions images (ADR-0013 §2, runbook)

- `ghcr.io/bysalim/planit-api:<sha>` et `ghcr.io/bysalim/planit-web:<sha>` (tags `:develop`/`:main` = pointeurs).
- Multi-stage Alpine, process **non-root** (`USER node`), devDeps élaguées, logs stdout/stderr.
- `HEALTHCHECK` backend sur `/api/health`.

### Stack `docker-compose.prod.yml` (ADR-0013 §3)

`web` + `backend` + `postgres` + `redis` + `minio` + `caddy`. Caractéristiques (V4-D11) :

- `restart: unless-stopped` partout.
- Limites `mem_limit`/`cpus` + rotation logs (`logging` driver `json-file` `max-size`/`max-file`).
- Healthchecks sur chaque service.
- Backend applique `prisma migrate deploy` **seul au démarrage** — **aucun seed auto** (1.8).
- `Caddyfile.prod` : TLS auto (domaine réel) **ou** CA interne (VM on-prem), `/api/*` + `/docs*` → backend, reste → web.

### Secrets / env (1.5, ADR-0013 §8)

- `infra/prod/env/.env.prod.example` documenté, **build args** (`NEXT_PUBLIC_*`) vs **runtime** séparés.
- **Validation d'env fail-fast au boot** backend : schéma Zod (`zod` déjà dispo via contracts, **aucune dep nouvelle**) qui valide les variables requises (`DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `REDIS_URL`, …) → le process refuse de démarrer si une variable manque.

### Arrêt gracieux (1.7, V4-D11)

- `app.enableShutdownHooks()` + écoute `SIGTERM`/`SIGINT` → `app.close()` (Nest ferme Prisma/connexions proprement). Tini comme PID 1 dans l'image (`--init` ou `tini`) pour propager les signaux.

## 3. Non-objectifs (hors LOT 1)

- Workflow CI build/push GHCR → **LOT 1/5** (la convention de tag est posée ici, le push est LOT 5).
- Déploiement Railway / VM pull-based / backups TrueNAS → **LOT 5**.
- Scan Trivy image/config → **LOT 4.4** (le Dockerfile doit juste être scannable).
- MinIO sur Railway → optionnel (V4-D8, exports client-side).

## 4. Critères d'acceptation (Done LOT 1)

1. `docker build` des 2 images réussit, images **non-root**, tailles raisonnables (Alpine multi-stage).
2. `docker compose -f infra/docker-compose.prod.yml up` démarre **toute** la stack ; `migrate deploy` appliqué ; **pas de seed auto**.
3. `GET /api/health` → 200 derrière Caddy ; web servie ; `/api/health/ready` → 200 (DB up).
4. Arrêt gracieux : `docker compose stop` ferme sans erreur, `restart: unless-stopped` redémarre sans coupure de données.
5. Variable requise manquante → backend **refuse de démarrer** avec un message clair (fail-fast).
6. `lint` + `typecheck` verts sur les fichiers TS modifiés (`main.ts`, `next.config.ts`, module env).

## 5. Plan de tests

- **Smoke compose** (1.6) : `docker compose -f infra/docker-compose.prod.yml up --build` → attendre healthy → `curl /api/health` 200 → `curl /` web 200 → `curl /api/health/ready` 200.
- **Fail-fast** : démarrer le backend sans `JWT_ACCESS_SECRET` → exit ≠ 0 + log explicite.
- **Arrêt gracieux** : `docker compose stop backend` → logs montrent la fermeture propre (pas de connexion tuée brutalement).
- **Non-root** : `docker run --rm planit-api id` → uid ≠ 0.
