/**
 * Tests d'intégration — Direction scope école (LOT 2 / V5-D2).
 *
 * Scénarios couverts :
 *  - Isolation cross-école (Direction A ≠ Direction B)
 *  - Personnel CRUD : list, create RP/AC, update, suspendre, réactiver
 *  - Suspension → login refusé (refresh tokens révoqués)
 *  - Années transitions : debuter (409 si EN_COURS), cloturer
 *  - Salles : scope école pour RP/DIRECTION, POST RBAC, PUT Direction-only
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createTestApp } from './helpers/app';
import { DIRECTION_B_EMAIL, loginAs, loginByEmail } from './helpers/auth';
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

// ── helpers ─────────────────────────────────────────────────────────────────

async function directionA() {
  return loginAs(app, 'DIRECTION');
}

async function directionB() {
  return loginByEmail(app, DIRECTION_B_EMAIL);
}

/** Lundi de la semaine courante (YYYY-MM-DD) — les séances seed y sont ancrées. */
function currentMonday(): string {
  const today = new Date();
  const dow = today.getUTCDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + offset),
  );
  return monday.toISOString().slice(0, 10);
}

const monday = currentMonday();

/**
 * Crée une séance V2 rattachée à l'**école B** (le seed n'en place aucune) pour
 * prouver l'isolation du planning. Le module est un placeholder de l'école A :
 * le scope se calcule via la classe → filière → école, jamais via le module.
 * Retourne l'id de la séance créée.
 */
async function createEcoleBSeance(): Promise<string> {
  const startAt = new Date(`${monday}T10:00:00.000Z`);
  const endAt = new Date(`${monday}T12:00:00.000Z`);
  const seance = await prisma.seance.create({
    data: {
      libelle: 'Cours École B',
      type: 'CM',
      status: 'PUBLIE',
      typeV2: 'COURS',
      sousType: 'CM',
      isPublished: true,
      hasUnpublishedChanges: false,
      startAt,
      endAt,
      lastModifiedAt: startAt,
      lastPublishedAt: startAt,
      moduleId: 'seed-module-algo',
      classeId: 'seed-classe-b',
      seanceClasses: { create: [{ classeId: 'seed-classe-b' }] },
    },
  });
  return seance.id;
}

// ── Isolation cross-école ────────────────────────────────────────────────────

describe('Isolation cross-école (Direction A ↔ B)', () => {
  /**
   * Pattern isolation : Direction A ne voit QUE les données de son école,
   * et Direction B ne voit pas les mêmes données (les IDs sont disjoints).
   * Les deux écoles ont des données dans le seed — l'assertion porte sur
   * la disjonction, pas sur l'absence.
   */
  it('Direction A et B voient des enseignants distincts (isolation)', async () => {
    const [sessionA, sessionB] = await Promise.all([directionA(), directionB()]);

    const [resA, resB] = await Promise.all([
      api().get('/api/enseignants').set('Cookie', sessionA.cookieHeader),
      api().get('/api/enseignants').set('Cookie', sessionB.cookieHeader),
    ]);

    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);

    const idsA = new Set((resA.body.items as { id: string }[]).map((e) => e.id));
    const idsB = new Set((resB.body.items as { id: string }[]).map((e) => e.id));

    // Aucun enseignant ne doit apparaître dans les deux vues.
    for (const id of idsB) {
      expect(idsA.has(id)).toBe(false);
    }
    // École A a au moins Oumar Ndiaye dans le seed.
    expect(idsA.size).toBeGreaterThan(0);
  });

  it('Direction A et B voient des filieres distinctes (isolation)', async () => {
    const [sessionA, sessionB] = await Promise.all([directionA(), directionB()]);

    const [resA, resB] = await Promise.all([
      api().get('/api/filieres').set('Cookie', sessionA.cookieHeader),
      api().get('/api/filieres').set('Cookie', sessionB.cookieHeader),
    ]);

    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);

    const idsA = new Set((resA.body as { id: string }[]).map((f) => f.id));
    const idsB = new Set((resB.body as { id: string }[]).map((f) => f.id));

    // Aucune filière commune.
    for (const id of idsB) {
      expect(idsA.has(id)).toBe(false);
    }
    expect(idsA.size).toBeGreaterThan(0);
    expect(idsB.size).toBeGreaterThan(0);
  });

  it('Direction A et B voient des salles distinctes (isolation)', async () => {
    const [sessionA, sessionB] = await Promise.all([directionA(), directionB()]);

    const [resA, resB] = await Promise.all([
      api().get('/api/salles').set('Cookie', sessionA.cookieHeader),
      api().get('/api/salles').set('Cookie', sessionB.cookieHeader),
    ]);

    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);

    const idsA = new Set((resA.body as { id: string }[]).map((s) => s.id));
    const idsB = new Set((resB.body as { id: string }[]).map((s) => s.id));

    // Aucune salle commune entre les deux écoles.
    for (const id of idsB) {
      expect(idsA.has(id)).toBe(false);
    }
    expect(idsA.size).toBeGreaterThan(0);
    expect(idsB.size).toBeGreaterThan(0);
  });

  it('Direction A et B voient des classes distinctes (isolation)', async () => {
    const [sessionA, sessionB] = await Promise.all([directionA(), directionB()]);

    const [resA, resB] = await Promise.all([
      api().get('/api/classes').set('Cookie', sessionA.cookieHeader),
      api().get('/api/classes').set('Cookie', sessionB.cookieHeader),
    ]);

    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);

    const idsA = new Set((resA.body as { id: string }[]).map((c) => c.id));
    const idsB = new Set((resB.body as { id: string }[]).map((c) => c.id));

    // seed-classe-gl3a appartient à école A, seed-classe-b à école B.
    expect(idsA.has('seed-classe-gl3a')).toBe(true);
    expect(idsB.has('seed-classe-gl3a')).toBe(false);

    // Aucune classe commune.
    for (const id of idsB) {
      expect(idsA.has(id)).toBe(false);
    }
  });
});

