import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createTestApp } from './helpers/app';
import { loginAs, loginByEmail } from './helpers/auth';
import { resetDb } from './helpers/db';

const prisma = new PrismaClient();
let app: INestApplication;

// Identifiants stables du seed v5 (lot 0.6).
const ECOLE_A_ID = 'ecole_ism';

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

/** Crée un compte via l'API Admin et renvoie la réponse + le body envoyé. */
async function createUser(cookie: string, overrides: Record<string, unknown> = {}) {
  const body = {
    email: `compte.${Math.random().toString(36).slice(2, 9)}@planit.test`,
    fullName: 'Compte Test',
    role: 'ENSEIGNANT',
    password: 'MotDePasse123456',
    ecoleId: ECOLE_A_ID,
    ...overrides,
  };
  const res = await api().post('/api/utilisateurs').set('Cookie', cookie).send(body);
  return { res, body };
}

async function rawLogin(email: string, password: string) {
  return api().post('/api/auth/login').send({ email, password });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1.1 — Écoles
// ─────────────────────────────────────────────────────────────────────────────
describe('Écoles (1.1)', () => {
  it('GET /api/ecoles — un admin liste les écoles actives', async () => {
    const admin = await loginAs(app, 'ADMIN');
    const res = await api().get('/api/ecoles').set('Cookie', admin.cookieHeader);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2); // 2 écoles seedées
  });

  it('refuse 403 à un non-admin', async () => {
    const ens = await loginAs(app, 'ENSEIGNANT');
    const res = await api().get('/api/ecoles').set('Cookie', ens.cookieHeader);
    expect(res.status).toBe(403);
  });

  it('POST crée une école et trace l’audit', async () => {
    const admin = await loginAs(app, 'ADMIN');
    const res = await api()
      .post('/api/ecoles')
      .set('Cookie', admin.cookieHeader)
      .send({ nom: 'École de Test V05' });
    expect(res.status).toBe(201);
    expect(res.body.nom).toBe('École de Test V05');
    expect(res.body.statut).toBe('ACTIVE');

    const audit = await prisma.auditLog.findFirst({
      where: { action: 'ecole.create', targetId: res.body.id },
    });
    expect(audit).not.toBeNull();
  });

  it('refuse 409 sur un nom d’école déjà pris', async () => {
    const admin = await loginAs(app, 'ADMIN');
    await api().post('/api/ecoles').set('Cookie', admin.cookieHeader).send({ nom: 'Doublon' });
    const res = await api()
      .post('/api/ecoles')
      .set('Cookie', admin.cookieHeader)
      .send({ nom: 'Doublon' });
    expect(res.status).toBe(409);
  });

  it('PATCH /:id/archive archive l’école (sort des listes)', async () => {
    const admin = await loginAs(app, 'ADMIN');
    const created = await api()
      .post('/api/ecoles')
      .set('Cookie', admin.cookieHeader)
      .send({ nom: 'À Archiver' });
    const archive = await api()
      .patch(`/api/ecoles/${created.body.id}/archive`)
      .set('Cookie', admin.cookieHeader);
    expect(archive.status).toBe(200);
    expect(archive.body.statut).toBe('ARCHIVEE');

    const list = await api().get('/api/ecoles').set('Cookie', admin.cookieHeader);
    expect(list.body.map((e: { id: string }) => e.id)).not.toContain(created.body.id);

    const audit = await prisma.auditLog.findFirst({
      where: { action: 'ecole.archive', targetId: created.body.id },
    });
    expect(audit).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 1.2 — Créer la Direction
// ─────────────────────────────────────────────────────────────────────────────
describe('Créer Direction (1.2)', () => {
  it('POST /api/ecoles/:id/direction crée un compte DIRECTION connectable + audit', async () => {
    const admin = await loginAs(app, 'ADMIN');
    const res = await api()
      .post(`/api/ecoles/${ECOLE_A_ID}/direction`)
      .set('Cookie', admin.cookieHeader)
      .send({
        email: 'dir.test@planit.test',
        fullName: 'Direction Test',
        password: 'DirPwd12345678',
      });
    expect(res.status).toBe(201);
    expect(res.body.role).toBe('DIRECTION');
    expect(res.body.ecoleId).toBe(ECOLE_A_ID);

    // Le compte créé peut se connecter.
    const login = await rawLogin('dir.test@planit.test', 'DirPwd12345678');
    expect(login.status).toBe(200);

    const audit = await prisma.auditLog.findFirst({ where: { action: 'ecole.direction.create' } });
    expect(audit).not.toBeNull();
  });

  it('refuse 404 sur une école inconnue', async () => {
    const admin = await loginAs(app, 'ADMIN');
    const res = await api()
      .post('/api/ecoles/ecole-fantome/direction')
      .set('Cookie', admin.cookieHeader)
      .send({ email: 'x@planit.test', fullName: 'X', password: 'Password12345' });
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 1.3 — Utilisateurs cross-école
// ─────────────────────────────────────────────────────────────────────────────
describe('Utilisateurs (1.3)', () => {
  it('GET /api/utilisateurs — paginé, filtrable par rôle', async () => {
    const admin = await loginAs(app, 'ADMIN');
    const res = await api()
      .get('/api/utilisateurs?role=ENSEIGNANT')
      .set('Cookie', admin.cookieHeader);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items.every((u: { role: string }) => u.role === 'ENSEIGNANT')).toBe(true);
  });

  it('refuse 403 à un non-admin', async () => {
    const rp = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api().get('/api/utilisateurs').set('Cookie', rp.cookieHeader);
    expect(res.status).toBe(403);
  });

  it('POST crée un compte (argon2id) + audit, et il peut se connecter', async () => {
    const admin = await loginAs(app, 'ADMIN');
    const { res, body } = await createUser(admin.cookieHeader);
    expect(res.status).toBe(201);
    expect(res.body.role).toBe('ENSEIGNANT');
    expect(res.body.ecole?.id).toBe(ECOLE_A_ID);

    const login = await rawLogin(body.email as string, body.password as string);
    expect(login.status).toBe(200);

    const audit = await prisma.auditLog.findFirst({
      where: { action: 'user.create', targetId: res.body.id },
    });
    expect(audit).not.toBeNull();
  });

  it('refuse 400 si ecoleId manquant pour un rôle scopé', async () => {
    const admin = await loginAs(app, 'ADMIN');
    const { res } = await createUser(admin.cookieHeader, { ecoleId: undefined });
    expect(res.status).toBe(400);
  });

  it('suspendre → login refusé ; réactiver → login de nouveau OK', async () => {
    const admin = await loginAs(app, 'ADMIN');
    const { res, body } = await createUser(admin.cookieHeader, { password: 'SuspPwd12345678' });
    const id = res.body.id as string;

    expect((await rawLogin(body.email as string, 'SuspPwd12345678')).status).toBe(200);

    const suspend = await api()
      .patch(`/api/utilisateurs/${id}/suspendre`)
      .set('Cookie', admin.cookieHeader);
    expect(suspend.status).toBe(200);
    expect(suspend.body.statut).toBe('SUSPENDU');

    expect((await rawLogin(body.email as string, 'SuspPwd12345678')).status).toBe(401);

    const reactivate = await api()
      .patch(`/api/utilisateurs/${id}/reactiver`)
      .set('Cookie', admin.cookieHeader);
    expect(reactivate.status).toBe(200);
    expect((await rawLogin(body.email as string, 'SuspPwd12345678')).status).toBe(200);

    const audit = await prisma.auditLog.findFirst({
      where: { action: 'user.suspend', targetId: id },
    });
    expect(audit).not.toBeNull();
  });

  it('archiver → sort des listes + login refusé', async () => {
    const admin = await loginAs(app, 'ADMIN');
    const { res, body } = await createUser(admin.cookieHeader, { password: 'ArchPwd12345678' });
    const id = res.body.id as string;

    const archive = await api()
      .patch(`/api/utilisateurs/${id}/archiver`)
      .set('Cookie', admin.cookieHeader);
    expect(archive.status).toBe(200);

    const list = await api()
      .get(`/api/utilisateurs?q=${encodeURIComponent(body.email as string)}`)
      .set('Cookie', admin.cookieHeader);
    expect(list.body.items.map((u: { id: string }) => u.id)).not.toContain(id);

    expect((await rawLogin(body.email as string, 'ArchPwd12345678')).status).toBe(401);
  });

  it('reset-password → nouveau mot de passe fonctionne, ancien refusé', async () => {
    const admin = await loginAs(app, 'ADMIN');
    const { res, body } = await createUser(admin.cookieHeader, { password: 'OrigPwd12345678' });
    const id = res.body.id as string;

    const reset = await api()
      .post(`/api/utilisateurs/${id}/reset-password`)
      .set('Cookie', admin.cookieHeader);
    expect(reset.status).toBe(201);
    expect(typeof reset.body.temporaryPassword).toBe('string');
    expect(reset.body.temporaryPassword.length).toBeGreaterThanOrEqual(12);

    expect((await rawLogin(body.email as string, 'OrigPwd12345678')).status).toBe(401);
    expect((await rawLogin(body.email as string, reset.body.temporaryPassword)).status).toBe(200);
  });

  it('refuse 400 de suspendre son propre compte', async () => {
    const admin = await loginAs(app, 'ADMIN');
    const res = await api()
      .patch(`/api/utilisateurs/${admin.userId}/suspendre`)
      .set('Cookie', admin.cookieHeader);
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 1.5 — RBAC ADMIN vs SUPER_ADMIN
// ─────────────────────────────────────────────────────────────────────────────
describe('RBAC ADMIN vs SUPER_ADMIN (1.5)', () => {
  it('un ADMIN ne peut pas créer un compte ADMIN → 403', async () => {
    const admin = await loginAs(app, 'ADMIN');
    const res = await api().post('/api/utilisateurs').set('Cookie', admin.cookieHeader).send({
      email: 'mini.admin@planit.test',
      fullName: 'Mini',
      role: 'ADMIN',
      password: 'AdminPwd123456',
    });
    expect(res.status).toBe(403);
  });

  it('un SUPER_ADMIN crée un compte ADMIN (ecoleId null) → 201', async () => {
    const superAdmin = await loginAs(app, 'SUPER_ADMIN');
    const res = await api().post('/api/utilisateurs').set('Cookie', superAdmin.cookieHeader).send({
      email: 'second.admin@planit.test',
      fullName: 'Second Admin',
      role: 'ADMIN',
      password: 'AdminPwd123456',
    });
    expect(res.status).toBe(201);
    expect(res.body.role).toBe('ADMIN');
    expect(res.body.ecoleId).toBeNull();
  });

  it('refuse 400 si un ADMIN/SUPER_ADMIN reçoit un ecoleId', async () => {
    const superAdmin = await loginAs(app, 'SUPER_ADMIN');
    const res = await api().post('/api/utilisateurs').set('Cookie', superAdmin.cookieHeader).send({
      email: 'bad.admin@planit.test',
      fullName: 'Bad',
      role: 'ADMIN',
      password: 'AdminPwd123456',
      ecoleId: ECOLE_A_ID,
    });
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 1.4 — Journal d'audit
// ─────────────────────────────────────────────────────────────────────────────
describe("Journal d'audit (1.4)", () => {
  it('GET /api/journal liste les actions tracées, filtrable par action', async () => {
    const admin = await loginAs(app, 'ADMIN');
    await api().post('/api/ecoles').set('Cookie', admin.cookieHeader).send({ nom: 'Pour Journal' });

    const res = await api()
      .get('/api/journal?action=ecole.create')
      .set('Cookie', admin.cookieHeader);
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
    expect(res.body.items.every((l: { action: string }) => l.action.includes('ecole.create'))).toBe(
      true,
    );
    expect(res.body.items[0].actor?.fullName).toBeTruthy();
  });

  it('refuse 403 à un non-admin', async () => {
    const rp = await loginAs(app, 'RESPONSABLE_PROGRAMME');
    const res = await api().get('/api/journal').set('Cookie', rp.cookieHeader);
    expect(res.status).toBe(403);
  });
});
