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
 * V02 — référentiel léger /api/salles (lecture seule).
 *
 * Pas de `@Roles()` côté controller → tout utilisateur authentifié peut
 * lire (RP/Enseignant/Étudiant). Sans cookie → 401.
 */
describe('GET /api/salles', () => {
  it('refuse 401 sans cookie', async () => {
    const res = await api().get('/api/salles');
    expect(res.status).toBe(401);
  });

  it('liste les salles seed pour un RP', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api().get('/api/salles').set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    // Forme attendue : { id, name } (salleRefSchema)
    const first = res.body[0] as { id?: unknown; name?: unknown };
    expect(typeof first.id).toBe('string');
    expect(typeof first.name).toBe('string');
  });

  it('reste accessible pour un enseignant et un étudiant (référentiel partagé)', async () => {
    const teacher = await loginAs(app, 'ENSEIGNANT');
    const resTeacher = await api().get('/api/salles').set('Cookie', teacher.cookieHeader);
    expect(resTeacher.status).toBe(200);

    const student = await loginAs(app, 'ETUDIANT');
    const resStudent = await api().get('/api/salles').set('Cookie', student.cookieHeader);
    expect(resStudent.status).toBe(200);
  });

  // ── V03 B.7 — rpResponsable exposé + scope AC ──────────────────────────

  it('expose le rpResponsable (V3-D10)', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api().get('/api/salles').set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    const amphi = (res.body as { name: string; rpResponsable: { fullName: string } | null }[]).find(
      (s) => s.name === 'Amphi A',
    );
    expect(amphi?.rpResponsable?.fullName).toBe('Mme Aminata Diallo');
  });

  it('un AC ne voit que les salles de son RP manager (Labo exclu)', async () => {
    const session = await loginAs(app, 'ASSISTANT_PROGRAMME');
    const res = await api().get('/api/salles').set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    const names = (res.body as { name: string }[]).map((s) => s.name);
    // RP1 : Amphi A, Salle 201, Salle 202 ; PAS le Labo (RP2).
    expect(names).toEqual(['Amphi A', 'Salle 201', 'Salle 202']);
    expect(names).not.toContain('Labo Informatique');
  });
});
