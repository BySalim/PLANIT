import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { CreateUEDto, ModuleV2Dto, UEDto, UpdateUEDto } from '@planit/contracts';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class UeService {
  constructor(private readonly prisma: PrismaService) {}

  /** B.7 — liste avec modules nested. */
  async list(): Promise<UEDto[]> {
    const rows = await this.prisma.uE.findMany({
      orderBy: { code: 'asc' },
      include: { modules: { orderBy: { code: 'asc' } } },
    });
    return rows.map(toDto);
  }

  async findOne(id: string): Promise<UEDto> {
    const row = await this.prisma.uE.findUnique({
      where: { id },
      include: { modules: { orderBy: { code: 'asc' } } },
    });
    if (!row) throw new NotFoundException(`UE ${id} introuvable`);
    return toDto(row);
  }

  async create(dto: CreateUEDto): Promise<UEDto> {
    try {
      const row = await this.prisma.uE.create({
        data: { code: dto.code, libelle: dto.libelle, color: dto.color },
        include: { modules: true },
      });
      return toDto(row);
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new ConflictException(`Code UE "${dto.code}" déjà utilisé`);
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateUEDto): Promise<UEDto> {
    const exists = await this.prisma.uE.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException(`UE ${id} introuvable`);

    const data: Prisma.UEUpdateInput = {};
    if (dto.code !== undefined) data.code = dto.code;
    if (dto.libelle !== undefined) data.libelle = dto.libelle;
    if (dto.color !== undefined) data.color = dto.color;

    try {
      const row = await this.prisma.uE.update({
        where: { id },
        data,
        include: { modules: { orderBy: { code: 'asc' } } },
      });
      return toDto(row);
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new ConflictException(`Code UE "${dto.code}" déjà utilisé`);
      }
      throw err;
    }
  }

  /** B.7 — refus 409 si l'UE contient des modules (V2-D14). */
  async remove(id: string): Promise<void> {
    const exists = await this.prisma.uE.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException(`UE ${id} introuvable`);

    const modulesCount = await this.prisma.module.count({ where: { ueId: id } });
    if (modulesCount > 0) {
      throw new ConflictException(
        `Impossible de supprimer l'UE — ${modulesCount} module(s) rattaché(s)`,
      );
    }

    await this.prisma.uE.delete({ where: { id } });
  }
}

function toDto(row: {
  id: string;
  code: string;
  libelle: string;
  color: string;
  modules: { id: string; code: string; libelle: string; color: string; ueId: string | null }[];
}): UEDto {
  return {
    id: row.id,
    code: row.code,
    libelle: row.libelle,
    color: row.color,
    modules: row.modules.map(
      (m): ModuleV2Dto => ({
        id: m.id,
        code: m.code,
        libelle: m.libelle,
        color: m.color,
        // ueId is non-null after migration backfill; the schema marks it
        // nullable for the LOT 0 schema hybride. Coerce to assertion : an
        // UE returned via nested include guarantees its modules have ueId.
        ueId: m.ueId ?? row.id,
      }),
    ),
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