// ── Personnel — list ─────────────────────────────────────────────────────────

describe('GET /api/personnel', () => {
  it('Direction liste le personnel de son école (RP + AC)', async () => {
    const session = await directionA();
    const res = await api().get('/api/personnel').set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    const items = res.body as { role: string }[];
    // Le seed place au moins 2 RP (Aminata + Cheikh) dans ecole_ism.
    expect(items.length).toBeGreaterThanOrEqual(2);
    // Tous les rôles sont RP ou AC — pas d'enseignant ni d'étudiant.
    for (const item of items) {
      expect(['RESPONSABLE_PROGRAMME', 'ASSISTANT_PROGRAMME']).toContain(item.role);
    }
  });

  it('RP ne peut pas accéder à /api/personnel (403)', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api().get('/api/personnel').set('Cookie', session.cookieHeader);
    expect(res.status).toBe(403);
  });
});

// ── Personnel — create ───────────────────────────────────────────────────────

describe('POST /api/personnel', () => {
  it('Direction crée un RP dans son école', async () => {
    const session = await directionA();
    const res = await api().post('/api/personnel').set('Cookie', session.cookieHeader).send({
      email: 'nouveau.rp@planit.test',
      fullName: 'Nouveau RP Test',
      role: 'RESPONSABLE_PROGRAMME',
      password: 'Test1234!secure',
    });
    expect(res.status).toBe(201);
    expect(res.body.role).toBe('RESPONSABLE_PROGRAMME');
    expect(res.body.email).toBe('nouveau.rp@planit.test');
    expect(res.body.statut).toBe('ACTIF');
    // Vérifier en BD que l'ecoleId est correct.
    const user = await prisma.user.findUnique({ where: { email: 'nouveau.rp@planit.test' } });
    expect(user?.ecoleId).toBe('ecole_ism');
  });

  it('Direction crée un AC dans son école', async () => {
    const session = await directionA();
    const res = await api().post('/api/personnel').set('Cookie', session.cookieHeader).send({
      email: 'nouveau.ac@planit.test',
      fullName: 'Nouveau AC Test',
      role: 'ASSISTANT_PROGRAMME',
      password: 'Test1234!secure',
    });
    expect(res.status).toBe(201);
    expect(res.body.role).toBe('ASSISTANT_PROGRAMME');
  });

  it('409 si email déjà pris', async () => {
    const session = await directionA();
    // aminata.diallo@planit.test est dans le seed.
    const res = await api().post('/api/personnel').set('Cookie', session.cookieHeader).send({
      email: 'aminata.diallo@planit.test',
      fullName: 'Doublon',
      role: 'RESPONSABLE_PROGRAMME',
      password: 'Test1234!secure',
    });
    expect(res.status).toBe(409);
  });
});

