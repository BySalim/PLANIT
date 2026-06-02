import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { WsGateway } from '../src/ws/ws.gateway';
import { createTestApp } from './helpers/app';
import { loginAs } from './helpers/auth';
import { resetDb } from './helpers/db';

const prisma = new PrismaClient();
let app: INestApplication;
let emitSpy: MockInstance;

/** Current week's Monday as YYYY-MM-DD — matches the seed anchoring. */
function currentMonday(): string {
  const today = new Date();
  const dow = today.getUTCDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + offset),
  );
  return monday.toISOString().slice(0, 10);
}

const weekStart = currentMonday();

beforeAll(async () => {
  app = await createTestApp();
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

beforeEach(async () => {
  await resetDb(prisma);
  emitSpy = vi.spyOn(app.get(WsGateway), 'emitSessionPublished').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

const api = (): ReturnType<typeof request> => request(app.getHttpServer());

describe('GET /api/v2/sessions (B.3)', () => {
  it('liste les 10 séances seed avec leurs classes (multi-classes incluses)', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api()
      .get(`/api/v2/sessions?weekStart=${weekStart}`)
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(10);
    const conf = (res.body as { libelle: string; classes: unknown[] }[]).find((s) =>
      s.libelle.startsWith('Conférence IA'),
    );
    expect(conf?.classes).toHaveLength(2); // multi-classes V2-D6
  });

  it('filtre par classeId via la N-N (la séance multi-classes apparaît pour GL3-A ET GL3-B)', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const resA = await api()
      .get(`/api/v2/sessions?weekStart=${weekStart}&classeId=seed-classe-gl3a`)
      .set('Cookie', session.cookieHeader);
    const resB = await api()
      .get(`/api/v2/sessions?weekStart=${weekStart}&classeId=seed-classe-gl3b`)
      .set('Cookie', session.cookieHeader);
    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);
    const idsA = (resA.body as { id: string }[]).map((s) => s.id);
    const idsB = (resB.body as { id: string }[]).map((s) => s.id);
    expect(idsA).toContain('seed-seance-07-conf');
    expect(idsB).toContain('seed-seance-07-conf');
  });

  it('refuse 401 sans cookie', async () => {
    const res = await api().get(`/api/v2/sessions?weekStart=${weekStart}`);
    expect(res.status).toBe(401);
  });
});

describe('GET /api/v2/sessions/stats (B.5)', () => {
  it('compte par type V02 + sous-type', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api()
      .get(`/api/v2/sessions/stats?weekStart=${weekStart}`)
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(10);
    expect(res.body.byType.COURS).toBe(8); // 6 héritées + 2 drafts
    expect(res.body.byType.EVALUATION).toBe(1);
    expect(res.body.byType.EVENEMENT).toBe(1);
    expect(res.body.bySousType.CM).toBeGreaterThan(0);
    expect(res.body.bySousType.EXAMEN).toBe(1);
  });
});

