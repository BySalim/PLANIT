import { NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WeekPlanningQueryDto } from '@planit/contracts';
import { SeanceService } from '../../src/seance/seance.service';
import { seanceInclude } from '../../src/seance/seance.mapper';
import type { SeanceWithRelations } from '../../src/seance/seance.mapper';
import type { PrismaService } from '../../src/common/prisma.service';
import type { WsGateway } from '../../src/ws/ws.gateway';

/**
 * Unit tests for SeanceService.
 * Le PrismaService et WsGateway sont mockés via vi.fn() — pas de DB réelle.
 * On vérifie la logique pure : forme du `where`, pagination, calcul des stats,
 * notification ciblée à la publication.
 */

interface PrismaMock {
  seance: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
  user: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
}

interface WsMock {
  emitSessionPublished: ReturnType<typeof vi.fn>;
}

function buildPrismaMock(): PrismaMock {
  return {
    seance: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  };
}

function buildWsMock(): WsMock {
  return { emitSessionPublished: vi.fn() };
}

/** Builds a SeanceWithRelations stub matching the seanceInclude shape. */
function buildSeance(overrides: Partial<SeanceWithRelations> = {}): SeanceWithRelations {
  const now = new Date('2026-05-25T10:00:00.000Z');
  const base: SeanceWithRelations = {
    id: 'seance-1',
    type: 'CM',
    status: 'PROVISOIRE',
    startAt: now,
    endAt: new Date(now.getTime() + 2 * 60 * 60 * 1000),
    isPublished: false,
    lastModifiedAt: now,
    lastPublishedAt: null,
    classeId: 'classe-1',
    moduleId: 'module-1',
    salleId: 'salle-1',
    teacherId: 'teacher-1',
    classe: { id: 'classe-1', code: 'GL3-A', name: 'Génie Logiciel 3 A' },
    module: { id: 'module-1', code: 'ALGO', name: 'Algorithmique' },
    salle: { id: 'salle-1', name: 'Amphi A' },
    teacher: {
      id: 'teacher-1',
      fullName: 'M. Oumar Ndiaye',
    } as SeanceWithRelations['teacher'],
  } as SeanceWithRelations;
  return { ...base, ...overrides };
}

function baseQuery(overrides: Partial<WeekPlanningQueryDto> = {}): WeekPlanningQueryDto {
  return {
    weekStart: '2026-05-25',
    take: 100,
    skip: 0,
    ...overrides,
  };
}

function instantiateService(prisma: PrismaMock, ws: WsMock): SeanceService {
  return new SeanceService(prisma as unknown as PrismaService, ws as unknown as WsGateway);
}

