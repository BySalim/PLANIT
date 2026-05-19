# PLANIT

> Plateforme de gestion des emplois du temps -- ISM Dakar

Monorepo Turborepo + pnpm developpe en vibe-code autonome par une equipe de 5 etudiants ISM.

## Stack

| Couche          | Technologie                                     |
| --------------- | ----------------------------------------------- |
| Frontend Web    | Next.js 15 + React 19 + Tailwind v4 + shadcn/ui |
| Backend         | NestJS + Prisma + Zod + Swagger + Socket.IO     |
| Mobile          | Expo (Vague 04)                                 |
| WhatsApp Bot    | Baileys (Vague 04)                              |
| Base de donnees | PostgreSQL 16 + Prisma                          |
| Cache           | Redis 7 + BullMQ                                |
| Fichiers        | MinIO                                           |
| Build           | Turborepo + pnpm                                |

## Demarrage rapide

### Pre-requis

- Node.js >= 22
- pnpm >= 10
- Docker + Docker Compose

### Setup

```bash
# 1. Installer les dependances
pnpm install

# 2. Configurer l environnement
cp .env.example .env
# Editer .env avec vos valeurs

# 3. Lancer l infra (postgres + redis + minio)
docker compose -f infra/docker-compose.dev.yml up -d

# 4. Migrer la base de donnees
pnpm db:migrate

# 5. Lancer le dev
pnpm dev
```

L application est accessible sur :

- **Frontend** : http://localhost:3000
- **Backend** : http://localhost:3001
- **Swagger** : http://localhost:3001/docs
- **MinIO Console** : http://localhost:9001

## Commandes utiles

```bash
pnpm lint        # ESLint sur tous les packages
pnpm typecheck   # TypeScript strict sur tous les packages
pnpm test        # Vitest sur tous les packages
pnpm build       # Build de production
pnpm format      # Prettier
```

## Equipe

| Membre                        | Branche        | Role                     |
| ----------------------------- | -------------- | ------------------------ |
| Salim (@BySalim)              | `feat/salim`   | Tech Lead                |
| Oumy (@oumy-code)             | `feat/oumy`    | Frontend Web             |
| Libasse (@cheelee08)          | `feat/libasse` | Frontend Mobile + Design |
| Oumar (@papiuzumaki)          | `feat/oumar`   | Backend                  |
| Djibril (@pape-djibrilbousso) | `feat/djibril` | DevOps                   |

## Documentation

- [Architecture](docs/architecture/README.md)
- [ADR-0001 : Monolithe modulaire Turborepo](docs/architecture/adr/0001-monolithe-modulaire-turborepo.md)
- [Runbook deploiement](docs/runbooks/deploy.md)
- [Tech Debt](docs/tech-debt.md)

## Licence

Copyright (c) 2026 Salim Ouedraogo. Tous droits reserves.
Ce logiciel est proprietaire -- voir le fichier [LICENSE](./LICENSE).
