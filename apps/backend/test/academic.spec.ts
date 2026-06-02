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

describe('UE — GET /api/ues (B.7)', () => {
  it('liste lite par défaut : UE seules avec moduleCount, sans modules nested', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api().get('/api/ues').set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    const algoUe = (res.body as { code: string; modules?: unknown; moduleCount?: number }[]).find(
      (u) => u.code === 'ALGO-UE',
    );
    expect(algoUe).toBeDefined();
    // Mode lite : pas de modules nested mais moduleCount présent.
    expect(algoUe?.modules).toBeUndefined();
    expect(algoUe?.moduleCount).toBeGreaterThanOrEqual(2);
  });

  it('?withModules=true → mode legacy avec modules nested', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api().get('/api/ues?withModules=true').set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    const algoUe = (res.body as { code: string; modules: { code: string }[] }[]).find(
      (u) => u.code === 'ALGO-UE',
    );
    expect(algoUe).toBeDefined();
    expect(algoUe?.modules.length).toBeGreaterThanOrEqual(2);
  });

  it('refuse 403 pour un étudiant', async () => {
    const session = await loginAs(app, 'ETUDIANT');
    const res = await api().get('/api/ues').set('Cookie', session.cookieHeader);
    expect(res.status).toBe(403);
  });
});

describe('UE — GET /api/ues/:ueId/modules (lazy load)', () => {
  it("retourne les modules de l'UE triés par code", async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    // Récupère un id d'UE seed pour le test (mode legacy pour lire les modules
    // depuis la même réponse).
    const ues = await api().get('/api/ues?withModules=true').set('Cookie', session.cookieHeader);
    const algoUe = (ues.body as { id: string; code: string }[]).find((u) => u.code === 'ALGO-UE');
    if (algoUe === undefined) throw new Error('seed ALGO-UE introuvable');

    const res = await api()
      .get(`/api/ues/${algoUe.id}/modules`)
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect((res.body as unknown[]).length).toBeGreaterThanOrEqual(2);
  });

  it("404 si l'UE n'existe pas", async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api()
      .get('/api/ues/clxxxxxxxx0000000000nope/modules')
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(404);
  });
});

describe('UE — POST /api/ues (B.7)', () => {
  it('crée une UE', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api()
      .post('/api/ues')
      .set('Cookie', session.cookieHeader)
      .send({ code: 'PHYS-UE', libelle: 'Physique appliquée', color: '#A855F7' });
    expect(res.status).toBe(201);
    expect(res.body.code).toBe('PHYS-UE');
  });

  it('refuse 409 si code déjà utilisé', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api()
      .post('/api/ues')
      .set('Cookie', session.cookieHeader)
      .send({ code: 'ALGO-UE', libelle: 'Doublon', color: '#000000' });
    expect(res.status).toBe(409);
  });
});

describe('UE — DELETE /api/ues/:id (B.7)', () => {
  it('refuse 409 si l’UE contient des modules', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api().delete('/api/ues/seed-ue-algo').set('Cookie', session.cookieHeader);
    expect(res.status).toBe(409);
  });

  it('supprime une UE vide', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    // Créer une UE vide ad-hoc
    const created = await api()
      .post('/api/ues')
      .set('Cookie', session.cookieHeader)
      .send({ code: 'EMPTY-UE', libelle: 'Vide', color: '#888888' });
    const res = await api()
      .delete(`/api/ues/${created.body.id}`)
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(204);
  });
});

describe('Modules — POST /api/ues/:ueId/modules (B.8)', () => {
  it('crée un module sous l’UE parent', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api()
      .post('/api/ues/seed-ue-algo/modules')
      .set('Cookie', session.cookieHeader)
      .send({ code: 'OPT', libelle: 'Optimisation', color: '#3B82F6' });
    expect(res.status).toBe(201);
    expect(res.body.ueId).toBe('seed-ue-algo');
    expect(res.body.code).toBe('OPT');
  });

  it('renvoie 404 si UE parent inconnue', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api()
      .post('/api/ues/ghost-ue/modules')
      .set('Cookie', session.cookieHeader)
      .send({ code: 'X', libelle: 'X', color: '#000000' });
    expect(res.status).toBe(404);
  });

  it('refuse 400 si couleur hex invalide', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api()
      .post('/api/ues/seed-ue-algo/modules')
      .set('Cookie', session.cookieHeader)
      .send({ code: 'NEW', libelle: 'X', color: 'not-hex' });
    expect(res.status).toBe(400);
  });
});

describe('Modules — DELETE /api/modules/:id (B.8)', () => {
  it('refuse 409 si le module est utilisé par des séances', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api()
      .delete('/api/modules/seed-module-algo')
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(409);
  });

  it('renvoie 404 sur id inconnu', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api().delete('/api/modules/ghost-module').set('Cookie', session.cookieHeader);
    expect(res.status).toBe(404);
  });
});
