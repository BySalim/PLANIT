import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { Logger } from 'pino';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { corsOrigin } from './common/cors';
import { PINO_LOGGER } from './common/logger.module';
import { ZodValidationPipe } from './common/zod-validation.pipe';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

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
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = process.env['PORT'] ?? 3001;
  await app.listen(port);
  logger.info({ port }, `[PLANIT] Backend running on http://localhost:${port}`);
  logger.info({ port }, `[PLANIT] Swagger docs: http://localhost:${port}/docs`);
}

void bootstrap();
