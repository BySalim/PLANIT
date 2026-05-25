import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createTestApp } from './helpers/app';
import { loginAs } from './helpers/auth';
import { resetDb } from './helpers/db';

const prisma = new PrismaClient();
let app: INestApplication;

beforeAll(async () => {
  app = await createTestApp();
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

beforeEach(async () => {
  await resetDb(prisma);
});

const api = (): ReturnType<typeof request> => request(app.getHttpServer());

describe('GET /api/settings (B.10)', () => {
  it('renvoie les paramètres seed (8h-20h) sans authentification', async () => {
    const res = await api().get('/api/settings');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ dayStartHour: 8, dayEndHour: 20 });
  });
});

describe('PUT /api/settings (B.10)', () => {
  it('met à jour les heures côté RP', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api()
      .put('/api/settings')
      .set('Cookie', session.cookieHeader)
      .send({ dayStartHour: 9, dayEndHour: 19 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ dayStartHour: 9, dayEndHour: 19 });
  });

  it('refuse 403 pour un étudiant', async () => {
    const session = await loginAs(app, 'ETUDIANT');
    const res = await api()
      .put('/api/settings')
      .set('Cookie', session.cookieHeader)
      .send({ dayStartHour: 9 });
    expect(res.status).toBe(403);
  });

  it('refuse 400 si dayStartHour >= dayEndHour', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api()
      .put('/api/settings')
      .set('Cookie', session.cookieHeader)
      .send({ dayStartHour: 20, dayEndHour: 8 });
    expect(res.status).toBe(400);
  });

  it('refuse 401 sans cookie', async () => {
    const res = await api().put('/api/settings').send({ dayStartHour: 9 });
    expect(res.status).toBe(401);
  });
});
