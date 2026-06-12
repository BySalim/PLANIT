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
const rp = (): Promise<{ cookieHeader: string }> => loginAs(app, 'RESPONSABLE_PROGRAMME');

/**
 * LOT 1 A.6 — Formations (V3-D4). Seed (année courante 2025-2026) :
 * GLRS-L3-2025, GLRS-L2-2025, GL-M1-2025 (DD) ; année 2024 : GLRS-L2-2024.
 */
describe('Formations (A.6)', () => {
  it('liste par défaut = année courante uniquement', async () => {
    const session = await rp();
    const res = await api().get('/api/formations').set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    const codes = (res.body as { code: string }[]).map((f) => f.code).sort();
    expect(codes).toEqual(['GL-M1-2025', 'GLRS-L2-2025', 'GLRS-L3-2025']);
    // La formation 2024 n'apparaît PAS par défaut.
    expect(codes).not.toContain('GLRS-L2-2024');
  });

  it('filtre par anneeId explicite (année clôturée)', async () => {
    const session = await rp();
    const res = await api()
      .get('/api/formations?anneeId=seed-annee-2024')
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    expect((res.body as { code: string }[]).map((f) => f.code)).toEqual(['GLRS-L2-2024']);
  });

  it('détail formation : anneeLibelle + classeCount', async () => {
    const session = await rp();
    const res = await api()
      .get('/api/formations/seed-form-glrs-l3')
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ code: 'GLRS-L3-2025', anneeLibelle: '2025-2026' });
    expect(res.body.classeCount).toBeGreaterThanOrEqual(2); // GL3-A + GL3-B
  });

  it('crée une formation (filière + niveau) : code dérivé + maquette/version auto (ADR-0018)', async () => {
    const session = await rp();
    const res = await api()
      .post('/api/formations')
      .set('Cookie', session.cookieHeader)
      .send({ filiereId: 'seed-filiere-glrs', niveau: 'M2' });
    expect(res.status).toBe(201);
    // Code dérivé {SIGLE}-{NIVEAU}-{libelléComplet}.
    expect(res.body).toMatchObject({ code: 'GLRS-M2-2025-2026', anneeLibelle: '2025-2026' });
    // La maquette (GLRS, M2) + sa version année courante sont créées (nom dérivé).
    const maquette = await prisma.maquette.findUnique({
      where: { filiereId_niveau: { filiereId: 'seed-filiere-glrs', niveau: 'M2' } },
      include: { versions: true },
    });
    expect(maquette?.nom).toBe('Maquette M2 GLRS');
    expect(maquette?.versions).toHaveLength(1);
  });

  it("renouvelle automatiquement la maquette de l'année précédente (clone des modules)", async () => {
    const session = await rp();
    // GLRS L1 n'a qu'une version 2024 (3 modules) → créer la formation L1 pour
    // l'année courante clone ces 3 modules dans une nouvelle version 2025.
    const res = await api()
      .post('/api/formations')
      .set('Cookie', session.cookieHeader)
      .send({ filiereId: 'seed-filiere-glrs', niveau: 'L1' });
    expect(res.status).toBe(201);
    const versionId = (res.body as { maquetteVersionId: string }).maquetteVersionId;
    expect(versionId).not.toBe('seed-maqv-glrs-l1-2024');
    const cloned = await prisma.maquetteModule.count({ where: { maquetteVersionId: versionId } });
    expect(cloned).toBe(3);
    // L'ancienne version 2024 reste intacte (immutabilité inter-années).
    const old = await prisma.maquetteModule.count({
      where: { maquetteVersionId: 'seed-maqv-glrs-l1-2024' },
    });
    expect(old).toBe(3);
  });

  it('refuse un doublon (filière + niveau + année courante) → 409', async () => {
    const session = await rp();
    // GLRS L3 existe déjà pour 2025-2026 (seed).
    const res = await api()
      .post('/api/formations')
      .set('Cookie', session.cookieHeader)
      .send({ filiereId: 'seed-filiere-glrs', niveau: 'L3' });
    expect(res.status).toBe(409);
  });

  it('AC reçoit 403 (formations hors périmètre AC)', async () => {
    const session = await loginAs(app, 'ASSISTANT_PROGRAMME');
    expect((await api().get('/api/formations').set('Cookie', session.cookieHeader)).status).toBe(
      403,
    );
  });

  it('étudiant reçoit 403', async () => {
    const session = await loginAs(app, 'ETUDIANT');
    expect((await api().get('/api/formations').set('Cookie', session.cookieHeader)).status).toBe(
      403,
    );
  });
});