// ── Personnel — suspendre / réactiver ────────────────────────────────────────

describe('PATCH /api/personnel/:id/suspendre et /reactiver', () => {
  it('Direction suspend un RP → login refusé', async () => {
    // Trouver l'id du RP1 (Aminata Diallo).
    const rp = await prisma.user.findUnique({ where: { email: 'aminata.diallo@planit.test' } });
    if (!rp) throw new Error('RP seed introuvable');

    const session = await directionA();

    // Suspension.
    const suspRes = await api()
      .patch(`/api/personnel/${rp.id}/suspendre`)
      .set('Cookie', session.cookieHeader);
    expect(suspRes.status).toBe(200);
    expect(suspRes.body.statut).toBe('SUSPENDU');

    // Tentative de login du RP suspendu → 401 (AuthService vérifie le statut).
    const loginRes = await api()
      .post('/api/auth/login')
      .send({ email: 'aminata.diallo@planit.test', password: 'Test1234!' });
    expect(loginRes.status).toBe(401);
  });

  it('Direction réactive un RP suspendu → login ok', async () => {
    const rp = await prisma.user.findUnique({ where: { email: 'aminata.diallo@planit.test' } });
    if (!rp) throw new Error('RP seed introuvable');

    const session = await directionA();

    // Suspendre d'abord.
    await api().patch(`/api/personnel/${rp.id}/suspendre`).set('Cookie', session.cookieHeader);

    // Réactiver.
    const reactRes = await api()
      .patch(`/api/personnel/${rp.id}/reactiver`)
      .set('Cookie', session.cookieHeader);
    expect(reactRes.status).toBe(200);
    expect(reactRes.body.statut).toBe('ACTIF');

    // Login doit maintenant réussir.
    const loginRes = await api()
      .post('/api/auth/login')
      .send({ email: 'aminata.diallo@planit.test', password: 'Test1234!' });
    expect(loginRes.status).toBe(200);
  });

  it("Direction B ne peut pas suspendre un RP de l'ecole A (403)", async () => {
    const rp = await prisma.user.findUnique({ where: { email: 'aminata.diallo@planit.test' } });
    if (!rp) throw new Error('RP seed introuvable');

    const sessionB = await directionB();
    const res = await api()
      .patch(`/api/personnel/${rp.id}/suspendre`)
      .set('Cookie', sessionB.cookieHeader);
    expect(res.status).toBe(403);
  });
});

// ── Années — transitions ─────────────────────────────────────────────────────

