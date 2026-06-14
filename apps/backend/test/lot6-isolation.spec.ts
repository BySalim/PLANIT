/**
 * Tests d'intégration — V05 LOT 6 : espaces de travail RP isolés (ADR-0022).
 *
 * Scénarios couverts :
 *  - Isolation RP : un RP ne voit que ce qu'il a créé ; la Direction voit toute
 *    l'école ; une filière créée par RP2 est invisible de RP1.
 *  - Fix Suivi Direction : GET /suivi-modules → 200 (plus de 403/redirection).
 *  - Masquage planning en référentiel Salle (occupation visible, détails masqués).
 *  - Salle subjective : visible du seul créateur, jamais de la Direction.
 *  - Assignation AC ↔ classes par la Direction (école-large).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createTestApp } from './helpers/app';
import { DIRECTION_B_EMAIL, loginAs, loginByEmail, RP2_EMAIL } from './helpers/auth';
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

/** Lundi de la semaine courante (les séances seed y sont ancrées). */
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

// ── Isolation de l'espace de travail RP ──────────────────────────────────────

describe('Isolation espace de travail RP (ADR-0022)', () => {
  it('RP1 voit son référentiel ; RP2 (sans création) ne voit rien', async () => {
    const rp1 = await loginAs(app, 'RESPONSABLE_PROGRAMME'); // seed-rp, owns école A
    const rp2 = await loginByEmail(app, RP2_EMAIL); // seed-rp2, owns rien au seed

    const f1 = await api().get('/api/filieres').set('Cookie', rp1.cookieHeader).expect(200);
    expect(f1.body.length).toBeGreaterThan(0);

    const f2 = await api().get('/api/filieres').set('Cookie', rp2.cookieHeader).expect(200);
    expect(f2.body).toEqual([]);

    const c2 = await api().get('/api/classes').set('Cookie', rp2.cookieHeader).expect(200);
    expect(c2.body).toEqual([]);

    const m2 = await api().get('/api/maquettes').set('Cookie', rp2.cookieHeader).expect(200);
    expect(m2.body).toEqual([]);
  });

  it('une filière créée par RP2 est invisible de RP1 mais visible de la Direction', async () => {
    const rp1 = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const rp2 = await loginByEmail(app, RP2_EMAIL);
    const direction = await loginAs(app, 'DIRECTION');

    const created = await api()
      .post('/api/filieres')
      .set('Cookie', rp2.cookieHeader)
      .send({ sigle: 'TST', libelle: 'Filière Test RP2', isDoubleDiplome: false, grade: 'LICENCE' })
      .expect(201);
    const id = created.body.id as string;

    const seenByRp2 = await api().get('/api/filieres').set('Cookie', rp2.cookieHeader).expect(200);
    expect(seenByRp2.body.map((f: { id: string }) => f.id)).toContain(id);

    const seenByRp1 = await api().get('/api/filieres').set('Cookie', rp1.cookieHeader).expect(200);
    expect(seenByRp1.body.map((f: { id: string }) => f.id)).not.toContain(id);

    const seenByDir = await api()
      .get('/api/filieres')
      .set('Cookie', direction.cookieHeader)
      .expect(200);
    expect(seenByDir.body.map((f: { id: string }) => f.id)).toContain(id);
  });
});

// ── Fix Suivi Direction ──────────────────────────────────────────────────────

