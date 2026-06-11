import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { Logger } from 'pino';
import { AppModule } from '../app.module';
import { AuthService } from '../auth/auth.service';
import { PINO_LOGGER } from '../common/logger.module';

/**
 * CLI admin — déconnecte **tous** les utilisateurs (révoque tous les refresh
 * tokens actifs). VOEU-002. Pas d'endpoint HTTP : action sensible réservée à
 * l'exploitation/incident, lancée depuis la machine hôte.
 *
 * Exécution PROD (VM, image runtime → JS compilé, pas de ts-node) :
 *   docker compose --env-file /opt/planit/.env.prod -f infra/docker-compose.prod.yml \
 *     exec backend node dist/scripts/revoke-all-sessions.js
 *
 * Local : `pnpm --filter @planit/backend build && node dist/scripts/revoke-all-sessions.js`
 * (DATABASE_URL requis dans l'environnement).
 *
 * `createApplicationContext` n'ouvre AUCUN serveur HTTP/WS (pas de port) ; seul
 * PrismaService se connecte à Postgres (onModuleInit), puis `app.close()` draine.
 */
async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const logger = app.get<Logger>(PINO_LOGGER);
  try {
    const { revoked } = await app.get(AuthService).revokeAllSessions();
    logger.warn({ revoked }, `[admin] ${revoked} session(s) révoquée(s)`);
    process.stdout.write(
      `\n[admin] ${revoked} session(s) révoquée(s). Re-login requis pour tous les utilisateurs.\n\n`,
    );
  } finally {
    await app.close();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`\n[admin] Échec de la révocation des sessions :\n${message}\n\n`);
    process.exit(1);
  });
