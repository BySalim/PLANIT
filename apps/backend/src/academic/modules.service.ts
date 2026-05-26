import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { CreateModuleDto, ModuleV2Dto, UpdateModuleDto } from '@planit/contracts';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class ModulesService {
  constructor(private readonly prisma: PrismaService) {}

  /** B.8 — création d'un module sous une UE parente (`ueId` injecté depuis l'URL). */
  async create(ueId: string, dto: CreateModuleDto): Promise<ModuleV2Dto> {
    const ue = await this.prisma.uE.findUnique({ where: { id: ueId } });
    if (!ue) throw new NotFoundException(`UE ${ueId} introuvable`);

    try {
      const row = await this.prisma.module.create({
        data: {
          code: dto.code,
          libelle: dto.libelle,
          color: dto.color,
          ueId,
          // V01 mirror — `name` est conservé pour compat. Cleanup TD-029.
          name: dto.libelle,
        },
      });
      return toDto(row);
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new ConflictException(`Code module "${dto.code}" déjà utilisé`);
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateModuleDto): Promise<ModuleV2Dto> {
    const exists = await this.prisma.module.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException(`Module ${id} introuvable`);

    const data: Prisma.ModuleUpdateInput = {};
    if (dto.code !== undefined) data.code = dto.code;
    if (dto.libelle !== undefined) {
      data.libelle = dto.libelle;
      // V01 mirror
      data.name = dto.libelle;
    }
    if (dto.color !== undefined) data.color = dto.color;

    try {
      const row = await this.prisma.module.update({ where: { id }, data });
      return toDto(row);
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new ConflictException(`Code module "${dto.code}" déjà utilisé`);
      }
      throw err;
    }
  }

  /** B.8 — refus 409 si utilisé par des séances (V01 OR V02 schémas hybrides). */
  async remove(id: string): Promise<void> {
    const exists = await this.prisma.module.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException(`Module ${id} introuvable`);

    const seancesCount = await this.prisma.seance.count({ where: { moduleId: id } });
    if (seancesCount > 0) {
      throw new ConflictException(
        `Impossible de supprimer le module — ${seancesCount} séance(s) le référencent`,
      );
    }

    await this.prisma.module.delete({ where: { id } });
  }
}

function toDto(row: {
  id: string;
  code: string;
  libelle: string;
  color: string;
  ueId: string | null;
}): ModuleV2Dto {
  if (!row.ueId) {
    // Defensive : a module created via this service always carries ueId.
    // Legacy V01 modules without ueId should be backfilled in LOT 3 cleanup.
    throw new Error(`Module ${row.id} has no ueId (legacy V01 row not backfilled)`);
  }
  return {
    id: row.id,
    code: row.code,
    libelle: row.libelle,
    color: row.color,
    ueId: row.ueId,
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