describe('SeanceService.findWeek', () => {
  let prisma: PrismaMock;
  let ws: WsMock;
  let service: SeanceService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    ws = buildWsMock();
    service = instantiateService(prisma, ws);
    prisma.seance.findMany.mockResolvedValue([]);
  });

  it('passe les defaults take=100/skip=0 à Prisma', async () => {
    await service.findWeek(baseQuery());

    expect(prisma.seance.findMany).toHaveBeenCalledTimes(1);
    const args = prisma.seance.findMany.mock.calls[0][0] as { take: number; skip: number };
    expect(args.take).toBe(100);
    expect(args.skip).toBe(0);
  });

  it('inclut les relations via seanceInclude et trie par startAt asc', async () => {
    await service.findWeek(baseQuery());

    const args = prisma.seance.findMany.mock.calls[0][0] as {
      include: typeof seanceInclude;
      orderBy: { startAt: 'asc' };
    };
    expect(args.include).toBe(seanceInclude);
    expect(args.orderBy).toEqual({ startAt: 'asc' });
  });

  it('baseline sans filtre acteur : where ne contient que la fenêtre temporelle', async () => {
    await service.findWeek(baseQuery());

    const where = (prisma.seance.findMany.mock.calls[0][0] as { where: Prisma.SeanceWhereInput })
      .where;
    expect(where.classeId).toBeUndefined();
    expect(where.teacherId).toBeUndefined();
    // Fenêtre [weekStart ; weekStart + 7j[
    const range = where.startAt as { gte: Date; lt: Date };
    expect(range.gte.toISOString()).toBe('2026-05-25T00:00:00.000Z');
    expect(range.lt.toISOString()).toBe('2026-06-01T00:00:00.000Z');
  });

  it('filtre par teacherId quand fourni', async () => {
    await service.findWeek(baseQuery({ teacherId: 'teacher-42' }));

    const where = (prisma.seance.findMany.mock.calls[0][0] as { where: Prisma.SeanceWhereInput })
      .where;
    expect(where.teacherId).toBe('teacher-42');
    expect(where.classeId).toBeUndefined();
  });

  it('filtre par classeId quand fourni', async () => {
    await service.findWeek(baseQuery({ classeId: 'classe-42' }));

    const where = (prisma.seance.findMany.mock.calls[0][0] as { where: Prisma.SeanceWhereInput })
      .where;
    expect(where.classeId).toBe('classe-42');
    expect(where.teacherId).toBeUndefined();
  });

  it('résout studentId → classeId via prisma.user.findUnique', async () => {
    prisma.user.findUnique.mockResolvedValue({ classeId: 'classe-from-student' });

    await service.findWeek(baseQuery({ studentId: 'student-1' }));

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'student-1' },
      select: { classeId: true },
    });
    const where = (prisma.seance.findMany.mock.calls[0][0] as { where: Prisma.SeanceWhereInput })
      .where;
    expect(where.classeId).toBe('classe-from-student');
  });

  it('étudiant sans classe : where.classeId vaut la sentinelle qui ne match rien', async () => {
    prisma.user.findUnique.mockResolvedValue({ classeId: null });

    await service.findWeek(baseQuery({ studentId: 'student-orphan' }));

    const where = (prisma.seance.findMany.mock.calls[0][0] as { where: Prisma.SeanceWhereInput })
      .where;
    expect(where.classeId).toBe('__no_classe__');
  });

  it('propage take/skip custom (pagination)', async () => {
    await service.findWeek(baseQuery({ take: 50, skip: 25 }));

    const args = prisma.seance.findMany.mock.calls[0][0] as { take: number; skip: number };
    expect(args.take).toBe(50);
    expect(args.skip).toBe(25);
  });

  it('transforme les seances Prisma en SessionDto via le mapper', async () => {
    prisma.seance.findMany.mockResolvedValue([buildSeance()]);

    const result = await service.findWeek(baseQuery());

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('seance-1');
    expect(result[0]?.startAt).toBe('2026-05-25T10:00:00.000Z');
    expect(result[0]?.classe.code).toBe('GL3-A');
  });
});

describe('SeanceService.stats', () => {
  let prisma: PrismaMock;
  let ws: WsMock;
  let service: SeanceService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    ws = buildWsMock();
    service = instantiateService(prisma, ws);
  });

  it('compte total, published, pending et byType', async () => {
    prisma.seance.findMany.mockResolvedValue([
      { type: 'CM', isPublished: true },
      { type: 'CM', isPublished: true },
      { type: 'TD', isPublished: false },
      { type: 'TP', isPublished: true },
      { type: 'EXAM', isPublished: false },
    ]);

    const stats = await service.stats(baseQuery());

    expect(stats.total).toBe(5);
    expect(stats.published).toBe(3);
    expect(stats.pending).toBe(2);
    expect(stats.byType.CM).toBe(2);
    expect(stats.byType.TD).toBe(1);
    expect(stats.byType.TP).toBe(1);
    expect(stats.byType.EXAM).toBe(1);
    expect(stats.byType.RATTRAP).toBe(0);
    expect(stats.byType.DEVOIR).toBe(0);
    expect(stats.byType.EVENT).toBe(0);
  });

  it('retourne tous les compteurs à zéro quand pas de séance', async () => {
    prisma.seance.findMany.mockResolvedValue([]);

    const stats = await service.stats(baseQuery());

    expect(stats.total).toBe(0);
    expect(stats.published).toBe(0);
    expect(stats.pending).toBe(0);
    expect(stats.byType.CM).toBe(0);
  });
});

