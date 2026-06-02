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
 * LOT 3 V02 — référentiel léger /api/classes (lecture seule).
 *
 * Pas de `@Roles()` côté controller → tout utilisateur authentifié peut
 * lire (RP/Enseignant/Étudiant). Sans cookie → 401.
 */
describe('GET /api/classes', () => {
  it('refuse 401 sans cookie', async () => {
    const res = await api().get('/api/classes');
    expect(res.status).toBe(401);
  });

  it('liste les classes seed pour un RP', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api().get('/api/classes').set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    // Forme attendue : { id, code, name } (classeRefSchema)
    const first = res.body[0] as { id?: unknown; code?: unknown; name?: unknown };
    expect(typeof first.id).toBe('string');
    expect(typeof first.code).toBe('string');
    expect(typeof first.name).toBe('string');
  });

  it('reste accessible pour un enseignant et un étudiant (référentiel partagé)', async () => {
    const teacher = await loginAs(app, 'ENSEIGNANT');
    const resTeacher = await api().get('/api/classes').set('Cookie', teacher.cookieHeader);
    expect(resTeacher.status).toBe(200);

    const student = await loginAs(app, 'ETUDIANT');
    const resStudent = await api().get('/api/classes').set('Cookie', student.cookieHeader);
    expect(resStudent.status).toBe(200);
  });
});
