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
const rp = (): Promise<{ cookieHeader: string }> => loginAs(app, 'RESPONSABLE_PROGRAMME');

/**
 * LOT 1 A.6 — Formations (V3-D4). Seed (année courante 2025-2026) :
 * GLRS-L3-2025, GLRS-L2-2025, GL-M1-2025 (DD) ; année 2024 : GLRS-L2-2024.
 */
describe('Formations (A.6)', () => {
  it('liste par défaut = année courante uniquement', async () => {
    const session = await rp();
    const res = await api().get('/api/formations').set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    const codes = (res.body as { code: string }[]).map((f) => f.code).sort();
    expect(codes).toEqual(['GL-M1-2025', 'GLRS-L2-2025', 'GLRS-L3-2025']);
    // La formation 2024 n'apparaît PAS par défaut.
    expect(codes).not.toContain('GLRS-L2-2024');
  });

  it('filtre par anneeId explicite (année clôturée)', async () => {
    const session = await rp();
    const res = await api()
      .get('/api/formations?anneeId=seed-annee-2024')
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    expect((res.body as { code: string }[]).map((f) => f.code)).toEqual(['GLRS-L2-2024']);
  });

  it('détail formation : anneeLibelle + classeCount', async () => {
    const session = await rp();
    const res = await api()
      .get('/api/formations/seed-form-glrs-l3')
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ code: 'GLRS-L3-2025', anneeLibelle: '2025-2026' });
    expect(res.body.classeCount).toBeGreaterThanOrEqual(2); // GL3-A + GL3-B
  });

  it("crée une formation pour l'année courante (version de l'année)", async () => {
    const session = await rp();
    const res = await api().post('/api/formations').set('Cookie', session.cookieHeader).send({
      code: 'GLRS-M2-2025',
      niveau: 'M2',
      filiereId: 'seed-filiere-glrs',
      maquetteVersionId: 'seed-maqv-glrs-l3-2025', // version année courante
      isDoubleDiplome: false,
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ code: 'GLRS-M2-2025', anneeLibelle: '2025-2026' });
  });

  it('refuse une version de maquette hors année courante → 400', async () => {
    const session = await rp();
    const res = await api().post('/api/formations').set('Cookie', session.cookieHeader).send({
      code: 'GLRS-X-2025',
      niveau: 'L2',
      filiereId: 'seed-filiere-glrs',
      maquetteVersionId: 'seed-maqv-glrs-l2-2024', // version 2024 (clôturée)
      isDoubleDiplome: false,
    });
    expect(res.status).toBe(400);
  });

  it('refuse un code de formation déjà utilisé → 409', async () => {
    const session = await rp();
    const res = await api().post('/api/formations').set('Cookie', session.cookieHeader).send({
      code: 'GLRS-L3-2025', // déjà seedé
      niveau: 'L3',
      filiereId: 'seed-filiere-glrs',
      maquetteVersionId: 'seed-maqv-glrs-l3-2025',
      isDoubleDiplome: false,
    });
    expect(res.status).toBe(409);
  });

  it('AC reçoit 403 (formations hors périmètre AC)', async () => {
    const session = await loginAs(app, 'ASSISTANT_PROGRAMME');
    expect((await api().get('/api/formations').set('Cookie', session.cookieHeader)).status).toBe(
      403,
    );
  });

  it('étudiant reçoit 403', async () => {
    const session = await loginAs(app, 'ETUDIANT');
    expect((await api().get('/api/formations').set('Cookie', session.cookieHeader)).status).toBe(
      403,
    );
  });
});