describe('PATCH /api/annees/:id/debuter et /cloturer', () => {
  it('Direction débute une année PLANIFIEE → EN_COURS', async () => {
    const session = await directionA();

    // Créer une année planifiée (RP le fait, ou directement en BD pour le test).
    // On utilise la BD directement pour créer l'année planifiée.
    const planifiee = await prisma.anneeAcademique.create({
      data: {
        id: 'test-annee-planifiee',
        libelle: '2027-2028 Test',
        debut: new Date('2027-09-01'),
        fin: new Date('2028-06-30'),
        etat: 'PLANIFIEE',
        ecoleId: 'ecole_ism',
      },
    });

    // L'école A a déjà une année EN_COURS (seed) → il faut la clôturer d'abord.
    // Clôturer l'année courante.
    const current = await prisma.anneeAcademique.findFirst({
      where: { etat: 'EN_COURS', ecoleId: 'ecole_ism' },
    });
    if (current) {
      await prisma.anneeAcademique.update({
        where: { id: current.id },
        data: { etat: 'CLOTUREE' },
      });
    }

    const res = await api()
      .patch(`/api/annees/${planifiee.id}/debuter`)
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    expect(res.body.etat).toBe('EN_COURS');
  });

  it('409 si une autre année est déjà EN_COURS', async () => {
    const session = await directionA();

    // Créer une 2ème année planifiée alors qu'une EN_COURS existe déjà (seed).
    const planifiee = await prisma.anneeAcademique.create({
      data: {
        id: 'test-annee-conflit',
        libelle: '2028-2029 Conflit',
        debut: new Date('2028-09-01'),
        fin: new Date('2029-06-30'),
        etat: 'PLANIFIEE',
        ecoleId: 'ecole_ism',
      },
    });

    const res = await api()
      .patch(`/api/annees/${planifiee.id}/debuter`)
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(409);
  });

  it('Direction clôture une année EN_COURS', async () => {
    const session = await directionA();

    const current = await prisma.anneeAcademique.findFirst({
      where: { etat: 'EN_COURS', ecoleId: 'ecole_ism' },
    });
    if (!current) throw new Error('Aucune année EN_COURS dans le seed');

    const res = await api()
      .patch(`/api/annees/${current.id}/cloturer`)
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    expect(res.body.etat).toBe('CLOTUREE');
  });

  it("Direction B ne peut pas cloturer une annee de l'ecole A (404)", async () => {
    const sessionB = await directionB();

    const current = await prisma.anneeAcademique.findFirst({
      where: { etat: 'EN_COURS', ecoleId: 'ecole_ism' },
    });
    if (!current) throw new Error('Aucune année EN_COURS dans le seed');

    const res = await api()
      .patch(`/api/annees/${current.id}/cloturer`)
      .set('Cookie', sessionB.cookieHeader);
    expect(res.status).toBe(404);
  });

  it('RP ne peut pas appeler /debuter (403)', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const planifiee = await prisma.anneeAcademique.create({
      data: {
        id: 'test-annee-rp',
        libelle: '2029-2030 RP Test',
        debut: new Date('2029-09-01'),
        fin: new Date('2030-06-30'),
        etat: 'PLANIFIEE',
        ecoleId: 'ecole_ism',
      },
    });
    const res = await api()
      .patch(`/api/annees/${planifiee.id}/debuter`)
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(403);
  });
});

// ── Salles — scope + CRUD ────────────────────────────────────────────────────

describe('Salles (scope école + CRUD)', () => {
  it('RP voit toutes les salles de son école (y compris communes)', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api().get('/api/salles').set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    // Le seed place plusieurs salles dans ecole_ism.
    expect((res.body as { id: string }[]).length).toBeGreaterThan(0);
  });

  it('Direction peut créer une salle avec rpResponsableId', async () => {
    const session = await directionA();
    // Trouver un RP existant (Aminata Diallo).
    const rp = await prisma.user.findUnique({ where: { email: 'aminata.diallo@planit.test' } });
    if (!rp) throw new Error('RP seed introuvable');

    const res = await api().post('/api/salles').set('Cookie', session.cookieHeader).send({
      name: 'Salle Direction Test',
      type: 'Amphi',
      capacity: 200,
      rpResponsableId: rp.id,
    });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Salle Direction Test');
    expect(res.body.rpResponsable).not.toBeNull();
    expect(res.body.rpResponsable.id).toBe(rp.id);
  });

  it('RP cree une salle => rpResponsableId force null', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const rp = await prisma.user.findUnique({ where: { email: 'aminata.diallo@planit.test' } });
    if (!rp) throw new Error('RP seed introuvable');

    const res = await api().post('/api/salles').set('Cookie', session.cookieHeader).send({
      name: 'Salle RP Commune',
      type: 'TD',
      capacity: 30,
      rpResponsableId: rp.id, // tenté mais doit être ignoré.
    });
    expect(res.status).toBe(201);
    expect(res.body.rpResponsable).toBeNull();
  });

  it('RP tente PUT /api/salles/:id → 403', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    // Récupérer une salle existante du seed.
    const salle = await prisma.salle.findFirst({ where: { ecoleId: 'ecole_ism' } });
    if (!salle) throw new Error('Aucune salle dans le seed');

    const res = await api()
      .put(`/api/salles/${salle.id}`)
      .set('Cookie', session.cookieHeader)
      .send({ name: 'Hack RP' });
    expect(res.status).toBe(403);
  });

  it('Direction peut modifier une salle et assigner un responsable', async () => {
    const session = await directionA();
    const salle = await prisma.salle.findFirst({ where: { ecoleId: 'ecole_ism' } });
    if (!salle) throw new Error('Aucune salle dans le seed');
    const rp = await prisma.user.findUnique({ where: { email: 'aminata.diallo@planit.test' } });
    if (!rp) throw new Error('RP seed introuvable');

    const res = await api()
      .put(`/api/salles/${salle.id}`)
      .set('Cookie', session.cookieHeader)
      .send({ rpResponsableId: rp.id });
    expect(res.status).toBe(200);
    expect(res.body.rpResponsable).not.toBeNull();
    expect(res.body.rpResponsable.id).toBe(rp.id);
  });

  it("Direction B ne peut pas modifier une salle de l'ecole A (403)", async () => {
    const sessionB = await directionB();
    const salle = await prisma.salle.findFirst({ where: { ecoleId: 'ecole_ism' } });
    if (!salle) throw new Error('Aucune salle dans le seed');

    const res = await api()
      .put(`/api/salles/${salle.id}`)
      .set('Cookie', sessionB.cookieHeader)
      .send({ name: 'Hack école B' });
    // PUT nécessite DIRECTION → 200 si même école, 403 si autre école.
    // sessionB est bien DIRECTION mais school B ≠ school A.
    expect(res.status).toBe(403);
  });
});