describe('POST /api/v2/sessions (B.1)', () => {
  function evenementBody(): Record<string, unknown> {
    return {
      type: 'EVENEMENT',
      libelle: 'Conférence test',
      intervenantNom: 'Dr Test',
      description: 'desc test',
      startAt: `${weekStart}T14:00:00.000Z`,
      endAt: `${weekStart}T16:00:00.000Z`,
      classeIds: ['seed-classe-gl3a', 'seed-classe-gl3b'],
      salleId: 'seed-salle-amphi',
    };
  }

  function coursBody(): Record<string, unknown> {
    return {
      type: 'COURS',
      sousType: 'CM',
      libelle: 'Nouvelle séance',
      moduleId: 'seed-module-algo',
      enseignantId: 'seed-enseignant-algo',
      startAt: `${weekStart}T10:00:00.000Z`,
      endAt: `${weekStart}T12:00:00.000Z`,
      classeIds: ['seed-classe-gl3a'],
      salleId: 'seed-salle-201',
    };
  }

  it('crée un EVENEMENT multi-classes (sans module ni enseignant)', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api()
      .post('/api/v2/sessions')
      .set('Cookie', session.cookieHeader)
      .send(evenementBody());
    expect(res.status).toBe(201);
    expect(res.body.type).toBe('EVENEMENT');
    expect(res.body.classes).toHaveLength(2);
    expect(res.body.hasUnpublishedChanges).toBe(true);
    expect(res.body.isPublished).toBe(false);
  });

  it('crée un COURS avec sousType CM', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api()
      .post('/api/v2/sessions')
      .set('Cookie', session.cookieHeader)
      .send(coursBody());
    expect(res.status).toBe(201);
    expect(res.body.type).toBe('COURS');
    expect(res.body.sousType).toBe('CM');
  });

  it('refuse 400 si startAt avant dayStartHour (8h)', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const tooEarly = {
      ...coursBody(),
      startAt: `${weekStart}T07:00:00.000Z`,
      endAt: `${weekStart}T09:00:00.000Z`,
    };
    const res = await api()
      .post('/api/v2/sessions')
      .set('Cookie', session.cookieHeader)
      .send(tooEarly);
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain('8h');
  });

  it('refuse 400 si discriminated union mal formée (EVENEMENT + moduleId)', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const malformed = {
      type: 'EVENEMENT',
      libelle: 'Bad',
      moduleId: 'seed-module-algo', // interdit pour EVENEMENT
      startAt: `${weekStart}T10:00:00.000Z`,
      endAt: `${weekStart}T11:00:00.000Z`,
      classeIds: ['seed-classe-gl3a'],
    };
    const res = await api()
      .post('/api/v2/sessions')
      .set('Cookie', session.cookieHeader)
      .send(malformed);
    expect(res.status).toBe(400);
  });

  it('refuse 403 pour un étudiant', async () => {
    const session = await loginAs(app, 'ETUDIANT');
    const res = await api()
      .post('/api/v2/sessions')
      .set('Cookie', session.cookieHeader)
      .send(coursBody());
    expect(res.status).toBe(403);
  });
});

describe('PUT /api/v2/sessions/:id (B.2 + smart dirty)', () => {
  it('met à jour l’heure et passe hasUnpublishedChanges à true', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api()
      .put('/api/v2/sessions/seed-seance-01')
      .set('Cookie', session.cookieHeader)
      .send({ endAt: `${weekStart}T13:00:00.000Z` });
    expect(res.status).toBe(200);
    expect(res.body.hasUnpublishedChanges).toBe(true);
  });

  it('smart dirty : retour à l’état publié → hasUnpublishedChanges=false', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    // 1. Lire l'état publié initial
    const before = await api()
      .get('/api/v2/sessions/seed-seance-01')
      .set('Cookie', session.cookieHeader);
    const originalEndAt = before.body.endAt;

    // 2. Modifier (devient dirty)
    await api()
      .put('/api/v2/sessions/seed-seance-01')
      .set('Cookie', session.cookieHeader)
      .send({ endAt: `${weekStart}T13:00:00.000Z` });

    // 3. Revenir à l'état d'origine — doit redevenir clean
    const after = await api()
      .put('/api/v2/sessions/seed-seance-01')
      .set('Cookie', session.cookieHeader)
      .send({ endAt: originalEndAt });
    expect(after.status).toBe(200);
    expect(after.body.hasUnpublishedChanges).toBe(false);
  });

  it('renvoie 404 sur id inconnu', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api()
      .put('/api/v2/sessions/ghost-id')
      .set('Cookie', session.cookieHeader)
      .send({ libelle: 'X' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/v2/sessions/:id (LOT 4 V2)', () => {
  it('supprime une séance non publiée (draft)', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api()
      .delete('/api/v2/sessions/seed-seance-09-draft')
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(204);
    // Vérifie l'absence
    const after = await api()
      .get('/api/v2/sessions/seed-seance-09-draft')
      .set('Cookie', session.cookieHeader);
    expect(after.status).toBe(404);
  });

  it('refuse 400 si la séance a déjà été publiée', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api()
      .delete('/api/v2/sessions/seed-seance-01') // publiée en seed
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(400);
  });

  it('refuse 403 pour un étudiant', async () => {
    const session = await loginAs(app, 'ETUDIANT');
    const res = await api()
      .delete('/api/v2/sessions/seed-seance-09-draft')
      .set('Cookie', session.cookieHeader);
    expect(res.status).toBe(403);
  });
});

describe('POST /api/v2/sessions/publish (B.4 + B.11 WS)', () => {
  it('publie les 2 drafts seed et émet WS aux destinataires multi-classes', async () => {
    const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api().post('/api/v2/sessions/publish').set('Cookie', session.cookieHeader);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    for (const s of res.body) {
      expect(s.isPublished).toBe(true);
      expect(s.hasUnpublishedChanges).toBe(false);
    }
    expect(emitSpy).toHaveBeenCalledTimes(1);
  });
});
