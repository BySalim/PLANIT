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

describe('GET /api/filieres (B.9)', () => {
  it('liste les 2 filières seed', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api().get('/api/filieres').set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('refuse 403 pour un étudiant', async () => {
    const session = await loginAs(app, 'ETUDIANT');
    const res = await api().get('/api/filieres').set('Cookie', session.cookieHeader);
    expect(res.status).toBe(403);
  });
});

describe('POST /api/filieres (B.9)', () => {
  it('crée une filière', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api().post('/api/filieres').set('Cookie', session.cookieHeader).send({
      sigle: 'INFO',
      libelle: 'Informatique',
      isDoubleDiplome: false,
      grade: 'LICENCE',
    });
    expect(res.status).toBe(201);
    expect(res.body.sigle).toBe('INFO');
  });

  it('refuse 409 si sigle déjà utilisé', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api()
      .post('/api/filieres')
      .set('Cookie', session.cookieHeader)
      .send({ sigle: 'GLRS', libelle: 'Doublon', isDoubleDiplome: false, grade: 'LICENCE' });
    expect(res.status).toBe(409);
  });
});

describe('PUT /api/filieres/:id (B.9)', () => {
  it('met à jour le libellé', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api()
      .put('/api/filieres/seed-filiere-glrs')
      .set('Cookie', session.cookieHeader)
      .send({ libelle: 'GLRS Renommé' });
    expect(res.status).toBe(200);
    expect(res.body.libelle).toBe('GLRS Renommé');
  });

  it('renvoie 404 sur id inconnu', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api()
      .put('/api/filieres/ghost-id')
      .set('Cookie', session.cookieHeader)
      .send({ libelle: 'X' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/filieres/:id (B.9)', () => {
  it('refuse 409 si la filière est référencée par des classes', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api()
      .delete('/api/filieres/seed-filiere-glrs')
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(409);
  });

  it('supprime une filière sans dépendances', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    // Crée une filière jetable (sans classe/maquette/formation). En V03 la
    // filière GL porte désormais une formation MASTER double-diplôme + sa
    // classe, donc on ne peut plus s'en servir comme filière « vide ».
    const created = await api()
      .post('/api/filieres')
      .set('Cookie', session.cookieHeader)
      .send({ sigle: 'TMP', libelle: 'Filière jetable', isDoubleDiplome: false, grade: 'LICENCE' });
    const res = await api()
      .delete(`/api/filieres/${created.body.id}`)
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(204);
  });
});
