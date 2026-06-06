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
        niveau: string | null;
        heuresPrevues: number;
        heuresFaites: number;
        estTermine: boolean;
        enseignants: { nom: string; heures: number }[];
      }[]
    ).find((s) => s.moduleId === 'seed-module-algo');
    expect(algo?.niveau).toBe('L3'); // GL3-A suit GLRS L3 (niveau hérité de la formation)
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
    const seances = res.body as { type: string; startAt: string }[];
    const types = new Set(seances.map((s) => s.type));
    expect([...types]).toEqual(['COURS']);
    // Ordre chronologique inverse garanti par l'API (plus récent d'abord) :
    // la suite des timestamps doit déjà être triée décroissante.
    const times = seances.map((s) => new Date(s.startAt).getTime());
    expect(times).toEqual([...times].sort((a, b) => b - a));
  });
});

/**
 * S.2 — Suivi ETUDIANT self-scope (V3-D15).
 * Ibrahima Sow est inscrit en GL3-A 2025 (seed-insc-ibrahima-2025).
 * GET /api/suivi-modules sans paramètre → les 5 modules de sa classe.
 */
describe('Suivi des modules — ETUDIANT self-scope (S.2)', () => {
  it("liste les modules de sa classe (GL3-A, 5 modules) via l'inscription courante", async () => {
    const session = await loginAs(app, 'ETUDIANT');
    const res = await api().get('/api/suivi-modules').set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(5);
    const classeIds = new Set((res.body as { classeId: string }[]).map((s) => s.classeId));
    expect([...classeIds]).toEqual(['seed-classe-gl3a']);
  });

  it('filtre par semestre fonctionne pour un ETUDIANT (S1 = 3 modules)', async () => {
    const session = await loginAs(app, 'ETUDIANT');
    const res = await api()
      .get('/api/suivi-modules?semestre=1')
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
  });

  it('un ETUDIANT ne peut pas terminer un module → 403', async () => {
    const rpSession = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const id = await suiviId('seed-classe-gl3a', 'seed-module-bdd');

    const session = await loginAs(app, 'ETUDIANT');
    const res = await api()
      .patch(`/api/suivi-modules/${id}/terminer`)
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(403);
    // S'assurer que le rpSession était bien là (pas d'erreur de seed).
    expect(rpSession.role).toBe('RESPONSABLE_PROGRAMME');
  });
});

/**
 * S.3 — Suivi pivot ENSEIGNANT (V3-D15).
 * oumar.ndiaye enseigne ALGO en GL3-A : seance-01 (CM 2h) + seance-02 (TD 2h).
 * GET /api/suivi-modules/mes-enseignements → 1 item (ALGO) avec 1 classe (GL3-A).
 */
describe('Suivi des modules — ENSEIGNANT pivot (S.3)', () => {
  it('retourne les modules enseignés ventilés CM/TD/TP par classe', async () => {
    const session = await loginAs(app, 'ENSEIGNANT');
    const res = await api()
      .get('/api/suivi-modules/mes-enseignements')
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);

    const items = res.body as {
      moduleId: string;
      module: { code: string };
      classes: {
        classeId: string;
        classeCode: string;
        heuresFaites: number;
        heuresCM: number;
        heuresTD: number;
        heuresTP: number;
        sessionsCount: number;
        estTermine: boolean;
      }[];
      status: string;
    }[];

    // oumar.ndiaye a des séances sur ALGO (seance-01 CM 2h, seance-02 TD 2h).
    const algo = items.find((i) => i.moduleId === 'seed-module-algo');
    expect(algo).toBeDefined();
    expect(algo?.module.code).toBe('ALGO');

    const gl3a = algo?.classes.find((c) => c.classeId === 'seed-classe-gl3a');
    expect(gl3a).toBeDefined();
    expect(gl3a?.heuresFaites).toBe(4); // 2h CM + 2h TD
    expect(gl3a?.heuresCM).toBe(2);
    expect(gl3a?.heuresTD).toBe(2);
    expect(gl3a?.heuresTP).toBe(0);
    expect(gl3a?.sessionsCount).toBe(2);
    // ALGO est terminé au seed pour GL3-A.
    expect(gl3a?.estTermine).toBe(true);
    expect(algo?.status).toBe('completed');
  });

  it('un ENSEIGNANT ne peut pas accéder à la liste gestion (RP/AC) → 403', async () => {
    const session = await loginAs(app, 'ENSEIGNANT');
    const res = await api()
      .get('/api/suivi-modules?classeId=seed-classe-gl3a')
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(403);
  });

  it('un ETUDIANT ne peut pas accéder au pivot enseignant → 403', async () => {
    const session = await loginAs(app, 'ETUDIANT');
    const res = await api()
      .get('/api/suivi-modules/mes-enseignements')
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(403);
  });
});
