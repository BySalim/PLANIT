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
 * LOT 1 A.2 → A.5 — maquettes versionnées (V3-D2/D3 / ADR-0010).
 * Seed : GLRS L3 (versions 2024+2025, 5 modules, SEC absent), GLRS L2
 * (2024+2025), GLRS L1 (2024 SEULEMENT → renew cible 2025), GL M1 (2025).
 */
describe('Maquettes — lecture & RBAC (A.2/A.7)', () => {
  it('refuse 401 sans cookie', async () => {
    expect((await api().get('/api/maquettes')).status).toBe(401);
  });

  it('liste lite : versionCount présent, pas de versions nested', async () => {
    const session = await rp();
    const res = await api().get('/api/maquettes').set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(4);
    const l3 = (res.body as { nom: string; versionCount?: number; niveau: string }[]).find(
      (m) => m.nom === 'Maquette L3 GLRS',
    );
    expect(l3?.niveau).toBe('L3');
    expect(l3?.versionCount).toBe(2);
  });

  it('AC reçoit 403 (maquettes hors périmètre AC, V3-D9)', async () => {
    const session = await loginAs(app, 'ASSISTANT_PROGRAMME');
    expect((await api().get('/api/maquettes').set('Cookie', session.cookieHeader)).status).toBe(
      403,
    );
  });

  it('étudiant reçoit 403', async () => {
    const session = await loginAs(app, 'ETUDIANT');
    expect((await api().get('/api/maquettes').set('Cookie', session.cookieHeader)).status).toBe(
      403,
    );
  });
});

describe('Maquette versions & modules (A.3)', () => {
  it('liste des versions avec moduleCount + année', async () => {
    const session = await rp();
    const res = await api()
      .get('/api/maquettes/seed-maq-glrs-l3/versions')
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    const v2025 = (res.body as { annee?: { libelle: string }; moduleCount?: number }[]).find(
      (v) => v.annee?.libelle === '2025-2026',
    );
    expect(v2025?.moduleCount).toBe(5);
  });

  it('détail version : modules avec VHE/VHT dérivés + classes la suivant', async () => {
    const session = await rp();
    const res = await api()
      .get('/api/maquette-versions/seed-maqv-glrs-l3-2025')
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    const body = res.body as {
      modules: {
        moduleId: string;
        heuresCM: number;
        heuresTD: number;
        heuresTP: number;
        vhe: number;
        vht: number;
      }[];
      classes: { code: string }[];
    };
    expect(body.modules).toHaveLength(5);
    const algo = body.modules.find((m) => m.moduleId === 'seed-module-algo');
    // algo : CM20 TD10 TP6 TPE14 → VHE 36, VHT 50.
    expect(algo?.vhe).toBe(36);
    expect(algo?.vht).toBe(50);
    // GL3-A et GL3-B suivent la version 2025 via leur formation.
    expect(body.classes.map((c) => c.code).sort()).toEqual(['GL3-A', 'GL3-B']);
  });
});

// ADR-0018 : plus de POST/PUT/renew publics sur /maquettes — création et
// renouvellement sont pilotés par la création de formation (cf. formations.spec :
// « clone la maquette de l'année précédente »). Cette page reste lecture +
// composition. Les endpoints retirés renvoient 404 (non testés ici).

describe('Composer (A.4)', () => {
  it('ajoute un module + VHE/VHT dérivés corrects', async () => {
    const session = await rp();
    // SEC est absent de GLRS L3 (cf. seed) → ajoutable.
    const res = await api()
      .post('/api/maquette-versions/seed-maqv-glrs-l3-2025/modules')
      .set('Cookie', session.cookieHeader)
      .send({
        moduleId: 'seed-module-sec',
        semestre: 2,
        heuresCM: 10,
        heuresTD: 4,
        heuresTP: 6,
        heuresTPE: 8,
      });
    expect(res.status).toBe(201);
    // VHE = 10+4+6 = 20 ; VHT = 20+8 = 28.
    expect(res.body).toMatchObject({ vhe: 20, vht: 28 });

    // La version compte désormais 6 modules.
    const count = await prisma.maquetteModule.count({
      where: { maquetteVersionId: 'seed-maqv-glrs-l3-2025' },
    });
    expect(count).toBe(6);
  });

  it('refuse un module déjà présent dans la version → 409', async () => {
    const session = await rp();
    const res = await api()
      .post('/api/maquette-versions/seed-maqv-glrs-l3-2025/modules')
      .set('Cookie', session.cookieHeader)
      .send({ moduleId: 'seed-module-algo', semestre: 1 }); // déjà présent
    expect(res.status).toBe(409);
  });

  it("modifie les heures d'un module (PUT) puis recalcule VHE/VHT", async () => {
    const session = await rp();
    const mmId = 'seed-mm-seed-maqv-glrs-l3-2025-seed-module-algo';
    const res = await api()
      .put(`/api/maquette-modules/${mmId}`)
      .set('Cookie', session.cookieHeader)
      .send({ heuresCM: 30 }); // algo passe de CM20 à CM30
    expect(res.status).toBe(200);
    // VHE = 30+10+6 = 46 ; VHT = 46+14 = 60.
    expect(res.body).toMatchObject({ vhe: 46, vht: 60 });
  });
});

describe('Export version (A.5)', () => {
  it('renvoie les totaux dérivés de la version', async () => {
    const session = await rp();
    const res = await api()
      .get('/api/maquette-versions/seed-maqv-glrs-l3-2025/export')
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    // Totaux GLRS L3 2025 : CM90 TD32 TP50 TPE58 → VHE172 VHT230.
    expect(res.body.totaux).toMatchObject({
      cm: 90,
      td: 32,
      tp: 50,
      tpe: 58,
      vhe: 172,
      vht: 230,
    });
  });
});
