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
 * Étudiants (B.2). RP + AC only. Seed : 6 étudiants ; Ibrahima a un historique
 * 2024 (GL2A-2024) puis 2025 (GL3-A). AC (Awa Touré) assignée à GL3-A.
 */
describe('Étudiants (B.2)', () => {
  it('refuse 403 à un enseignant (page RP/AC)', async () => {
    const session = await loginAs(app, 'ENSEIGNANT');
    expect((await api().get('/api/etudiants').set('Cookie', session.cookieHeader)).status).toBe(
      403,
    );
  });

  it('RP liste tous les étudiants', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api().get('/api/etudiants').set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(6);
  });

  it('recherche par nom', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api().get('/api/etudiants?q=Ibrahima').set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ nomComplet: 'Ibrahima Sow', matricule: 'ISM-2024-0001' });
  });

  it('recherche par matricule', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api()
      .get('/api/etudiants?q=ISM-2024-0006')
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    expect((res.body as { nomComplet: string }[])[0]?.nomComplet).toBe('Khadija Ndiaye');
  });

  it('recherche par email', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api()
      .get('/api/etudiants?q=moussa.fall@planit.test')
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    expect((res.body as { nomComplet: string }[])[0]?.nomComplet).toBe('Moussa Fall');
  });

  it("fiche étudiant + historique d'inscriptions (récent en tête)", async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api().get('/api/etudiants/seed-student').set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    const body = res.body as {
      nomComplet: string;
      inscriptions: { anneeLibelle: string; classeCode: string }[];
    };
    expect(body.nomComplet).toBe('Ibrahima Sow');
    expect(body.inscriptions).toHaveLength(2);
    expect(body.inscriptions.map((i) => i.anneeLibelle)).toEqual(['2025-2026', '2024-2025']);
  });

  it('lookup email existant → found', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api()
      .get('/api/etudiants/lookup?email=ibrahima.sow@planit.test')
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ found: true });
    expect((res.body as { etudiant: { matricule: string } }).etudiant.matricule).toBe(
      'ISM-2024-0001',
    );
  });

  it('lookup email inconnu → not found', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api()
      .get('/api/etudiants/lookup?email=inconnu@planit.test')
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ found: false, etudiant: null });
  });

  it('un AC ne voit que les étudiants de ses classes (GL3-A)', async () => {
    const session = await loginAs(app, 'ASSISTANT_PROGRAMME');
    const res = await api().get('/api/etudiants').set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    // GL3-A : Ibrahima, Awa Ndoye, Khadija = 3 (Moussa/Bineta/Cheikh non inscrits).
    expect(res.body).toHaveLength(3);
  });

  it("un AC reçoit 403 sur la fiche d'un étudiant hors périmètre", async () => {
    const session = await loginAs(app, 'ASSISTANT_PROGRAMME');
    // Moussa Fall n'est inscrit dans aucune classe → hors périmètre AC.
    const res = await api()
      .get('/api/etudiants/seed-student-fall')
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(403);
  });
});
