import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import type { Logger } from 'pino';
import { AppModule } from '../../src/app.module';
import { AllExceptionsFilter } from '../../src/common/all-exceptions.filter';
import { PINO_LOGGER } from '../../src/common/logger.module';
import { ZodValidationPipe } from '../../src/common/zod-validation.pipe';

/**
 * Bootstrap the real Nest application for integration tests, mirroring the
 * runtime config of `src/main.ts` (global `/api` prefix + Zod pipe +
 * AllExceptionsFilter pour normaliser le format des erreurs).
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  // cookie-parser : indispensable depuis V02 LOT 1 — les strategies
  // passport-jwt extraient les cookies `access`/`refresh` via `req.cookies`.
  app.use(cookieParser());
  app.useGlobalPipes(new ZodValidationPipe());
  const logger = app.get<Logger>(PINO_LOGGER);
  app.useGlobalFilters(new AllExceptionsFilter(logger));
  await app.init();
  return app;
}
