import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import type { Logger } from 'pino';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { corsOrigin } from './common/cors';
import { validateEnv } from './common/env.validation';
import { PINO_LOGGER } from './common/logger.module';
import { ZodValidationPipe } from './common/zod-validation.pipe';

async function bootstrap(): Promise<void> {
  // Fail-fast : refuse de démarrer si une variable d'env requise manque (LOT 1.5).
  validateEnv();

  const app = await NestFactory.create(AppModule);

  // Arrêt gracieux (LOT 1.7, V4-D11) : Nest écoute SIGTERM/SIGINT et déclenche
  // les hooks `onModuleDestroy` (ex. PrismaService.$disconnect) → drain propre
  // des connexions avant l'arrêt du conteneur (pas de requête coupée brutalement).
  app.enableShutdownHooks();

  app.setGlobalPrefix('api');

  // cookie-parser pose `req.cookies` — requis par les strategies passport-jwt
  // (extracteurs depuis les cookies HttpOnly `access` et `refresh`).
  app.use(cookieParser());

  app.useGlobalPipes(new ZodValidationPipe());

  // Filter global : normalise toutes les erreurs HTTP et log via pino.
  const logger = app.get<Logger>(PINO_LOGGER);
  app.useGlobalFilters(new AllExceptionsFilter(logger));

  // CORS HTTP — voir common/cors.ts pour la logique partagée HTTP + WS.
  app.enableCors({ origin: corsOrigin(), credentials: true });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('PLANIT API')
    .setDescription("API de la plateforme de gestion des emplois du temps de l'ISM Dakar")
    .setVersion('0.1.0')
    // Auth V02 via cookies HttpOnly (ADR-0007 §2) — pas de Bearer token.
    .addCookieAuth('access')
    .addCookieAuth('refresh')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = process.env['PORT'] ?? 3001;
  await app.listen(port);
  logger.info({ port }, `[PLANIT] Backend running on http://localhost:${port}`);
  logger.info({ port }, `[PLANIT] Swagger docs: http://localhost:${port}/docs`);
}

bootstrap().catch((err: unknown) => {
  // Avant `NestFactory.create`, le logger pino n'existe pas encore : on écrit
  // sur stderr (autorisé par `no-console`) puis on sort en code ≠ 0 (fail-fast).
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`\n[PLANIT] Échec du démarrage du backend :\n${message}\n\n`);
  process.exit(1);
});
