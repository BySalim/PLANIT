/**
 * Tests d'intégration — V05 LOT 7.1 : groupes de vue planning.
 *
 * Scénarios couverts :
 *  - Création + liste filtrée par dimension (classe/salle/prof).
 *  - Scope par utilisateur : un RP ne voit que ses propres groupes.
 *  - Isolation cross-utilisateur : éditer/supprimer le groupe d'autrui → 404.
 *  - Renommage / réordonnancement des références (PUT).
 *  - Validation : dimension invalide / refIds vide → 400.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createTestApp } from './helpers/app';
import { loginAs, loginByEmail, RP2_EMAIL } from './helpers/auth';
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

describe('Groupes de vue planning (LOT 7.1)', () => {
  it('crée un groupe et le retrouve filtré par dimension', async () => {
    const rp = await loginAs(app, 'RESPONSABLE_PROGRAMME');

    const created = await api()
      .post('/api/planning/view-groups')
      .set('Cookie', rp.cookieHeader)
      .send({ view: 'classe', name: 'Mes L3', refIds: ['c-1', 'c-2'] })
      .expect(201);
    expect(created.body).toMatchObject({ view: 'classe', name: 'Mes L3', refIds: ['c-1', 'c-2'] });
    expect(created.body.id).toBeTruthy();

    // Présent sur la dimension classe…
    const list = await api()
      .get('/api/planning/view-groups?view=classe')
      .set('Cookie', rp.cookieHeader)
      .expect(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].name).toBe('Mes L3');

    // …absent sur une autre dimension.
    const salleList = await api()
      .get('/api/planning/view-groups?view=salle')
      .set('Cookie', rp.cookieHeader)
      .expect(200);
    expect(salleList.body).toEqual([]);
  });

  it('isole les groupes par utilisateur (RP2 ne voit pas ceux de RP1)', async () => {
    const rp1 = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const rp2 = await loginByEmail(app, RP2_EMAIL);

    await api()
      .post('/api/planning/view-groups')
      .set('Cookie', rp1.cookieHeader)
      .send({ view: 'classe', name: 'Vue RP1', refIds: ['c-1'] })
      .expect(201);

    const rp2List = await api()
      .get('/api/planning/view-groups?view=classe')
      .set('Cookie', rp2.cookieHeader)
      .expect(200);
    expect(rp2List.body).toEqual([]);
  });

  it('refuse (404) l’édition/suppression du groupe d’un autre utilisateur', async () => {
    const rp1 = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const rp2 = await loginByEmail(app, RP2_EMAIL);

    const created = await api()
      .post('/api/planning/view-groups')
      .set('Cookie', rp1.cookieHeader)
      .send({ view: 'salle', name: 'Amphis', refIds: ['s-1', 's-2'] })
      .expect(201);
    const id = created.body.id as string;

    await api()
      .put(`/api/planning/view-groups/${id}`)
      .set('Cookie', rp2.cookieHeader)
      .send({ name: 'pirate' })
      .expect(404);

    await api()
      .delete(`/api/planning/view-groups/${id}`)
      .set('Cookie', rp2.cookieHeader)
      .expect(404);
  });

  it('renomme et réordonne les références (PUT)', async () => {
    const rp = await loginAs(app, 'RESPONSABLE_PROGRAMME');

    const created = await api()
      .post('/api/planning/view-groups')
      .set('Cookie', rp.cookieHeader)
      .send({ view: 'prof', name: 'Dept IA', refIds: ['t-1', 't-2', 't-3'] })
      .expect(201);
    const id = created.body.id as string;

    const updated = await api()
      .put(`/api/planning/view-groups/${id}`)
      .set('Cookie', rp.cookieHeader)
      .send({ name: 'Département IA', refIds: ['t-3', 't-1', 't-2'] })
      .expect(200);
    expect(updated.body.name).toBe('Département IA');
    expect(updated.body.refIds).toEqual(['t-3', 't-1', 't-2']);

    const removed = await api()
      .delete(`/api/planning/view-groups/${id}`)
      .set('Cookie', rp.cookieHeader)
      .expect(200);
    expect(removed.body).toEqual({ id });

    const after = await api()
      .get('/api/planning/view-groups?view=prof')
      .set('Cookie', rp.cookieHeader)
      .expect(200);
    expect(after.body).toEqual([]);
  });

  it('rejette une dimension invalide ou des refIds vides (400)', async () => {
    const rp = await loginAs(app, 'RESPONSABLE_PROGRAMME');

    await api()
      .post('/api/planning/view-groups')
      .set('Cookie', rp.cookieHeader)
      .send({ view: 'etudiant', name: 'X', refIds: ['a'] })
      .expect(400);

    await api()
      .post('/api/planning/view-groups')
      .set('Cookie', rp.cookieHeader)
      .send({ view: 'classe', name: 'X', refIds: [] })
      .expect(400);
  });
});
