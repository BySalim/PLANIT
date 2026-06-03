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

/**
 * LOT 1 A.1 — AnneeAcademique (V3-D1 / ADR-0010).
 * Seed : 2024-2025 (CLOTUREE), 2025-2026 (EN_COURS), 2026-2027 (PLANIFIEE).
 */
describe('Années académiques (A.1)', () => {
  it('refuse 401 sans cookie', async () => {
    expect((await api().get('/api/annees')).status).toBe(401);
  });

  it('liste triée par début décroissant (tous rôles authentifiés)', async () => {
    const session = await loginAs(app, 'ENSEIGNANT');
    const res = await api().get('/api/annees').set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    const libelles = (res.body as { libelle: string }[]).map((a) => a.libelle);
    expect(libelles).toEqual(['2026-2027', '2025-2026', '2024-2025']);
  });

  it("GET /current renvoie l'unique année EN_COURS", async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api().get('/api/annees/current').set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ libelle: '2025-2026', etat: 'EN_COURS' });
  });

  it('RP crée une année PLANIFIEE', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api()
      .post('/api/annees')
      .set('Cookie', session.cookieHeader)
      .send({
        libelle: '2027-2028',
        debut: new Date(Date.UTC(2027, 8, 1)).toISOString(),
        fin: new Date(Date.UTC(2028, 7, 31)).toISOString(),
      });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ libelle: '2027-2028', etat: 'PLANIFIEE' });
  });

  it('refuse une 2ᵉ année EN_COURS (409, garde V3-D1)', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api()
      .post('/api/annees')
      .set('Cookie', session.cookieHeader)
      .send({
        libelle: '2027-2028',
        debut: new Date(Date.UTC(2027, 8, 1)).toISOString(),
        fin: new Date(Date.UTC(2028, 7, 31)).toISOString(),
        etat: 'EN_COURS',
      });
    expect(res.status).toBe(409);
  });

  it("refuse un libellé d'année déjà utilisé (409)", async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api()
      .post('/api/annees')
      .set('Cookie', session.cookieHeader)
      .send({
        libelle: '2025-2026', // déjà seedé
        debut: new Date(Date.UTC(2030, 8, 1)).toISOString(),
        fin: new Date(Date.UTC(2031, 7, 31)).toISOString(),
      });
    expect(res.status).toBe(409);
  });

  it("refuse PUT vers EN_COURS si une autre l'est déjà (409)", async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api()
      .put('/api/annees/seed-annee-2026') // PLANIFIEE → EN_COURS
      .set('Cookie', session.cookieHeader)
      .send({ etat: 'EN_COURS' });
    expect(res.status).toBe(409);
  });

  it("refuse l'écriture à un étudiant (403, RP only)", async () => {
    const session = await loginAs(app, 'ETUDIANT');
    const res = await api()
      .post('/api/annees')
      .set('Cookie', session.cookieHeader)
      .send({
        libelle: '2099-2100',
        debut: new Date(Date.UTC(2099, 8, 1)).toISOString(),
        fin: new Date(Date.UTC(2100, 7, 31)).toISOString(),
      });
    expect(res.status).toBe(403);
  });
});
