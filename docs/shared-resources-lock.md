# Shared Resources Lock

> Avant de modifier une ressource partagée, pose un lock ici. Libère-le en fin de session.
> Format : `| Ressource | Membre | Depuis | Motif |`

## Ressources sous lock actif

| Ressource                           | Membre | Depuis     | Motif                                                         |
| ----------------------------------- | ------ | ---------- | ------------------------------------------------------------- |
| `apps/backend/prisma/schema.prisma` | Salim  | 2026-06-12 | V05 LOT 0.3 — multi-tenance École (schema + migration)        |
| `packages/contracts/`               | Salim  | 2026-06-12 | V05 LOT 0.4 — contracts v5 (Ecole, Admin, audit, DTOs scopés) |

## Ressources partagées sensibles

| Ressource                           | Pourquoi sensible                                                     |
| ----------------------------------- | --------------------------------------------------------------------- |
| `apps/backend/prisma/schema.prisma` | Migration BD partagée — casse les autres si modifié sans coordination |
| `packages/contracts/`               | Types partagés backend + frontend — changement = impact dual          |
| `packages/design-tokens/`           | Tokens visuels — changement = impact toutes les apps                  |
| `infra/docker-compose.dev.yml`      | Ports et services partagés                                            |
| `infra/caddy/Caddyfile.dev`         | Routing reverse-proxy                                                 |

## Procédure

1. Avant de toucher une ressource sensible : ajouter une ligne dans le tableau ci-dessus.
2. Pendant le travail : la ressource est bloquée pour les autres (coordination via PR ou chat).
3. En fin de session (merge ou abandon) : supprimer la ligne.
