import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
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
  app.useGlobalPipes(new ZodValidationPipe());
  const logger = app.get<Logger>(PINO_LOGGER);
  app.useGlobalFilters(new AllExceptionsFilter(logger));
  await app.init();
  return app;
}
