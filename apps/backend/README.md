# @planit/backend

API NestJS de PLANIT — planning, séances, publication temps réel.

## Démarrage

```bash
# Depuis la racine du monorepo
pnpm install
docker compose -f infra/docker-compose.dev.yml up -d
pnpm --filter @planit/backend db:reset    # migration + seed
pnpm --filter @planit/backend dev          # http://localhost:3001
```

Swagger : <http://localhost:3001/docs>

## Scripts

```bash
pnpm --filter @planit/backend dev          # nest start --watch
pnpm --filter @planit/backend build        # prisma generate + nest build
pnpm --filter @planit/backend start        # node dist/main (prod)
pnpm --filter @planit/backend test         # vitest run (intégration)
pnpm --filter @planit/backend lint         # eslint --max-warnings 0
pnpm --filter @planit/backend typecheck    # tsc --noEmit
pnpm --filter @planit/backend db:migrate   # prisma migrate dev
pnpm --filter @planit/backend db:reset     # prisma migrate reset + seed
pnpm --filter @planit/backend db:generate  # prisma generate
pnpm --filter @planit/backend db:seed      # ts-node prisma/seed.ts
```

## Structure

```
src/
  app.module.ts              # racine, importe PrismaModule + SeanceModule + WsModule
  main.ts                    # bootstrap, Swagger /docs, CORS
  common/
    prisma.module.ts         # @Global() — PrismaService injectable partout
    prisma.service.ts
    zod-validation.pipe.ts   # Pipe Nest qui valide via un schema Zod
  health/                    # GET /api/health
  seance/
    seance.module.ts
    seance.controller.ts     # 6 routes /api/sessions
    seance.service.ts        # logique métier + calcul des cibles WS
    seance.mapper.ts         # Prisma Seance → SessionDto (ISO dates)
  ws/
    ws.module.ts
    ws.gateway.ts            # Socket.IO — rooms user:<id>, event session:published

prisma/
  schema.prisma              # User, Classe, Module, Salle, Seance
  migrations/                # historique des migrations Prisma
  seed.ts                    # CLI seed (idempotent, upsert)
  seed-data.ts               # seedDatabase() — réutilisé par les tests

test/
  global-setup.ts            # prisma migrate deploy sur planit_test
  helpers/{app,db}.ts        # createTestApp(), resetDb()
  seance.spec.ts             # 16 tests d'intégration (supertest)
  setup.ts
```

## Endpoints

Toutes les routes sont sous `/api/sessions` et documentées dans Swagger (tag
**Sessions**). Validation des body/query via `ZodValidationPipe` +
`@planit/contracts`.

| Méthode | Route                                                     | Rôle                                            |
| ------- | --------------------------------------------------------- | ----------------------------------------------- |
| `GET`   | `/api/sessions?weekStart&classeId?&teacherId?&studentId?` | Liste de la semaine                             |
| `POST`  | `/api/sessions`                                           | Créer une séance                                |
| `GET`   | `/api/sessions/stats?weekStart&classeId?`                 | Compteurs `{total, published, pending, byType}` |
| `GET`   | `/api/sessions/:id`                                       | Détail                                          |
| `PUT`   | `/api/sessions/:id`                                       | Mettre à jour (repasse `isPublished=false`)     |
| `POST`  | `/api/sessions/publish?classeId?`                         | Publier les pending + WS targeted               |

Spec complète : [`docs/specs/VAGUE-01-04-backend-planning.md`](../../docs/specs/VAGUE-01-04-backend-planning.md)

## WebSocket

- Handshake : `io('http://localhost:3001', { auth: { userId: '<id>' } })`
- Au connect, la gateway joint la room `user:<userId>`
- Sur `POST /api/sessions/publish`, l'event `session:published` est émis
  **uniquement** aux rooms des enseignants et étudiants concernés —
  `{ sessions: SessionDto[] }`

## Tests

Suite d'intégration : 16 specs supertest exécutées sur une base **dédiée**
`planit_test` (ne touche jamais `planit_dev`).

```bash
pnpm --filter @planit/backend test
```

La base `planit_test` est créée automatiquement au premier `docker compose up`
(via `infra/postgres/initdb/`). Si le volume existe déjà :

```bash
docker compose -f infra/docker-compose.dev.yml exec postgres \
  psql -U planit -c 'CREATE DATABASE planit_test;'
```

## Variables d'environnement

Voir [`.env.example`](.env.example). Variables clés :

- `DATABASE_URL` — connexion Postgres (default `planit_dev`)
- `PORT` — port HTTP (default `3001`)
- `FRONTEND_URL` — origine CORS autorisée (default `http://localhost:3000`)

## Liens

- [Spec backend LOT 1](../../docs/specs/VAGUE-01-04-backend-planning.md)
- [ADR-0003 packaging Node](../../docs/architecture/adr/0003-shared-packages-built-for-node-runtime.md)
- [Architecture + ADR](../../docs/architecture/README.md)
