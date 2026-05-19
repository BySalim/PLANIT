# Runbook — Déploiement PLANIT

> Vague 00 — Bootstrap. Ce runbook sera complété à la Vague finale (Hetzner CX22).

## Pré-requis

- Accès SSH au serveur Hetzner CX22
- Variables d'environnement de production configurées
- Docker + Docker Compose installés sur le serveur

## Étapes (placeholder)

1. `git pull origin main`
2. `pnpm install --frozen-lockfile`
3. `pnpm db:migrate`
4. `pnpm build`
5. `docker compose -f infra/docker-compose.prod.yml up -d`

## Rollback

```bash
git revert HEAD && git push origin main
```
