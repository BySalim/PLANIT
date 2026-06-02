import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { HealthController } from '../src/health/health.controller';
import { PrismaService } from '../src/common/prisma.service';
import { PINO_LOGGER } from '../src/common/logger.module';

describe('HealthController (e2e)', () => {
  let app: INestApplication;
  const queryRaw = vi.fn();

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        // Mock Prisma : pas de vraie BD dans ce test, on pilote $queryRaw.
        { provide: PrismaService, useValue: { $queryRaw: queryRaw } },
        { provide: PINO_LOGGER, useValue: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health renvoie le statut liveness', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const res = await request(server).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', service: 'planit-backend' });
  });

  it('GET /health/ready renvoie 200 quand la BD répond', async () => {
    queryRaw.mockResolvedValueOnce([{ ok: 1 }]);
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const res = await request(server).get('/health/ready');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', checks: { database: 'up' } });
  });

  it('GET /health/ready renvoie 503 quand la BD est injoignable', async () => {
    queryRaw.mockRejectedValueOnce(new Error('connection refused'));
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const res = await request(server).get('/health/ready');
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ checks: { database: 'down' } });
  });
});