describe('SeanceService.findOne', () => {
  let prisma: PrismaMock;
  let ws: WsMock;
  let service: SeanceService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    ws = buildWsMock();
    service = instantiateService(prisma, ws);
  });

  it("throw NotFoundException quand l'id n'existe pas", async () => {
    prisma.seance.findUnique.mockResolvedValue(null);

    await expect(service.findOne('inexistant')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('retourne le SessionDto quand la séance existe', async () => {
    prisma.seance.findUnique.mockResolvedValue(buildSeance({ id: 'seance-42' }));

    const result = await service.findOne('seance-42');

    expect(result.id).toBe('seance-42');
    expect(prisma.seance.findUnique).toHaveBeenCalledWith({
      where: { id: 'seance-42' },
      include: seanceInclude,
    });
  });
});

describe('SeanceService.create', () => {
  let prisma: PrismaMock;
  let ws: WsMock;
  let service: SeanceService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    ws = buildWsMock();
    service = instantiateService(prisma, ws);
  });

  it('crée une séance avec status PROVISOIRE et isPublished=false', async () => {
    prisma.seance.create.mockResolvedValue(buildSeance());

    await service.create({
      type: 'CM',
      classeId: 'classe-1',
      moduleId: 'module-1',
      salleId: 'salle-1',
      teacherId: 'teacher-1',
      startAt: '2026-05-25T08:00:00.000Z',
      endAt: '2026-05-25T10:00:00.000Z',
    });

    const args = prisma.seance.create.mock.calls[0][0] as {
      data: { status: string; isPublished: boolean; lastPublishedAt: null };
    };
    expect(args.data.status).toBe('PROVISOIRE');
    expect(args.data.isPublished).toBe(false);
    expect(args.data.lastPublishedAt).toBeNull();
  });
});