// ── Planning V2 — isolation école (correctif 3.3 / sécurité) ──────────────────

describe('GET /api/v2/sessions — scope école', () => {
  /**
   * Fuite préexistante : `buildWeekWhere` n'avait aucun filtre école → tout
   * acteur lisait le planning de toutes les écoles. On vérifie que chaque
   * acteur ne voit QUE les séances de son école (Direction A/B + RP A).
   */
  it("Direction A voit le planning de son école, jamais celui de l'école B", async () => {
    const ecoleBSeanceId = await createEcoleBSeance();
    const session = await directionA();
    const res = await api()
      .get(`/api/v2/sessions?weekStart=${monday}`)
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    const ids = (res.body as { id: string }[]).map((s) => s.id);
    expect(ids).toContain('seed-seance-01'); // séance école A (seed)
    expect(ids).not.toContain(ecoleBSeanceId); // école B exclue
  });

  it("Direction B voit la séance de son école, jamais celles de l'école A", async () => {
    const ecoleBSeanceId = await createEcoleBSeance();
    const session = await directionB();
    const res = await api()
      .get(`/api/v2/sessions?weekStart=${monday}`)
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    const ids = (res.body as { id: string }[]).map((s) => s.id);
    expect(ids).toContain(ecoleBSeanceId); // sa séance école B
    expect(ids).not.toContain('seed-seance-01'); // école A exclue
  });

  it("RP de l'école A ne voit PAS le planning de l'école B (non-régression fuite)", async () => {
    const ecoleBSeanceId = await createEcoleBSeance();
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api()
      .get(`/api/v2/sessions?weekStart=${monday}`)
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    const ids = (res.body as { id: string }[]).map((s) => s.id);
    expect(ids).not.toContain(ecoleBSeanceId); // école B invisible pour RP A
    expect(ids).toContain('seed-seance-01'); // ses séances école A restent visibles
  });

  it("GET /:id — Direction A ne peut pas ouvrir une séance de l'école B (404)", async () => {
    const ecoleBSeanceId = await createEcoleBSeance();
    const session = await directionA();
    const res = await api()
      .get(`/api/v2/sessions/${ecoleBSeanceId}`)
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(404);
  });
});

// ── Détail maquette — accès Direction + scope école (correctif 3.4) ───────────

