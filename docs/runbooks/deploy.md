# Runbook — Déploiement PLANIT (V04 LOT 5.6)

> Remplace le placeholder Hetzner. PLANIT vise **3 cibles** de déploiement (ADR-0013 ;
> beta affinée par ADR-0015). Chaque cible a sa procédure détaillée ; ce fichier est l'aiguillage.

## Chaîne d'images (commune)

Le workflow **Build & push images** ([build-images.yml](../../.github/workflows/build-images.yml)) construit et publie sur GHCR, à chaque push `develop`/`main` :

- `ghcr.io/bysalim/planit-api:<tag>` (backend runtime)
- `ghcr.io/bysalim/planit-web:<tag>` (web standalone)
- `ghcr.io/bysalim/planit-migrate:<tag>` (one-shot `prisma migrate deploy`)

Tags : `:develop`, `:main` (mouvants), `:sha-xxxx` (immuable, rollback), `:latest` (main). Images **privées** — la VM s'authentifie au pull (`docker login ghcr.io`, PAT `read:packages` ; cf. [vm-self-host.md §3bis](vm-self-host.md)).

## Cible 1 — Per-dev (poste local)

Développement quotidien — **pas** la stack prod : voir [local-setup-faq.md](local-setup-faq.md).
Pour tester la stack prod-like en local : `docker compose --env-file infra/prod/env/.env.prod -f infra/docker-compose.prod.yml up -d --build`.

## Cible 2 — VM self-host (on-prem, Local/LAN) ✅ active

Procédure complète : **[vm-self-host.md](vm-self-host.md)**. Résumé :

1. Réseau VirtualBox bridged → IP LAN de la VM.
2. Provisioning Ansible (`infra/ansible/`) : Docker + durcissement + agent CD.
3. `.env.prod` (`PLANIT_DOMAIN=planit.local`, `CADDY_TLS=internal`, secrets).
4. `docker compose ... pull && up -d` (images GHCR, **pas de build sur la VM**).
5. Trust CA interne Caddy + hosts `planit.local` → `https://planit.local`.
6. **CD pull-based** (`planit-cd.timer`) : poll GHCR → pull → migrate → smoke → rollback.

Reprise sur incident / DR : [incident-dr.md](incident-dr.md).

## Cible 3 — Beta cloud (Neon + Koyeb + Vercel) — ✅ active

Remplace Railway (essai expiré) — **ADR-0015**. Beta publique **gratuite** : **Neon** (Postgres) +
**Koyeb** (backend NestJS depuis l'image GHCR) + **Vercel** (web Next.js). Pas de Redis (inerte), pas
de MinIO (exports client-side). Accès derrière **basic-auth**, comptes seed à mot de passe fort.

Procédure complète : **[beta-cloud.md](beta-cloud.md)**. Résumé :

1. **Neon** : projet Postgres → `DATABASE_URL` (`sslmode=require`).
2. **Koyeb** : service Docker depuis `ghcr.io/bysalim/planit-api` (image privée → creds registre), env
   `DATABASE_URL`/`JWT_*`/`FRONTEND_URL`/`NODE_ENV=production`, health `/api/health`.
3. **Vercel** : root `apps/web`, `BACKEND_ORIGIN` (rewrite `/api` → Koyeb), `NEXT_PUBLIC_WS_URL`, `BETA_BASIC_AUTH`.
4. **CI** `deploy-beta.yml` (branche `beta`, Environment `beta`) : migrate Neon → redeploy Koyeb → smoke.

## Rollback

- **VM** : auto (agent CD, smoke KO) ou manuel (cf. [vm-self-host.md §9](vm-self-host.md#9-rollback-manuel)).
- **Code** : `develop`/`main` protégées → PR de revert (jamais de push direct).
