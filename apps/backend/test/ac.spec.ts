import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createTestApp } from './helpers/app';
import { RP2_EMAIL, loginAs, loginByEmail } from './helpers/auth';
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
 * Scope AC + assignation (B.7). AC = Awa Touré (manager RP1 Aminata), assignée
 * à GL3-A. RP1 responsable des salles Amphi/201/202 ; RP2 (Cheikh) du Labo.
 */
describe('Scope AC (B.7)', () => {
  it('GET /ac/me/scope : classes assignées + salles du RP manager', async () => {
    const session = await loginAs(app, 'ASSISTANT_PROGRAMME');
    const res = await api().get('/api/ac/me/scope').set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    const body = res.body as { classes: { code: string }[]; salles: { name: string }[] };
    expect(body.classes.map((c) => c.code)).toEqual(['GL3-A']);
    // Salles de RP1 uniquement (Labo = RP2, exclu).
    expect(body.salles.map((s) => s.name)).toEqual(['Amphi A', 'Salle 201', 'Salle 202']);
  });

  it('GET /ac/me/scope refuse un RP (AC only) → 403', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    expect((await api().get('/api/ac/me/scope').set('Cookie', session.cookieHeader)).status).toBe(
      403,
    );
  });

  it('le RP manager assigne une classe à son AC → 201', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api()
      .post('/api/ac/seed-ac/classes')
      .set('Cookie', session.cookieHeader)
      .send({ classeId: 'seed-classe-gl3b' });
    expect(res.status).toBe(201);
    const link = await prisma.assistantClasse.findUnique({
      where: { acId_classeId: { acId: 'seed-ac', classeId: 'seed-classe-gl3b' } },
    });
    expect(link).not.toBeNull();
  });

  it('le RP manager retire une classe assignée → 204', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api()
      .delete('/api/ac/seed-ac/classes/seed-classe-gl3a')
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(204);
    const link = await prisma.assistantClasse.findUnique({
      where: { acId_classeId: { acId: 'seed-ac', classeId: 'seed-classe-gl3a' } },
    });
    expect(link).toBeNull();
  });

  it('un RP non-manager ne peut pas assigner à cet AC → 403', async () => {
    const session = await loginByEmail(app, RP2_EMAIL); // Cheikh, pas le manager d'Awa
    const res = await api()
      .post('/api/ac/seed-ac/classes')
      .set('Cookie', session.cookieHeader)
      .send({ classeId: 'seed-classe-gl3b' });
    expect(res.status).toBe(403);
  });

  it("assigner à un id qui n'est pas un AC → 404", async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api()
      .post('/api/ac/seed-rp/classes') // seed-rp est un RP, pas un AC
      .set('Cookie', session.cookieHeader)
      .send({ classeId: 'seed-classe-gl3b' });
    expect(res.status).toBe(404);
  });
});
