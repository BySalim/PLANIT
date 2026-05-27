import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type {
  CreateSessionV2Dto,
  SessionTypeV2,
  SessionV2Dto,
  UpdateSessionV2Dto,
} from '@planit/contracts';
import { PrismaService } from '../common/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { WsGateway } from '../ws/ws.gateway';
import { computeSnapshot, isDirty } from './dirty-detection';
import { mapV2ToV01Type, seanceV2Include, toSessionV2Dto } from './seance-v2.mapper';
import type { SeanceV2WithRelations } from './seance-v2.mapper';

/** Query parameters parsed at the controller level. */
export interface WeekV2Query {
  weekStart: string; // YYYY-MM-DD
  classeId?: string;
  teacherId?: string; // enseignantId V02
  studentId?: string; // → resolved to classeId via user
  take?: number;
  skip?: number;
}

export interface PublishV2Query {
  classeId?: string;
  seanceIds?: string[];
}

const NO_CLASSE = '__no_classe__';

@Injectable()
export class SeanceV2Service {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly ws: WsGateway,
  ) {}

  // ── Reads ──────────────────────────────────────────────────────────

  async findWeek(query: WeekV2Query): Promise<SessionV2Dto[]> {
    const where = await this.buildWeekWhere(query);
    const rows = await this.prisma.seance.findMany({
      where,
      include: seanceV2Include,
      orderBy: { startAt: 'asc' },
      ...(query.take !== undefined ? { take: query.take } : {}),
      ...(query.skip !== undefined ? { skip: query.skip } : {}),
    });
    return rows.filter(hasV2Shape).map(toSessionV2Dto);
  }

  async stats(query: WeekV2Query): Promise<{
    total: number;
    published: number;
    pending: number;
    byType: Record<SessionTypeV2, number>;
    bySousType: Record<string, number>;
  }> {
    const where = await this.buildWeekWhere(query);
    const rows = await this.prisma.seance.findMany({
      where,
      select: { typeV2: true, sousType: true, isPublished: true },
    });
    const byType: Record<SessionTypeV2, number> = {
      COURS: 0,
      EVALUATION: 0,
      EVENEMENT: 0,
    };
    const bySousType: Record<string, number> = {
      CM: 0,
      TD: 0,
      TP: 0,
      EXAMEN: 0,
      RATTRAPAGE: 0,
      DEVOIR: 0,
    };
    let published = 0;
    for (const row of rows) {
      if (row.typeV2) byType[row.typeV2] += 1;
      if (row.sousType) bySousType[row.sousType] = (bySousType[row.sousType] ?? 0) + 1;
      if (row.isPublished) published += 1;
    }
    return {
      total: rows.length,
      published,
      pending: rows.length - published,
      byType,
      bySousType,
    };
  }

  async findOne(id: string): Promise<SessionV2Dto> {
    const row = await this.prisma.seance.findUnique({
      where: { id },
      include: seanceV2Include,
    });
    if (!row) throw new NotFoundException(`Séance ${id} introuvable`);
    if (!row.typeV2) {
      throw new NotFoundException(
        `Séance ${id} non disponible en V02 (legacy V01 sans backfill, cf. TD-030)`,
      );
    }
    return toSessionV2Dto(row);
  }

  // ── Writes ─────────────────────────────────────────────────────────

  async create(dto: CreateSessionV2Dto, createdByUserId: string): Promise<SessionV2Dto> {
    await this.validateHours(new Date(dto.startAt), new Date(dto.endAt));
    await this.validateClasseIds(dto.classeIds);

    // Resolve V01 mirror values (legacy NOT NULL columns).
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    let moduleId: string | null = null;
    let enseignantId: string | null = null;
    let teacherIdV01: string | null = null;

    if (dto.type !== 'EVENEMENT') {
      moduleId = dto.moduleId;
      enseignantId = dto.enseignantId;
      const enseignant = await this.prisma.enseignant.findUnique({
        where: { id: enseignantId },
        select: { userId: true },
      });
      if (!enseignant) {
        throw new BadRequestException({
          message: 'Validation failed',
          errors: { enseignantId: [`Enseignant ${enseignantId} introuvable`] },
        });
      }
      teacherIdV01 = enseignant.userId;
    }

    if (moduleId === null) {
      // For EVENEMENT, V01 `moduleId` is NOT NULL — fall back to the first
      // module in DB (placeholder, matches the seed pattern).
      const fallback = await this.prisma.module.findFirst({ select: { id: true } });
      if (!fallback) {
        throw new BadRequestException({
          message: 'Validation failed',
          errors: { moduleId: ['Aucun module disponible pour le placeholder V01'] },
        });
      }
      moduleId = fallback.id;
    }

    // Build the row.
    const classeIdsSorted = [...dto.classeIds].sort();
    const sousType = dto.type === 'EVENEMENT' ? null : (dto.sousType ?? null);
    const intervenantNom = dto.type === 'EVENEMENT' ? (dto.intervenantNom ?? null) : null;
    const description = dto.type === 'EVENEMENT' ? (dto.description ?? null) : null;

    const created = await this.prisma.$transaction(async (tx) => {
      const seance = await tx.seance.create({
        data: {
          // V02 fields
          libelle: dto.libelle,
          typeV2: dto.type,
          sousType,
          intervenantNom,
          description,
          enseignantId,
          // V01 mirror (legacy NOT NULL on classeId/moduleId)
          type: mapV2ToV01Type(dto.type, sousType),
          status: 'PROVISOIRE',
          // dto.classeIds.min(1) garanti par Zod ; `[0]` est défini.
          classeId: dto.classeIds[0] ?? '__unreachable__',
          moduleId,
          salleId: dto.salleId ?? null,
          teacherId: teacherIdV01 ?? createdByUserId,
          // Shared
          startAt,
          endAt,
          isPublished: false,
          hasUnpublishedChanges: true,
          lastModifiedAt: new Date(),
        },
      });
      // N-N links — multi-classes support (V2-D6).
      for (const classeId of classeIdsSorted) {
        await tx.seanceClasse.create({ data: { seanceId: seance.id, classeId } });
      }
      return seance;
    });

    return this.findOne(created.id);
  }

  async update(id: string, dto: UpdateSessionV2Dto): Promise<SessionV2Dto> {
    const existing = await this.prisma.seance.findUnique({
      where: { id },
      include: seanceV2Include,
    });
    if (!existing) throw new NotFoundException(`Séance ${id} introuvable`);
    if (!existing.typeV2) {
      throw new NotFoundException(`Séance ${id} non disponible en V02 (legacy)`);
    }

    // Type change is forbidden (V2-D8). The Zod schema doesn't include
    // `type`, so even if a client sends one, it's stripped — but we also
    // throw 422 to make the intent explicit.
    if ('type' in dto) {
      throw new UnprocessableEntityException(
        "Le type d'une séance ne peut pas être modifié après création (V2-D8)",
      );
    }

    const startAt = dto.startAt ? new Date(dto.startAt) : existing.startAt;
    const endAt = dto.endAt ? new Date(dto.endAt) : existing.endAt;
    await this.validateHours(startAt, endAt);

    const data: Prisma.SeanceUncheckedUpdateInput = {
      lastModifiedAt: new Date(),
    };
    if (dto.libelle !== undefined) data.libelle = dto.libelle;
    if (dto.startAt !== undefined) data.startAt = startAt;
    if (dto.endAt !== undefined) data.endAt = endAt;
    if (dto.sousType !== undefined) data.sousType = dto.sousType;
    if (dto.intervenantNom !== undefined) data.intervenantNom = dto.intervenantNom;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.salleId !== undefined) data.salleId = dto.salleId;
    if (dto.moduleId !== undefined && dto.moduleId !== null) data.moduleId = dto.moduleId;
    if (dto.enseignantId !== undefined) {
      data.enseignantId = dto.enseignantId;
      // Maintain V01 mirror teacherId in sync.
      if (dto.enseignantId === null) {
        // teacherId V01 is nullable since LOT 2 migration ; OK to set null.
        data.teacherId = null;
      } else {
        const enseignant = await this.prisma.enseignant.findUnique({
          where: { id: dto.enseignantId },
          select: { userId: true },
        });
        if (!enseignant) {
          throw new BadRequestException({
            message: 'Validation failed',
            errors: { enseignantId: [`Enseignant ${dto.enseignantId} introuvable`] },
          });
        }
        data.teacherId = enseignant.userId;
      }
    }

    // Update N-N classes if provided.
    if (dto.classeIds !== undefined) {
      await this.validateClasseIds(dto.classeIds);
      await this.prisma.seanceClasse.deleteMany({ where: { seanceId: id } });
      for (const classeId of [...dto.classeIds].sort()) {
        await this.prisma.seanceClasse.create({ data: { seanceId: id, classeId } });
      }
      // dto.classeIds.min(1) garanti par Zod sur ce branch
      data.classeId = dto.classeIds[0] ?? '__unreachable__';
    }

    await this.prisma.seance.update({ where: { id }, data });

    // Recompute hasUnpublishedChanges via smart dirty (ADR-0008).
    const refreshed = await this.prisma.seance.findUnique({
      where: { id },
      include: seanceV2Include,
    });
    if (!refreshed) throw new NotFoundException(`Séance ${id} introuvable post-update`);

    const classeIds = refreshed.seanceClasses.map((sc) => sc.classeId);
    const dirty = isDirty(
      {
        libelle: refreshed.libelle,
        typeV2: refreshed.typeV2,
        sousType: refreshed.sousType,
        startAt: refreshed.startAt,
        endAt: refreshed.endAt,
        moduleId: refreshed.moduleId,
        enseignantId: refreshed.enseignantId,
        salleId: refreshed.salleId,
        intervenantNom: refreshed.intervenantNom,
        description: refreshed.description,
        classeIds,
      },
      refreshed.publishedSnapshot,
    );

    if (dirty !== refreshed.hasUnpublishedChanges) {
      await this.prisma.seance.update({
        where: { id },
        data: { hasUnpublishedChanges: dirty },
      });
    }

    return this.findOne(id);
  }

  /**
   * Supprime une séance V02. Refuse 409 si la séance a déjà été publiée au
   * moins une fois (`lastPublishedAt !== null`) — dans ce cas, le RP doit
   * passer par une « dépublication » dédiée (V03+). Permet l'undo des
   * créations + un bouton supprimer dans le drawer pour les séances
   * jamais publiées (cf. LOT 4 V2).
   */
  async remove(id: string): Promise<void> {
    const existing = await this.prisma.seance.findUnique({
      where: { id },
      select: { id: true, lastPublishedAt: true, typeV2: true },
    });
    if (!existing) throw new NotFoundException(`Séance ${id} introuvable`);
    if (!existing.typeV2) {
      throw new NotFoundException(`Séance ${id} non disponible en V02 (legacy)`);
    }
    if (existing.lastPublishedAt !== null) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: {
          id: ["Impossible de supprimer une séance déjà publiée. Dépubliez-la d'abord (V03+)."],
        },
      });
    }
    // Cascade supprime SeanceClasse via la FK (onDelete: Cascade).
    await this.prisma.seance.delete({ where: { id } });
  }

  async publish(query: PublishV2Query): Promise<SessionV2Dto[]> {
    const where: Prisma.SeanceWhereInput = {
      hasUnpublishedChanges: true,
      typeV2: { not: null },
    };
    if (query.classeId) {
      where.seanceClasses = { some: { classeId: query.classeId } };
    }
    if (query.seanceIds && query.seanceIds.length > 0) {
      where.id = { in: query.seanceIds };
    }

    const pending = await this.prisma.seance.findMany({
      where,
      include: seanceV2Include,
    });
    if (pending.length === 0) return [];

    // For each pending row, compute snapshot then update.
    for (const seance of pending) {
      const classeIds = seance.seanceClasses.map((sc) => sc.classeId);
      const snapshot = computeSnapshot({
        libelle: seance.libelle,
        typeV2: seance.typeV2,
        sousType: seance.sousType,
        startAt: seance.startAt,
        endAt: seance.endAt,
        moduleId: seance.moduleId,
        enseignantId: seance.enseignantId,
        salleId: seance.salleId,
        intervenantNom: seance.intervenantNom,
        description: seance.description,
        classeIds,
      });
      await this.prisma.seance.update({
        where: { id: seance.id },
        data: {
          publishedSnapshot: JSON.parse(snapshot),
          hasUnpublishedChanges: false,
          isPublished: true,
          status: 'PUBLIE',
          lastPublishedAt: new Date(),
        },
      });
    }

    // Reload + compute recipients.
    const published = await this.prisma.seance.findMany({
      where: { id: { in: pending.map((p) => p.id) } },
      include: seanceV2Include,
      orderBy: { startAt: 'asc' },
    });
    const dtos = published.filter(hasV2Shape).map(toSessionV2Dto);

    // B.11 — multi-classes recipient calculation.
    const userIds = await this.computeRecipients(published);
    this.ws.emitSessionPublished(userIds, dtos);

    return dtos;
  }

  // ── Helpers ────────────────────────────────────────────────────────

  /**
   * Validate that the [startAt, endAt] interval fits within
   * [dayStartHour, dayEndHour] of Settings. Hours are expressed in UTC
   * since PLANIT runs on Africa/Dakar (UTC+0).
   */
  private async validateHours(startAt: Date, endAt: Date): Promise<void> {
    if (startAt >= endAt) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: { endAt: ['endAt doit être strictement après startAt'] },
      });
    }
    const { dayStartHour, dayEndHour } = await this.settings.get();
    const startHour = startAt.getUTCHours() + startAt.getUTCMinutes() / 60;
    // Pour endAt, on autorise pile dayEndHour (ex: 20:00).
    const endHour = endAt.getUTCHours() + endAt.getUTCMinutes() / 60;
    if (startHour < dayStartHour) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: { startAt: [`L'heure de début doit être ≥ ${dayStartHour}h`] },
      });
    }
    if (
      endHour > dayEndHour &&
      !(endAt.getUTCHours() === dayEndHour && endAt.getUTCMinutes() === 0)
    ) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: { endAt: [`L'heure de fin doit être ≤ ${dayEndHour}h`] },
      });
    }
  }

  private async validateClasseIds(classeIds: readonly string[]): Promise<void> {
    const unique = [...new Set(classeIds)];
    const count = await this.prisma.classe.count({ where: { id: { in: unique } } });
    if (count !== unique.length) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: { classeIds: ['Une ou plusieurs classes sont introuvables'] },
      });
    }
  }

  private async buildWeekWhere(query: WeekV2Query): Promise<Prisma.SeanceWhereInput> {
    const weekStart = new Date(`${query.weekStart}T00:00:00.000Z`);
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

    const where: Prisma.SeanceWhereInput = {
      startAt: { gte: weekStart, lt: weekEnd },
      typeV2: { not: null }, // V02 endpoints only expose V02-shaped rows
    };

    if (query.classeId) {
      where.seanceClasses = { some: { classeId: query.classeId } };
    }
    if (query.teacherId) {
      where.enseignantId = query.teacherId;
    }
    if (query.studentId) {
      const student = await this.prisma.user.findUnique({
        where: { id: query.studentId },
        select: { classeId: true },
      });
      where.seanceClasses = {
        some: { classeId: student?.classeId ?? NO_CLASSE },
      };
    }
    return where;
  }

  /**
   * B.11 — destinataires pour `session:published`.
   * - chaque enseignant via `enseignantId → User.id`
   * - chaque étudiant des classes liées (V02 N-N via `SeanceClasse`)
   */
  private async computeRecipients(seances: SeanceV2WithRelations[]): Promise<string[]> {
    const enseignantIds = seances
      .map((s) => s.enseignantId)
      .filter((id): id is string => id !== null);
    const classeIds = [
      ...new Set(seances.flatMap((s) => s.seanceClasses.map((sc) => sc.classeId))),
    ];

    const [enseignantUsers, etudiantUsers] = await Promise.all([
      enseignantIds.length === 0
        ? Promise.resolve([] as { userId: string }[])
        : this.prisma.enseignant.findMany({
            where: { id: { in: enseignantIds } },
            select: { userId: true },
          }),
      classeIds.length === 0
        ? Promise.resolve([] as { id: string }[])
        : this.prisma.user.findMany({
            where: { role: 'ETUDIANT', classeId: { in: classeIds } },
            select: { id: true },
          }),
    ]);

    const dedup = new Set<string>();
    for (const e of enseignantUsers) dedup.add(e.userId);
    for (const s of etudiantUsers) dedup.add(s.id);
    return [...dedup];
  }
}

/** Type guard : rows with `typeV2 !== null` are V02-eligible. */
function hasV2Shape(seance: SeanceV2WithRelations): seance is SeanceV2WithRelations & {
  typeV2: NonNullable<SeanceV2WithRelations['typeV2']>;
} {
  return seance.typeV2 !== null;
}

void ForbiddenException; // ESLint quiet : reserved for future RBAC overrides.