describe('GET /api/maquette-versions/:vid — Direction + scope école', () => {
  // Version GLRS L3 2025 = école A (filière GLRS, École d'Ingénieurs).
  const ECOLE_A_VERSION = 'seed-maqv-glrs-l3-2025';
  // Version MGT L1 2025 = école B (seedEcoleB).
  const ECOLE_B_VERSION = 'seed-maqv-b-2025';

  it('Direction A lit une version de maquette de son école (200)', async () => {
    const session = await directionA();
    const res = await api()
      .get(`/api/maquette-versions/${ECOLE_A_VERSION}`)
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(ECOLE_A_VERSION);
  });

  it("Direction A ne peut pas lire une version d'une autre école (404)", async () => {
    const session = await directionA();
    const res = await api()
      .get(`/api/maquette-versions/${ECOLE_B_VERSION}`)
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(404);
  });

  it('Direction B lit la version de maquette de son école (200)', async () => {
    const session = await directionB();
    const res = await api()
      .get(`/api/maquette-versions/${ECOLE_B_VERSION}`)
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(ECOLE_B_VERSION);
  });

  it("export — Direction A ne peut pas exporter une version d'une autre école (404)", async () => {
    const session = await directionA();
    const res = await api()
      .get(`/api/maquette-versions/${ECOLE_B_VERSION}/export`)
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(404);
  });

  it('RP A lit une version de son école (200) mais pas une autre (404)', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const ok = await api()
      .get(`/api/maquette-versions/${ECOLE_A_VERSION}`)
      .set('Cookie', session.cookieHeader);
    expect(ok.status).toBe(200);
    const ko = await api()
      .get(`/api/maquette-versions/${ECOLE_B_VERSION}`)
      .set('Cookie', session.cookieHeader);
    expect(ko.status).toBe(404);
  });
});

// ── Étudiants — accès Direction + scope école (correctif 3.5) ─────────────────

describe('GET /api/etudiants — Direction scope école', () => {
  it('Direction A et B voient des étudiants distincts (isolation)', async () => {
    const [sessionA, sessionB] = await Promise.all([directionA(), directionB()]);
    const [resA, resB] = await Promise.all([
      api().get('/api/etudiants').set('Cookie', sessionA.cookieHeader),
      api().get('/api/etudiants').set('Cookie', sessionB.cookieHeader),
    ]);
    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);
    const idsA = new Set((resA.body as { id: string }[]).map((e) => e.id));
    const idsB = new Set((resB.body as { id: string }[]).map((e) => e.id));
    for (const id of idsB) {
      expect(idsA.has(id)).toBe(false);
    }
    // L'école A a des étudiants seedés (V03).
    expect(idsA.size).toBeGreaterThan(0);
  });
});

// V05 LOT 7 — la Direction crée/modifie les années de son école (RBAC ouvert).
describe('POST/PUT /api/annees (Direction, V05 LOT 7)', () => {
  it('la Direction planifie une nouvelle année (201, PLANIFIEE)', async () => {
    const session = await directionA();
    const res = await api().post('/api/annees').set('Cookie', session.cookieHeader).send({
      libelle: '2030-2031',
      debut: '2030-09-01T00:00:00.000Z',
      fin: '2031-06-30T00:00:00.000Z',
      etat: 'PLANIFIEE',
    });
    expect(res.status).toBe(201);
    expect(res.body.etat).toBe('PLANIFIEE');
    expect(res.body.libelle).toBe('2030-2031');
  });

  it("la Direction modifie le libellé d'une année de son école (200)", async () => {
    const session = await directionA();
    const annee = await prisma.anneeAcademique.create({
      data: {
        id: 'test-annee-edit',
        libelle: '2031-2032',
        debut: new Date('2031-09-01'),
        fin: new Date('2032-06-30'),
        etat: 'PLANIFIEE',
        ecoleId: 'ecole_ism',
      },
    });
    const res = await api()
      .put(`/api/annees/${annee.id}`)
      .set('Cookie', session.cookieHeader)
      .send({ libelle: '2031-2032 (rév.)' });
    expect(res.status).toBe(200);
    expect(res.body.libelle).toBe('2031-2032 (rév.)');
  });

  it("la Direction B ne modifie pas une année de l'école A (404)", async () => {
    const sessionB = await directionB();
    const anneeA = await prisma.anneeAcademique.findFirst({ where: { ecoleId: 'ecole_ism' } });
    if (!anneeA) throw new Error('Aucune année école A');
    await api()
      .put(`/api/annees/${anneeA.id}`)
      .set('Cookie', sessionB.cookieHeader)
      .send({ libelle: 'Piratage' })
      .expect(404);
  });
});