describe('Suivi des modules — Direction (fix LOT 6)', () => {
  it('GET /suivi-modules en Direction → 200 (plus de 403/redirection)', async () => {
    const direction = await loginAs(app, 'DIRECTION');
    const res = await api()
      .get('/api/suivi-modules')
      .set('Cookie', direction.cookieHeader)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// ── Masquage planning en référentiel Salle ───────────────────────────────────

describe('Planning — masquage en référentiel Salle (ADR-0022 §4)', () => {
  const SALLE_AMPHI = 'seed-salle-amphi'; // contient des séances de RP1 (seed-rp)

  it("RP2 voit l'occupation de la salle mais les séances de RP1 sont masquées", async () => {
    const rp2 = await loginByEmail(app, RP2_EMAIL);
    const res = await api()
      .get(`/api/v2/sessions?weekStart=${monday}&salleId=${SALLE_AMPHI}`)
      .set('Cookie', rp2.cookieHeader)
      .expect(200);

    expect(res.body.length).toBeGreaterThan(0);
    for (const s of res.body as Array<Record<string, unknown>>) {
      // Assertion négative : aucun détail identifiant ne fuite.
      expect(s.masked).toBe(true);
      expect(s.module).toBeNull();
      expect(s.enseignant).toBeNull();
      expect(s.classes).toEqual([]);
      expect(s.libelle).toBe('');
      expect(s.description).toBeNull();
      // Seuls le créneau + le nom du RP propriétaire restent visibles.
      expect(s.ownerRpName).toBeTruthy();
      expect(s.startAt).toBeTruthy();
    }
  });

  it('RP1 voit ses propres séances de la salle en clair (non masquées)', async () => {
    const rp1 = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api()
      .get(`/api/v2/sessions?weekStart=${monday}&salleId=${SALLE_AMPHI}`)
      .set('Cookie', rp1.cookieHeader)
      .expect(200);

    expect(res.body.length).toBeGreaterThan(0);
    const anyDetailed = (res.body as Array<Record<string, unknown>>).some(
      (s) => s.masked === false && s.module !== null,
    );
    expect(anyDetailed).toBe(true);
  });

  it('la Direction voit la salle en clair (jamais de masquage)', async () => {
    const direction = await loginAs(app, 'DIRECTION');
    const res = await api()
      .get(`/api/v2/sessions?weekStart=${monday}&salleId=${SALLE_AMPHI}`)
      .set('Cookie', direction.cookieHeader)
      .expect(200);
    for (const s of res.body as Array<Record<string, unknown>>) {
      expect(s.masked).toBe(false);
    }
  });

  // V05 LOT 7 — vue byroom (scope=ecole) : occupation école entière masquée.
  it('RP2 en scope=ecole voit l’occupation école avec les séances de RP1 masquées', async () => {
    const rp2 = await loginByEmail(app, RP2_EMAIL);
    const res = await api()
      .get(`/api/v2/sessions?weekStart=${monday}&scope=ecole`)
      .set('Cookie', rp2.cookieHeader)
      .expect(200);
    expect(res.body.length).toBeGreaterThan(0);
    // Toutes les séances (toutes de RP1 au seed) sont masquées pour RP2.
    for (const s of res.body as Array<Record<string, unknown>>) {
      expect(s.masked).toBe(true);
      expect(s.module).toBeNull();
      expect(s.classes).toEqual([]);
      expect(s.enseignant).toBeNull();
    }
  });
});

// ── Salles subjectives ───────────────────────────────────────────────────────

describe('Salles subjectives (ADR-0022 §5)', () => {
  const SUBJ_NAME = 'Salle projet (hypothétique)'; // seedée, owner seed-rp

  it('le créateur RP voit sa salle subjective dans la liste', async () => {
    const rp1 = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api().get('/api/salles').set('Cookie', rp1.cookieHeader).expect(200);
    const subj = (res.body as Array<{ name: string; isSubjective: boolean }>).find(
      (s) => s.name === SUBJ_NAME,
    );
    expect(subj).toBeDefined();
    expect(subj?.isSubjective).toBe(true);
  });

  it('la Direction ne voit pas les salles subjectives', async () => {
    const direction = await loginAs(app, 'DIRECTION');
    const res = await api().get('/api/salles').set('Cookie', direction.cookieHeader).expect(200);
    expect((res.body as Array<{ name: string }>).some((s) => s.name === SUBJ_NAME)).toBe(false);
  });

  it("un autre RP ne voit pas la salle subjective d'un confrère", async () => {
    const rp2 = await loginByEmail(app, RP2_EMAIL);
    const res = await api().get('/api/salles').set('Cookie', rp2.cookieHeader).expect(200);
    expect((res.body as Array<{ name: string }>).some((s) => s.name === SUBJ_NAME)).toBe(false);
  });

  it('un RP crée puis supprime sa propre salle subjective', async () => {
    const rp2 = await loginByEmail(app, RP2_EMAIL);
    const created = await api()
      .post('/api/salles')
      .set('Cookie', rp2.cookieHeader)
      .send({ name: 'Salle fantôme RP2', type: 'Salle de cours', capacity: 15, isSubjective: true })
      .expect(201);
    expect(created.body.isSubjective).toBe(true);

    const list = await api().get('/api/salles').set('Cookie', rp2.cookieHeader).expect(200);
    expect((list.body as Array<{ name: string }>).some((s) => s.name === 'Salle fantôme RP2')).toBe(
      true,
    );

    await api()
      .delete(`/api/salles/${created.body.id}`)
      .set('Cookie', rp2.cookieHeader)
      .expect(204);
  });
});

// ── Assignation AC ↔ classes par la Direction ────────────────────────────────

describe('Assignation AC par la Direction (ADR-0022 §7)', () => {
  async function ecoleAClasseId(): Promise<string> {
    const classe = await prisma.classe.findFirst({
      where: {
        OR: [
          { formation: { filiere: { ecoleId: 'ecole_ism' } } },
          { filiere: { ecoleId: 'ecole_ism' } },
        ],
      },
      select: { id: true },
    });
    if (!classe) throw new Error('Aucune classe école A');
    return classe.id;
  }

  it('la Direction définit les classes assignées à un AC de son école → 204', async () => {
    const direction = await loginAs(app, 'DIRECTION');
    const ac = await loginAs(app, 'ASSISTANT_PROGRAMME'); // seed-ac, école A
    const classeId = await ecoleAClasseId();

    await api()
      .put(`/api/ac/${ac.userId}/classes`)
      .set('Cookie', direction.cookieHeader)
      .send({ classeIds: [classeId] })
      .expect(200);

    const got = await api()
      .get(`/api/ac/${ac.userId}/classes`)
      .set('Cookie', direction.cookieHeader)
      .expect(200);
    expect(got.body.classeIds).toEqual([classeId]);
  });

  it("refuse 400 une classe hors de l'école de la Direction", async () => {
    const direction = await loginAs(app, 'DIRECTION');
    const ac = await loginAs(app, 'ASSISTANT_PROGRAMME');
    const classeB = await prisma.classe.findFirst({
      where: {
        OR: [
          { formation: { filiere: { ecoleId: 'seed-ecole-b' } } },
          { filiere: { ecoleId: 'seed-ecole-b' } },
        ],
      },
      select: { id: true },
    });
    if (!classeB) throw new Error('Aucune classe école B au seed');

    await api()
      .put(`/api/ac/${ac.userId}/classes`)
      .set('Cookie', direction.cookieHeader)
      .send({ classeIds: [classeB.id] })
      .expect(400);
  });

  it('un RP ne peut pas utiliser la route Direction de set classes → 403', async () => {
    const rp1 = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const ac = await loginAs(app, 'ASSISTANT_PROGRAMME');
    await api()
      .put(`/api/ac/${ac.userId}/classes`)
      .set('Cookie', rp1.cookieHeader)
      .send({ classeIds: [] })
      .expect(403);
  });

  it("isolation cross-école : la Direction B ne gère pas un AC de l'école A → 404", async () => {
    const directionB = await loginByEmail(app, DIRECTION_B_EMAIL);
    const acA = await loginAs(app, 'ASSISTANT_PROGRAMME'); // école A
    await api()
      .put(`/api/ac/${acA.userId}/classes`)
      .set('Cookie', directionB.cookieHeader)
      .send({ classeIds: [] })
      .expect(404);
  });
});
