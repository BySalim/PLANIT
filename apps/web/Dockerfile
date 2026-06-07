# syntax=docker/dockerfile:1
# Image web Next.js 15 — multi-stage Alpine, `output:'standalone'`, non-root
# (V04 LOT 1.2, ADR-0013 §2). Build depuis la RACINE : `docker build -f apps/web/Dockerfile .`

# ── base : Node 24 + pnpm ─────────────────────────────────────────────────────
FROM node:26-alpine AS base
RUN corepack enable
# Store pnpm sur un volume de cache BuildKit + réseau tolérant (cf. Dockerfile backend).
ENV npm_config_store_dir=/pnpm/store
ENV npm_config_fetch_retries=5
ENV npm_config_fetch_retry_maxtimeout=120000
ENV npm_config_fetch_timeout=600000
WORKDIR /repo

# ── build : install + build packages workspace + next build (standalone) ──────
FROM base AS build
ENV NEXT_TELEMETRY_DISABLED=1
# Args build-time : seuls les NEXT_PUBLIC_* sont inlinés dans le bundle client.
ARG NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @planit/web...
# contracts/utils en dist (utils consommé compilé) ; ui/design-tokens transpilés
# par Next via transpilePackages.
RUN pnpm --filter @planit/contracts build \
 && pnpm --filter @planit/utils build \
 && pnpm --filter @planit/web build

# ── runtime : serveur standalone autonome, non-root ───────────────────────────
FROM base AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app
# standalone (tracé depuis la racine via outputFileTracingRoot) : serveur + deps
# minimales, assets statiques, public.
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /repo/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/web/server.js"]
