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

/** Id de la ligne SuiviModule seedée (ids cuid non fixes). */
async function suiviId(classeId: string, moduleId: string): Promise<string> {
  const row = await prisma.suiviModule.findUnique({
    where: { classeId_moduleId: { classeId, moduleId } },
  });
  if (!row) throw new Error(`suivi introuvable ${classeId}/${moduleId}`);
  return row.id;
}

/**
 * Suivi des modules (B.5/B.6 / V3-D8). GL3-A suit GLRS L3 2025 (5 modules ;
 * S1 = algo/dstr/bdd, S2 = sys/net). ALGO terminé (seed). Séances COURS ALGO
 * GL3-A : seance-01 (CM 2h) + seance-02 (TD 2h) = 4h, enseignant Oumar Ndiaye.
 */
describe('Suivi des modules (B.5)', () => {
  it('liste pour GL3-A : 5 modules + dérivés ALGO corrects', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api()
      .get('/api/suivi-modules?classeId=seed-classe-gl3a')
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(5);

    const algo = (
      res.body as {
        moduleId: string;
        heuresPrevues: number;
        heuresFaites: number;
        estTermine: boolean;
        enseignants: { nom: string; heures: number }[];
      }[]
    ).find((s) => s.moduleId === 'seed-module-algo');
    expect(algo?.heuresPrevues).toBe(36); // VHE = 20+10+6
    expect(algo?.heuresFaites).toBe(4); // 2 séances COURS × 2h (l'examen EVALUATION exclu)
    expect(algo?.estTermine).toBe(true);
    expect(algo?.enseignants).toEqual([
      { id: 'seed-enseignant-algo', nom: 'M. Oumar Ndiaye', heures: 4 },
    ]);
  });

  it('filtre par semestre (S1 = 3 modules)', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api()
      .get('/api/suivi-modules?classeId=seed-classe-gl3a&semestre=1')
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
  });

  it('filtre par statut=termine → ALGO seul', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api()
      .get('/api/suivi-modules?classeId=seed-classe-gl3a&statut=termine')
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect((res.body as { moduleId: string }[])[0]?.moduleId).toBe('seed-module-algo');
  });

  it('un AC ne voit que le suivi de ses classes (GL3-A)', async () => {
    const session = await loginAs(app, 'ASSISTANT_PROGRAMME');
    const res = await api().get('/api/suivi-modules').set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    // GL3-A (5 modules) seulement, pas GL3-B.
    expect(res.body).toHaveLength(5);
    const classeIds = new Set((res.body as { classeId: string }[]).map((s) => s.classeId));
    expect([...classeIds]).toEqual(['seed-classe-gl3a']);
  });
});

describe('Suivi — terminer / rouvrir / séances (B.5/B.6)', () => {
  it('RP termine un module → 200 estTermine true', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const id = await suiviId('seed-classe-gl3a', 'seed-module-bdd');
    const res = await api()
      .patch(`/api/suivi-modules/${id}/terminer`)
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ moduleId: 'seed-module-bdd', estTermine: true });
  });

  it('un AC ne peut pas terminer (RP only) → 403', async () => {
    const session = await loginAs(app, 'ASSISTANT_PROGRAMME');
    const id = await suiviId('seed-classe-gl3a', 'seed-module-bdd');
    const res = await api()
      .patch(`/api/suivi-modules/${id}/terminer`)
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(403);
  });

  it('RP rouvre un module terminé → 200 estTermine false', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const id = await suiviId('seed-classe-gl3a', 'seed-module-algo'); // terminé au seed
    const res = await api()
      .patch(`/api/suivi-modules/${id}/rouvrir`)
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ moduleId: 'seed-module-algo', estTermine: false });
  });

  it("liste les séances COURS d'un module suivi (B.6)", async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const id = await suiviId('seed-classe-gl3a', 'seed-module-algo');
    const res = await api()
      .get(`/api/suivi-modules/${id}/seances`)
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    // 2 séances COURS ALGO pour GL3-A (l'examen EVALUATION n'est pas listé).
    expect(res.body).toHaveLength(2);
    const types = new Set((res.body as { type: string }[]).map((s) => s.type));
    expect([...types]).toEqual(['COURS']);
  });
});
