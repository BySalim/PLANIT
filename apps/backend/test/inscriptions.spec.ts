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
const inscUrl = (classeId: string): string => `/api/classes/${classeId}/inscriptions`;

/**
 * Inscriptions (B.3/B.4 / V3-D7). Classes 2025 : GL3-A/GL2-A non-DD, GLM1-A DD.
 * Moussa/Bineta/Cheikh non inscrits cette année. AC assignée à GL3-A.
 */
describe('Inscriptions (B.3/B.4)', () => {
  it('inscrit un étudiant existant (mode existant) → 201', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api()
      .post(inscUrl('seed-classe-gl2a'))
      .set('Cookie', session.cookieHeader)
      .send({ mode: 'existant', email: 'moussa.fall@planit.test' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ classeId: 'seed-classe-gl2a', isDoubleDiplome: false });
  });

  it("inscrit un nouvel étudiant (mode nouveau) → crée l'User ETUDIANT + 201", async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api()
      .post(inscUrl('seed-classe-gl2a'))
      .set('Cookie', session.cookieHeader)
      .send({
        mode: 'nouveau',
        email: 'nouveau.etudiant@planit.test',
        nomComplet: 'Nouveau Étudiant',
        matricule: 'ISM-2025-9999',
      });
    expect(res.status).toBe(201);

    const created = await prisma.user.findUnique({
      where: { email: 'nouveau.etudiant@planit.test' },
    });
    expect(created?.role).toBe('ETUDIANT');
    expect(created?.matricule).toBe('ISM-2025-9999');
  });

  it('mode existant avec email inconnu → 404', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api()
      .post(inscUrl('seed-classe-gl2a'))
      .set('Cookie', session.cookieHeader)
      .send({ mode: 'existant', email: 'inconnu@planit.test' });
    expect(res.status).toBe(404);
  });

  it('mode nouveau avec email déjà utilisé → 409', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api()
      .post(inscUrl('seed-classe-gl2a'))
      .set('Cookie', session.cookieHeader)
      .send({
        mode: 'nouveau',
        email: 'ibrahima.sow@planit.test', // existe déjà
        nomComplet: 'X',
        matricule: 'ISM-2025-0000',
      });
    expect(res.status).toBe(409);
  });

  it('refuse une 2ᵉ inscription de même catégorie la même année → 409', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    // Ibrahima est déjà inscrit en GL3-A (non-DD, 2025) → GL2-A (non-DD) refusé.
    const res = await api()
      .post(inscUrl('seed-classe-gl2a'))
      .set('Cookie', session.cookieHeader)
      .send({ mode: 'existant', email: 'ibrahima.sow@planit.test' });
    expect(res.status).toBe(409);
  });

  it('autorise non-DD + DD la même année (≤ 2, 1 par catégorie)', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    // Bineta : GL2-A (non-DD) puis GLM1-A (DD) → les deux passent.
    const nonDd = await api()
      .post(inscUrl('seed-classe-gl2a'))
      .set('Cookie', session.cookieHeader)
      .send({ mode: 'existant', email: 'bineta.diop@planit.test' });
    expect(nonDd.status).toBe(201);

    const dd = await api()
      .post(inscUrl('seed-classe-glm1a'))
      .set('Cookie', session.cookieHeader)
      .send({ mode: 'existant', email: 'bineta.diop@planit.test' });
    expect(dd.status).toBe(201);
    expect(dd.body).toMatchObject({ isDoubleDiplome: true });
  });

  it('désinscription (DELETE) → 204', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api()
      .delete('/api/inscriptions/seed-insc-ndoye-2025')
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(204);
    const gone = await prisma.inscription.findUnique({ where: { id: 'seed-insc-ndoye-2025' } });
    expect(gone).toBeNull();
  });

  it('un AC peut inscrire dans SA classe (GL3-A)', async () => {
    const session = await loginAs(app, 'ASSISTANT_PROGRAMME');
    const res = await api()
      .post(inscUrl('seed-classe-gl3a'))
      .set('Cookie', session.cookieHeader)
      .send({ mode: 'existant', email: 'moussa.fall@planit.test' });
    expect(res.status).toBe(201);
  });

  it('un AC ne peut pas inscrire hors de son périmètre (GL2-A) → 403', async () => {
    const session = await loginAs(app, 'ASSISTANT_PROGRAMME');
    const res = await api()
      .post(inscUrl('seed-classe-gl2a'))
      .set('Cookie', session.cookieHeader)
      .send({ mode: 'existant', email: 'moussa.fall@planit.test' });
    expect(res.status).toBe(403);
  });
});