describe('SeanceService.publish', () => {
  let prisma: PrismaMock;
  let ws: WsMock;
  let service: SeanceService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    ws = buildWsMock();
    service = instantiateService(prisma, ws);
  });

  it("retourne [] et ne notifie pas quand aucune séance n'est en attente", async () => {
    prisma.seance.findMany.mockResolvedValueOnce([]);

    const result = await service.publish();

    expect(result).toEqual([]);
    expect(prisma.seance.updateMany).not.toHaveBeenCalled();
    expect(ws.emitSessionPublished).not.toHaveBeenCalled();
  });

  it('filtre les pending sur isPublished=false', async () => {
    prisma.seance.findMany.mockResolvedValueOnce([{ id: 'a' }, { id: 'b' }]);
    prisma.seance.updateMany.mockResolvedValue({ count: 2 });
    prisma.seance.findMany.mockResolvedValueOnce([
      buildSeance({ id: 'a' }),
      buildSeance({ id: 'b' }),
    ]);
    prisma.user.findMany.mockResolvedValue([]);

    await service.publish();

    const firstWhere = (
      prisma.seance.findMany.mock.calls[0][0] as { where: { isPublished: boolean } }
    ).where;
    expect(firstWhere.isPublished).toBe(false);
  });

  it('restreint le filtre à un classeId quand fourni', async () => {
    prisma.seance.findMany.mockResolvedValueOnce([{ id: 'a' }]);
    prisma.seance.updateMany.mockResolvedValue({ count: 1 });
    prisma.seance.findMany.mockResolvedValueOnce([buildSeance({ id: 'a' })]);
    prisma.user.findMany.mockResolvedValue([]);

    await service.publish('classe-42');

    const where = (
      prisma.seance.findMany.mock.calls[0][0] as {
        where: { isPublished: boolean; classeId?: string };
      }
    ).where;
    expect(where.classeId).toBe('classe-42');
  });

  it('met isPublished=true, status=PUBLIE, lastPublishedAt sur les pending', async () => {
    prisma.seance.findMany.mockResolvedValueOnce([{ id: 'a' }, { id: 'b' }]);
    prisma.seance.updateMany.mockResolvedValue({ count: 2 });
    prisma.seance.findMany.mockResolvedValueOnce([
      buildSeance({ id: 'a' }),
      buildSeance({ id: 'b' }),
    ]);
    prisma.user.findMany.mockResolvedValue([]);

    await service.publish();

    const args = prisma.seance.updateMany.mock.calls[0][0] as {
      where: { id: { in: string[] } };
      data: { isPublished: boolean; status: string; lastPublishedAt: Date };
    };
    expect(args.where.id.in).toEqual(['a', 'b']);
    expect(args.data.isPublished).toBe(true);
    expect(args.data.status).toBe('PUBLIE');
    expect(args.data.lastPublishedAt).toBeInstanceOf(Date);
  });

  it('notifie teachers uniques + étudiants des classes concernées', async () => {
    prisma.seance.findMany.mockResolvedValueOnce([{ id: 'a' }, { id: 'b' }]);
    prisma.seance.updateMany.mockResolvedValue({ count: 2 });
    // Deux séances : même teacher (dédupliqué), deux classes distinctes.
    prisma.seance.findMany.mockResolvedValueOnce([
      buildSeance({ id: 'a', teacherId: 'T1', classeId: 'C1' }),
      buildSeance({ id: 'b', teacherId: 'T1', classeId: 'C2' }),
    ]);
    prisma.user.findMany.mockResolvedValue([{ id: 'S1' }, { id: 'S2' }]);

    await service.publish();

    expect(ws.emitSessionPublished).toHaveBeenCalledTimes(1);
    const [userIds] = ws.emitSessionPublished.mock.calls[0] as [string[], unknown];
    // T1 unique + 2 étudiants.
    expect(userIds).toContain('T1');
    expect(userIds).toContain('S1');
    expect(userIds).toContain('S2');
    // Pas de doublon T1.
    expect(userIds.filter((id) => id === 'T1')).toHaveLength(1);
    // Les classeIds passés à findMany doivent être dédupliqués.
    const userQuery = prisma.user.findMany.mock.calls[0][0] as {
      where: { classeId: { in: string[] }; role: string };
    };
    expect(new Set(userQuery.where.classeId.in)).toEqual(new Set(['C1', 'C2']));
    expect(userQuery.where.role).toBe('ETUDIANT');
  });
});

describe('SeanceService.update', () => {
  let prisma: PrismaMock;
  let ws: WsMock;
  let service: SeanceService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    ws = buildWsMock();
    service = instantiateService(prisma, ws);
  });

  it('force isPublished=false et status=PROVISOIRE sur toute update', async () => {
    prisma.seance.update.mockResolvedValue(buildSeance());

    await service.update('seance-1', { salleId: 'salle-2' });

    const args = prisma.seance.update.mock.calls[0][0] as {
      data: { isPublished: boolean; status: string; salleId?: string };
    };
    expect(args.data.isPublished).toBe(false);
    expect(args.data.status).toBe('PROVISOIRE');
    expect(args.data.salleId).toBe('salle-2');
  });

  it("n'inclut pas les champs non fournis dans le payload (partial update)", async () => {
    prisma.seance.update.mockResolvedValue(buildSeance());

    await service.update('seance-1', { type: 'TD' });

    const data = (
      prisma.seance.update.mock.calls[0][0] as {
        data: Record<string, unknown>;
      }
    ).data;
    expect(data.type).toBe('TD');
    expect(data.classeId).toBeUndefined();
    expect(data.moduleId).toBeUndefined();
    expect(data.salleId).toBeUndefined();
    expect(data.teacherId).toBeUndefined();
    expect(data.startAt).toBeUndefined();
    expect(data.endAt).toBeUndefined();
  });
});
