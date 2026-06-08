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

## Cible 3 — Beta publique (Cloudflare Tunnel sur la VM) — ✅ active

Remplace Railway puis Neon+Koyeb+Vercel (free tiers devenus payants) — **ADR-0015**. La beta **réutilise
la VM self-host** (cible 2) exposée sur Internet via **Cloudflare Tunnel** (`cloudflared`), **sans ouvrir
de port** (connexion sortante seule). Rien à louer : Postgres/web/backend viennent de la VM. Rideau
d'accès = **Cloudflare Access** (gratuit, ≤ 50 users).

Procédure complète : **[beta-tunnel.md](beta-tunnel.md)**. Résumé :

1. **VM self-host** opérationnelle (cible 2) + un **domaine géré par Cloudflare** (URL stable).
2. **Tunnel** (dashboard CF) → token → `CLOUDFLARE_TUNNEL_TOKEN` dans `.env.prod`.
3. `docker compose … --profile tunnel up -d cloudflared` (service **opt-in**).
4. **Public hostname** `beta.<domaine>` → `https://caddy:443` (No-TLS-Verify, Host = `PLANIT_DOMAIN`).
5. **Cloudflare Access** : policy email = beta-testeurs. Seed comptes (`SEED_PASSWORD` fort).

## Rollback

- **VM** : auto (agent CD, smoke KO) ou manuel (cf. [vm-self-host.md §9](vm-self-host.md#9-rollback-manuel)).
- **Code** : `develop`/`main` protégées → PR de revert (jamais de push direct).
