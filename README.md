# PLANIT

> Plateforme de gestion des emplois du temps -- ISM Dakar

Monorepo pnpm workspaces developpe en vibe-code autonome par une equipe de 5 etudiants ISM.

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
| Build           | pnpm workspaces + `pnpm -r --parallel`          |

## Demarrage rapide

### Pre-requis

- Node.js >= 22
- pnpm >= 10
- Docker + Docker Compose

### Setup

```bash
# 1. Installer les dependances
# (le postinstall build @planit/contracts et @planit/utils en CJS dist/
#  -- requis car le backend Node v24 les consomme via require())
pnpm install

# 2. Configurer l environnement
cp .env.example .env
# Editer .env avec vos valeurs

# 3. Lancer l infra (postgres + redis + minio)
docker compose -f infra/docker-compose.dev.yml up -d

# 4. Migrer + seeder la base de donnees (1 RP, 3 enseignants, 1 etudiant, 6 seances)
pnpm db:reset

# 5. (Optionnel) Creer la base de test pour les tests d'integration backend
#    Automatique sur volume Postgres neuf ; sinon :
docker compose -f infra/docker-compose.dev.yml exec postgres \
  psql -U planit -c 'CREATE DATABASE planit_test;'

# 6. Lancer le dev
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
pnpm test        # Vitest — backend integration (16 tests) + web smoke
pnpm build       # Build de production
pnpm format      # Prettier
```

## Setup local -- FAQ

Problemes recurrents rencontres par l'equipe pendant la Vague 01. Version
detaillee dans [docs/runbooks/local-setup-faq.md](docs/runbooks/local-setup-faq.md).

| Symptome                                             | Cause                                                                                                | Solution                                                                                                                                                  |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install` qui timeout (depuis Dakar)            | Latence registry npm vers l'Europe                                                                   | `pnpm install --fetch-timeout=180000 --fetch-retries=5`                                                                                                   |
| `pnpm db:reset` echoue avec `connection refused`     | Docker pas demarre                                                                                   | `docker compose -f infra/docker-compose.dev.yml up -d postgres redis`                                                                                     |
| `pg_isready` timeout en boucle                       | Postgres pas pret ou port deja pris                                                                  | Verifier `docker ps` ; tuer un autre Postgres local (`lsof -i :5432`)                                                                                     |
| Glob WSL qui timeout (Windows)                       | Acces via UNC (`\\wsl.localhost\...`)                                                                | Travailler depuis le filesystem ext4 natif WSL (`/home/user/...`), pas en UNC                                                                             |
| `chmod` / `EACCES` sur fichiers en pre-commit        | Permissions read-only laisses par un build                                                           | `chmod u+w <fichier>` puis retenter le commit                                                                                                             |
| `EPERM` Prisma sur Windows lors de `prisma generate` | Process `node`/`tsc` qui locke `dist/`                                                               | Tuer le watch (`Ctrl+C` sur `pnpm dev`) puis relancer `pnpm db:generate`                                                                                  |
| `ERR_UNSUPPORTED_DIR_IMPORT` au demarrage du backend | `packages/{contracts,utils}/dist/` manquant (Node v24 ESM refuse les directory imports en source TS) | `pnpm install` -- le `postinstall` rebuild contracts + utils. Sinon manuel : `pnpm --filter @planit/contracts build && pnpm --filter @planit/utils build` |
| `spawn UNKNOWN` sur `pnpm dev` (Windows 11 22H2+)    | Smart App Control bloque `turbo.exe` non signe                                                       | Les scripts racine utilisent desormais `pnpm -r` (cf. `package.json`) -- plus de turbo invoque                                                            |

## Secrets en production

**Avant tout deploiement reel**, changer obligatoirement les variables
suivantes (cf. `.env.example` racine et `apps/backend/.env.example`) :

- [ ] `JWT_SECRET` -- generer 64 octets random : `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- [ ] `REFRESH_TOKEN_SECRET` -- meme commande, **valeur distincte** de `JWT_SECRET`
- [ ] `DATABASE_URL` -- pointer sur Postgres prod (jamais `localhost` / `planit_dev_password`)
- [ ] `MINIO_ACCESS_KEY` et `MINIO_SECRET_KEY` -- credentials prod, jamais `minioadmin`/`planit_minio_dev`
- [ ] `RESEND_API_KEY` -- cle Resend (ou autre provider) reelle, pas `re_xxxxxxxx`
- [ ] `WHATSAPP_SESSION_PATH` -- chemin persistant hors container (volume Docker)
- [ ] `ORANGE_SMS_API_KEY` -- cle Orange Senegal reelle, pas un placeholder
- [ ] `FRONTEND_URL` -- domaine prod (`https://planit.ism.edu.sn`), pas `localhost:3000`
- [ ] `NODE_ENV=production`

`gitleaks` est branche en pre-commit -- une cle reelle commitee fera echouer
le hook. Si une cle a fuite malgre tout : la **revoque immediatement** chez le
provider avant tout `git push --force`.

## Equipe

| Membre                        | Branche        | Role                     |
| ----------------------------- | -------------- | ------------------------ |
| Salim (@BySalim)              | `feat/salim`   | Tech Lead                |
| Oumy (@oumy-code)             | `feat/oumy`    | Frontend Web             |
| Libasse (@cheelee08)          | `feat/libasse` | Frontend Mobile + Design |
| Oumar (@papiuzumaki)          | `feat/oumar`   | Backend                  |
| Djibril (@pape-djibrilbousso) | `feat/djibril` | DevOps                   |

## Documentation

- [Architecture + ADR](docs/architecture/README.md)
- [Runbook deploiement](docs/runbooks/deploy.md)
- [Tech Debt](docs/tech-debt.md)
- [Specs vague en cours](docs/specs/)
- [Journaux d'agent](docs/agent-journal/)

## Licence

Copyright (c) 2026 Salim Ouedraogo. Tous droits reserves.
Ce logiciel est proprietaire -- voir le fichier [LICENSE](./LICENSE).
