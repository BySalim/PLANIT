import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createTestApp } from './helpers/app';
import { resetDb } from './helpers/db';
import { WsGateway } from '../src/ws/ws.gateway';

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
const prisma = new PrismaClient();
let app: INestApplication;
let emitSpy: MockInstance;

/** A valid create payload referencing seed entities. */
function validCreateBody(): Record<string, string> {
  return {
    type: 'TP',
    classeId: 'seed-classe-gl3a',
    moduleId: 'seed-module-algo',
    salleId: 'seed-salle-labo',
    teacherId: 'seed-teacher-algo',
    startAt: `${weekStart}T08:00:00.000Z`,
    endAt: `${weekStart}T10:00:00.000Z`,
  };
}

beforeAll(async () => {
  app = await createTestApp();
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

beforeEach(async () => {
  await resetDb(prisma);
  // emitSessionPublished is stubbed: a real broadcast needs a live Socket.IO
  // server, which is only attached on app.listen() — not on app.init().
  emitSpy = vi.spyOn(app.get(WsGateway), 'emitSessionPublished').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

const api = (): ReturnType<typeof request> => request(app.getHttpServer());

describe('GET /api/sessions (B.1)', () => {
  // V02 seed: 6 V01-héritées (toutes COURS publiées sur GL3-A, teacher algo/bdd/net)
  // + 1 Conférence multi-classes publiée + 1 Évaluation publiée
  // + 2 drafts non publiées (NET TD GL3-B, SEC CM GL3-A). Total = 10.
  it('returns the 10 seed sessions of the current week', async () => {
    const res = await api().get('/api/sessions').query({ weekStart });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(10);
  });

  it('filters by teacher', async () => {
    const res = await api()
      .get('/api/sessions')
      .query({ weekStart, teacherId: 'seed-teacher-algo' });
    expect(res.status).toBe(200);
    // V02 seed: teacher-algo owns seance-01 (CM), -02 (TD), -05 (CM), the
    // -07-conf placeholder, and -08-eval. = 5 sessions.
    expect(res.body).toHaveLength(5);
    for (const session of res.body) {
      expect(session.teacher.id).toBe('seed-teacher-algo');
    }
  });

  it('rejects a missing weekStart with 400', async () => {
    const res = await api().get('/api/sessions');
    expect(res.status).toBe(400);
  });

  it('rejects an invalid weekStart format with 400', async () => {
    const res = await api().get('/api/sessions').query({ weekStart: 'not-a-date' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/sessions (B.2)', () => {
  it('creates an unpublished session', async () => {
    const res = await api().post('/api/sessions').send(validCreateBody());
    expect(res.status).toBe(201);
    expect(res.body.type).toBe('TP');
    expect(res.body.isPublished).toBe(false);
    expect(res.body.status).toBe('PROVISOIRE');
  });

  it('rejects an invalid body with 400', async () => {
    const res = await api().post('/api/sessions').send({ type: 'CM' });
    expect(res.status).toBe(400);
  });

  it('rejects an unknown foreign key with 400', async () => {
    const res = await api()
      .post('/api/sessions')
      .send({ ...validCreateBody(), moduleId: 'ghost-module' });
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/sessions/:id (B.3)', () => {
  it('updates a session and reverts it to unpublished', async () => {
    const res = await api().put('/api/sessions/seed-seance-01').send({ salleId: 'seed-salle-201' });
    expect(res.status).toBe(200);
    expect(res.body.salle.id).toBe('seed-salle-201');
    expect(res.body.isPublished).toBe(false);
    expect(res.body.status).toBe('PROVISOIRE');
  });

  it('rejects an unknown id with 404', async () => {
    const res = await api().put('/api/sessions/ghost-id').send({ type: 'CM' });
    expect(res.status).toBe(404);
  });

  it('rejects an invalid body with 400', async () => {
    const res = await api().put('/api/sessions/seed-seance-01').send({ startAt: 'not-a-datetime' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/sessions/:id (B.4)', () => {
  it('returns a session detail', async () => {
    const res = await api().get('/api/sessions/seed-seance-01');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('seed-seance-01');
    expect(res.body.module.code).toBe('ALGO');
    expect(res.body.teacher.id).toBe('seed-teacher-algo');
  });

  it('rejects an unknown id with 404', async () => {
    const res = await api().get('/api/sessions/ghost-id');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/sessions/publish (B.5 / B.6)', () => {
  it('publishes every pending session', async () => {
    const res = await api().post('/api/sessions/publish');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2); // seed has 2 pending sessions
    for (const session of res.body) {
      expect(session.isPublished).toBe(true);
      expect(session.status).toBe('PUBLIE');
    }
  });

  it('notifies only the actors concerned by the published sessions', async () => {
    await api().post('/api/sessions/publish').expect(200);

    expect(emitSpy).toHaveBeenCalledTimes(1);
    const userIds = emitSpy.mock.calls[0][0] as string[];
    // V02 seed pending sessions: both drafts (seance-09 NET GL3-B, seance-10
    // SEC GL3-A) belong to teacher-net. seed-student is on GL3-A so receives
    // for seance-10-draft. ALGO and BDD teachers have no pending session.
    expect(userIds).toContain('seed-teacher-net');
    expect(userIds).toContain('seed-student');
    expect(userIds).not.toContain('seed-teacher-algo');
    expect(userIds).not.toContain('seed-teacher-bdd');
  });
});

describe('GET /api/sessions/stats (B.7)', () => {
  it('returns the weekly counters', async () => {
    const res = await api().get('/api/sessions/stats').query({ weekStart });
    expect(res.status).toBe(200);
    // V02 seed: 10 séances, 8 publiées (6 héritées + Conf + Eval), 2 drafts.
    // V01 enum breakdown: CM=4, TD=2, TP=2, EXAM=1, EVENT=1, RATTRAP=0, DEVOIR=0.
    expect(res.body.total).toBe(10);
    expect(res.body.published).toBe(8);
    expect(res.body.pending).toBe(2);
    expect(res.body.byType.CM).toBe(4);
    expect(res.body.byType.TD).toBe(2);
    expect(res.body.byType.TP).toBe(2);
    expect(res.body.byType.EXAM).toBe(1);
    expect(res.body.byType.EVENT).toBe(1);
  });

  it('rejects a missing weekStart with 400', async () => {
    const res = await api().get('/api/sessions/stats');
    expect(res.status).toBe(400);
  });
});
