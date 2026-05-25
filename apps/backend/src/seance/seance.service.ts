import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type {
  CreateSessionDto,
  SessionDto,
  SessionStatsDto,
  SessionType,
  UpdateSessionDto,
  WeekPlanningQueryDto,
} from '@planit/contracts';
import { PrismaService } from '../common/prisma.service';
import { WsGateway } from '../ws/ws.gateway';
import { seanceInclude, toSessionDto } from './seance.mapper';
import type { SeanceWithRelations } from './seance.mapper';

/** Sentinel class id that matches no row (used when a student has no class). */
const NO_CLASSE = '__no_classe__';

@Injectable()
export class SeanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ws: WsGateway,
  ) {}

  /** B.1 — list the sessions of a week, filtered by actor. */
  async findWeek(query: WeekPlanningQueryDto): Promise<SessionDto[]> {
    const where = await this.buildWeekWhere(query);
    const seances = await this.prisma.seance.findMany({
      where,
      include: seanceInclude,
      orderBy: { startAt: 'asc' },
      take: query.take,
      skip: query.skip,
    });
    return seances.map(toSessionDto);
  }

  /** B.7 — weekly planning counters. */
  async stats(query: WeekPlanningQueryDto): Promise<SessionStatsDto> {
    const where = await this.buildWeekWhere(query);
    const seances = await this.prisma.seance.findMany({
      where,
      select: { type: true, isPublished: true },
    });
    const byType: Record<SessionType, number> = {
      CM: 0,
      TD: 0,
      TP: 0,
      EXAM: 0,
      RATTRAP: 0,
      DEVOIR: 0,
      EVENT: 0,
    };
    let published = 0;
    for (const seance of seances) {
      byType[seance.type] = (byType[seance.type] ?? 0) + 1;
      if (seance.isPublished) published += 1;
    }
    return {
      total: seances.length,
      published,
      pending: seances.length - published,
      byType,
    };
  }

  /** B.4 — single session detail. */
  async findOne(id: string): Promise<SessionDto> {
    const seance = await this.prisma.seance.findUnique({ where: { id }, include: seanceInclude });
    if (!seance) throw new NotFoundException(`Séance ${id} introuvable`);
    return toSessionDto(seance);
  }

  /** B.2 — create a session (always unpublished on creation). */
  async create(dto: CreateSessionDto): Promise<SessionDto> {
    const seance = await this.prisma.seance.create({
      data: {
        type: dto.type,
        status: 'PROVISOIRE',
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        isPublished: false,
        lastModifiedAt: new Date(),
        lastPublishedAt: null,
        classeId: dto.classeId,
        moduleId: dto.moduleId,
        salleId: dto.salleId,
        teacherId: dto.teacherId,
      },
      include: seanceInclude,
    });
    return toSessionDto(seance);
  }

  /** B.3 — update a session; any change reverts it to unpublished. */
  async update(id: string, dto: UpdateSessionDto): Promise<SessionDto> {
    const seance = await this.prisma.seance.update({
      where: { id },
      data: {
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.classeId !== undefined ? { classeId: dto.classeId } : {}),
        ...(dto.moduleId !== undefined ? { moduleId: dto.moduleId } : {}),
        ...(dto.salleId !== undefined ? { salleId: dto.salleId } : {}),
        ...(dto.teacherId !== undefined ? { teacherId: dto.teacherId } : {}),
        ...(dto.startAt !== undefined ? { startAt: new Date(dto.startAt) } : {}),
        ...(dto.endAt !== undefined ? { endAt: new Date(dto.endAt) } : {}),
        isPublished: false,
        status: 'PROVISOIRE',
        lastModifiedAt: new Date(),
      },
      include: seanceInclude,
    });
    return toSessionDto(seance);
  }

  /**
   * B.5 — publish every pending session (optionally scoped to a class),
   * then notify the concerned actors over WebSocket (B.6).
   */
  async publish(classeId?: string): Promise<SessionDto[]> {
    const pending = await this.prisma.seance.findMany({
      where: { isPublished: false, ...(classeId ? { classeId } : {}) },
      select: { id: true },
    });
    if (pending.length === 0) return [];

    const ids = pending.map((seance) => seance.id);
    await this.prisma.seance.updateMany({
      where: { id: { in: ids } },
      data: { isPublished: true, status: 'PUBLIE', lastPublishedAt: new Date() },
    });

    const published = await this.prisma.seance.findMany({
      where: { id: { in: ids } },
      include: seanceInclude,
      orderBy: { startAt: 'asc' },
    });
    const dtos = published.map(toSessionDto);
    const userIds = await this.concernedUserIds(published);
    this.ws.emitSessionPublished(userIds, dtos);
    return dtos;
  }

  // ── Helpers ───────────────────────────────────────────────────────

  /** Build the Prisma `where` for a week, applying optional actor filters. */
  private async buildWeekWhere(query: WeekPlanningQueryDto): Promise<Prisma.SeanceWhereInput> {
    const weekStart = new Date(`${query.weekStart}T00:00:00.000Z`);
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

    const where: Prisma.SeanceWhereInput = { startAt: { gte: weekStart, lt: weekEnd } };
    if (query.classeId) where.classeId = query.classeId;
    if (query.teacherId) where.teacherId = query.teacherId;
    if (query.studentId) {
      const student = await this.prisma.user.findUnique({
        where: { id: query.studentId },
        select: { classeId: true },
      });
      where.classeId = student?.classeId ?? NO_CLASSE;
    }
    return where;
  }

  /** Actors concerned by a set of sessions: their teachers + students of their classes. */
  private async concernedUserIds(seances: SeanceWithRelations[]): Promise<string[]> {
    const teacherIds = seances.map((seance) => seance.teacherId);
    const classeIds = [...new Set(seances.map((seance) => seance.classeId))];
    const students = await this.prisma.user.findMany({
      where: { classeId: { in: classeIds }, role: 'ETUDIANT' },
      select: { id: true },
    });
    return [...new Set([...teacherIds, ...students.map((student) => student.id)])];
  }
}
