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

function validBody(): Record<string, unknown> {
  return {
    nomComplet: 'Mme Aïssatou Diop',
    emailInstitutionnel: 'aissatou.diop@planit.test',
    password: 'TempPwd123!',
    whatsapp: '+221 77 000 00 99',
    statut: 'VACATAIRE',
    specialite: 'Cryptographie',
  };
}

describe('GET /api/enseignants (B.6)', () => {
  it('liste les 3 enseignants seed avec pagination', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api().get('/api/enseignants').set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.items).toHaveLength(3);
    expect(res.body.page).toBe(1);
  });

  it('filtre par statut', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api()
      .get('/api/enseignants?statut=VACATAIRE')
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1); // Mamadou Ba
    expect(res.body.items[0].statut).toBe('VACATAIRE');
  });

  it('refuse 403 pour un étudiant', async () => {
    const session = await loginAs(app, 'ETUDIANT');
    const res = await api().get('/api/enseignants').set('Cookie', session.cookieHeader);
    expect(res.status).toBe(403);
  });

  it('autorise un AC en lecture (V3-D9 G.6)', async () => {
    const session = await loginAs(app, 'ASSISTANT_PROGRAMME');
    const res = await api().get('/api/enseignants').set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(3);
  });
});

describe('POST /api/enseignants (B.6)', () => {
  it('crée un Enseignant + User atomiquement', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api()
      .post('/api/enseignants')
      .set('Cookie', session.cookieHeader)
      .send(validBody());
    expect(res.status).toBe(201);
    expect(res.body.nomComplet).toBe('Mme Aïssatou Diop');
    expect(res.body.userId).toBeTruthy();
    // Le User correspondant existe avec un passwordHash
    const user = await prisma.user.findUnique({ where: { id: res.body.userId } });
    expect(user?.role).toBe('ENSEIGNANT');
    expect(user?.passwordHash).toBeTruthy();
  });

  it('refuse 409 si email déjà utilisé', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const dupe = { ...validBody(), emailInstitutionnel: 'oumar.ndiaye@planit.test' };
    const res = await api().post('/api/enseignants').set('Cookie', session.cookieHeader).send(dupe);
    expect(res.status).toBe(409);
  });

  it('refuse 403 à un AC (écriture réservée au RP)', async () => {
    const session = await loginAs(app, 'ASSISTANT_PROGRAMME');
    const res = await api()
      .post('/api/enseignants')
      .set('Cookie', session.cookieHeader)
      .send(validBody());
    expect(res.status).toBe(403);
  });

  it('refuse 400 si body invalide', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api()
      .post('/api/enseignants')
      .set('Cookie', session.cookieHeader)
      .send({ nomComplet: '' }); // missing fields
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/enseignants/:id (B.6)', () => {
  it('met à jour le statut et la spécialité', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api()
      .put('/api/enseignants/seed-enseignant-algo')
      .set('Cookie', session.cookieHeader)
      .send({ statut: 'VACATAIRE', specialite: 'IA' });
    expect(res.status).toBe(200);
    expect(res.body.statut).toBe('VACATAIRE');
    expect(res.body.specialite).toBe('IA');
  });

  it('renvoie 404 sur id inconnu', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api()
      .put('/api/enseignants/ghost-id')
      .set('Cookie', session.cookieHeader)
      .send({ specialite: 'X' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/enseignants/:id (B.6)', () => {
  it('soft delete (deletedAt) si l’enseignant est référencé par des séances', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api()
      .delete('/api/enseignants/seed-enseignant-algo')
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(204);
    // L'enseignant a des séances → User soft-deleted (deletedAt set)
    const user = await prisma.user.findUnique({ where: { id: 'seed-teacher-algo' } });
    expect(user?.deletedAt).toBeTruthy();
  });
});
