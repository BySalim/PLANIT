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
 * Classes V3 (B.1). Le référentiel partagé `/api/classes` reste accessible à
 * tous les rôles (rétro-compat séance-picker) ; la réponse est enrichie
 * (places, filière/niveau hérités), un AC est scopé à ses classes assignées.
 * Seed année courante : GL3-A, GL3-B (GLRS L3), GL2-A (GLRS L2), GLM1-A (GL M1 DD).
 */
describe('GET /api/classes — référentiel partagé (rétro-compat)', () => {
  it('refuse 401 sans cookie', async () => {
    const res = await api().get('/api/classes');
    expect(res.status).toBe(401);
  });

  it('liste les classes seed pour un RP (forme { id, code, name } conservée)', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api().get('/api/classes').set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    const first = res.body[0] as { id?: unknown; code?: unknown; name?: unknown };
    expect(typeof first.id).toBe('string');
    expect(typeof first.code).toBe('string');
    expect(typeof first.name).toBe('string');
  });

  it('reste accessible pour un enseignant et un étudiant (référentiel partagé)', async () => {
    const teacher = await loginAs(app, 'ENSEIGNANT');
    expect((await api().get('/api/classes').set('Cookie', teacher.cookieHeader)).status).toBe(200);
    const student = await loginAs(app, 'ETUDIANT');
    expect((await api().get('/api/classes').set('Cookie', student.cookieHeader)).status).toBe(200);
  });
});

describe('Classes V3 — filtres, places, scope (B.1)', () => {
  it("défaut = 4 classes de l'année courante + places correctes", async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api().get('/api/classes').set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(4);
    const gl3a = (
      res.body as { code: string; places: { inscrits: number; capaciteMax: number } }[]
    ).find((c) => c.code === 'GL3-A');
    // GL3-A : Ibrahima + Awa Ndoye + Khadija(non-DD) = 3 inscrits / capacité 30.
    expect(gl3a?.places).toEqual({ inscrits: 3, capaciteMax: 30 });
  });

  it('filtre filiereSigle=GL → GLM1-A (double-diplôme)', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api().get('/api/classes?filiereSigle=GL').set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ code: 'GLM1-A', isDoubleDiplome: true });
  });

  it('recherche q=GL3 → GL3-A + GL3-B', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api().get('/api/classes?q=GL3').set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    expect((res.body as { code: string }[]).map((c) => c.code).sort()).toEqual(['GL3-A', 'GL3-B']);
  });

  it('un AC ne voit que ses classes assignées (GL3-A)', async () => {
    const session = await loginAs(app, 'ASSISTANT_PROGRAMME');
    const res = await api().get('/api/classes').set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    expect((res.body as { code: string }[]).map((c) => c.code)).toEqual(['GL3-A']);
  });

  it('un AC reçoit 403 sur une classe hors périmètre (GL3-B)', async () => {
    const session = await loginAs(app, 'ASSISTANT_PROGRAMME');
    const res = await api()
      .get('/api/classes/seed-classe-gl3b')
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(403);
  });

  it('roster de la classe (étudiants inscrits)', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api()
      .get('/api/classes/seed-classe-gl3a/etudiants')
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    const matricules = (res.body as { matricule: string }[]).map((e) => e.matricule);
    expect(matricules).toContain('ISM-2024-0001'); // Ibrahima
  });

  it("RP crée une classe rattachée à une formation de l'année courante", async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api().post('/api/classes').set('Cookie', session.cookieHeader).send({
      code: 'GL3-C',
      name: 'Génie Logiciel 3ème année C',
      formationId: 'seed-form-glrs-l3',
      capaciteMax: 40,
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      code: 'GL3-C',
      niveau: 'L3',
      places: { inscrits: 0, capaciteMax: 40 },
    });
  });

  it('refuse une classe rattachée à une formation hors année courante → 400', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api().post('/api/classes').set('Cookie', session.cookieHeader).send({
      code: 'GL2-X',
      name: 'Classe hors année',
      formationId: 'seed-form-glrs-l2-2024', // formation 2024
      capaciteMax: 30,
    });
    expect(res.status).toBe(400);
  });

  it('refuse la création à un étudiant (403, RP only)', async () => {
    const session = await loginAs(app, 'ETUDIANT');
    const res = await api()
      .post('/api/classes')
      .set('Cookie', session.cookieHeader)
      .send({ code: 'X', name: 'X', formationId: 'seed-form-glrs-l3', capaciteMax: 10 });
    expect(res.status).toBe(403);
  });
});
