import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { CreateFiliereDto, FiliereDto, UpdateFiliereDto } from '@planit/contracts';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class FilieresService {
  constructor(private readonly prisma: PrismaService) {}

  /** Liste scopée à l'école (V05 / ADR-0019 §3). */
  async list(ecoleId: string | null): Promise<FiliereDto[]> {
    if (!ecoleId) return [];
    const rows = await this.prisma.filiere.findMany({
      where: { ecoleId },
      orderBy: { sigle: 'asc' },
    });
    return rows.map(toDto);
  }

  async findOne(id: string): Promise<FiliereDto> {
    const row = await this.prisma.filiere.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`Filière ${id} introuvable`);
    return toDto(row);
  }

  /** Création rattachée à l'école de l'acteur (V05 / ADR-0019). */
  async create(dto: CreateFiliereDto, ecoleId: string): Promise<FiliereDto> {
    try {
      const row = await this.prisma.filiere.create({
        data: {
          sigle: dto.sigle,
          libelle: dto.libelle,
          isDoubleDiplome: dto.isDoubleDiplome,
          grade: dto.grade,
          ecoleId,
          // V5-D5 — RP responsable optionnel. La validation « le RP appartient
          // à la même école » relève du durcissement scope (LOT 2).
          responsableRpId: dto.responsableRpId ?? null,
        },
      });
      return toDto(row);
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new ConflictException(`Sigle "${dto.sigle}" déjà utilisé`);
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateFiliereDto): Promise<FiliereDto> {
    const exists = await this.prisma.filiere.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException(`Filière ${id} introuvable`);

    const data: Prisma.FiliereUpdateInput = {};
    if (dto.sigle !== undefined) data.sigle = dto.sigle;
    if (dto.libelle !== undefined) data.libelle = dto.libelle;
    if (dto.isDoubleDiplome !== undefined) data.isDoubleDiplome = dto.isDoubleDiplome;
    if (dto.grade !== undefined) data.grade = dto.grade;

    try {
      const row = await this.prisma.filiere.update({ where: { id }, data });
      return toDto(row);
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new ConflictException(`Sigle "${dto.sigle}" déjà utilisé`);
      }
      throw err;
    }
  }

  /** B.9 — refus 409 si la filière est référencée par une `Classe.filiereId`. */
  async remove(id: string): Promise<void> {
    const exists = await this.prisma.filiere.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException(`Filière ${id} introuvable`);

    const classesCount = await this.prisma.classe.count({ where: { filiereId: id } });
    if (classesCount > 0) {
      throw new ConflictException(
        `Impossible de supprimer la filière — ${classesCount} classe(s) la référencent`,
      );
    }

    await this.prisma.filiere.delete({ where: { id } });
  }
}

function toDto(row: {
  id: string;
  sigle: string;
  libelle: string;
  isDoubleDiplome: boolean;
  grade: 'LICENCE' | 'MASTER' | 'DOCTORAT';
  responsableRpId: string | null;
}): FiliereDto {
  return {
    id: row.id,
    sigle: row.sigle,
    libelle: row.libelle,
    isDoubleDiplome: row.isDoubleDiplome,
    grade: row.grade,
    responsableRpId: row.responsableRpId,
  };
}

function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: unknown }).code === 'P2002'
  );
}
