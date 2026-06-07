# syntax=docker/dockerfile:1
# Image backend NestJS — multi-stage Alpine, non-root (V04 LOT 1.1, ADR-0013 §2).
# Build depuis la RACINE du monorepo : `docker build -f apps/backend/Dockerfile .`

# ── base : Node 24 (.nvmrc) + pnpm via corepack + tini (PID 1) ────────────────
FROM node:26-alpine AS base
RUN corepack enable && apk add --no-cache tini
# Store pnpm sur un volume de cache BuildKit + réseau tolérant (cet env a un
# réseau instable sur les gros downloads → sinon ECONNRESET).
ENV npm_config_store_dir=/pnpm/store
ENV npm_config_fetch_retries=5
ENV npm_config_fetch_retry_maxtimeout=120000
ENV npm_config_fetch_timeout=600000
WORKDIR /repo

# ── build : install workspace + build packages + client Prisma + Nest ─────────
FROM base AS build
# Tout le repo (node_modules/dist/.next exclus via .dockerignore).
COPY . .
# Install filtré au sous-graphe backend (évite Expo/web) ; argon2 musl résolu ici.
# Cache mount = les paquets déjà téléchargés sont réutilisés entre builds/retries.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @planit/backend...
# Packages runtime (CJS dist) requis par le backend + client Prisma + build Nest.
RUN pnpm --filter @planit/contracts build \
 && pnpm --filter @planit/utils build \
 && pnpm --filter @planit/backend exec prisma generate \
 && pnpm --filter @planit/backend build
# Bundle prod auto-portant (flat node_modules, devDeps élaguées) dans /app, puis
# on garantit dist + prisma + client généré dans le bundle (indépendant de la
# sélection de fichiers de `pnpm deploy`).
RUN pnpm --filter @planit/backend deploy --legacy --prod /app \
 && rm -rf /app/dist /app/prisma \
 && cp -r apps/backend/dist /app/dist \
 && cp -r apps/backend/prisma /app/prisma \
 && cd /app && /repo/apps/backend/node_modules/.bin/prisma generate --schema=./prisma/schema.prisma

# ── runtime : image minimale non-root ─────────────────────────────────────────
FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /app ./
USER node
EXPOSE 3001
# Liveness : ne touche pas la BD (cf. health.controller.ts §liveness).
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# tini = PID 1 : propage SIGTERM → Node → enableShutdownHooks (drain Prisma).
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main"]
