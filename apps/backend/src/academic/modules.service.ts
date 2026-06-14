import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { CreateModuleDto, ModuleV2Dto, UpdateModuleDto } from '@planit/contracts';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma.service';
import { isRp } from '../common/rp-scope';

@Injectable()
export class ModulesService {
  constructor(private readonly prisma: PrismaService) {}

  /** B.8 — création d'un module sous une UE parente (`ueId` injecté depuis l'URL). */
  async create(ueId: string, dto: CreateModuleDto, user: CurrentUserPayload): Promise<ModuleV2Dto> {
    // V05 LOT 6 (ADR-0022) — l'UE parente doit appartenir au RP créateur.
    const ue = await this.prisma.uE.findFirst({
      where: { id: ueId, ...(isRp(user.role) ? { ownerRpId: user.id } : {}) },
    });
    if (!ue) throw new NotFoundException(`UE ${ueId} introuvable`);

    try {
      const row = await this.prisma.module.create({
        data: {
          code: dto.code,
          libelle: dto.libelle,
          color: dto.color,
          ueId,
          // V05 LOT 6 — module personnel au RP créateur (= propriétaire de l'UE).
          ownerRpId: isRp(user.role) ? user.id : null,
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

  async update(id: string, dto: UpdateModuleDto, user: CurrentUserPayload): Promise<ModuleV2Dto> {
    await this.assertModuleOwned(id, user);

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
  async remove(id: string, user: CurrentUserPayload): Promise<void> {
    await this.assertModuleOwned(id, user);

    const seancesCount = await this.prisma.seance.count({ where: { moduleId: id } });
    if (seancesCount > 0) {
      throw new ConflictException(
        `Impossible de supprimer le module — ${seancesCount} séance(s) le référencent`,
      );
    }

    await this.prisma.module.delete({ where: { id } });
  }

  /**
   * V05 LOT 6 (ADR-0022) — lève 404 si le module n'est pas dans le périmètre du
   * RP (`ownerRpId = self`). Ne divulgue pas l'existence hors périmètre.
   */
  private async assertModuleOwned(id: string, user: CurrentUserPayload): Promise<void> {
    const found = await this.prisma.module.findFirst({
      where: { id, ...(isRp(user.role) ? { ownerRpId: user.id } : {}) },
      select: { id: true },
    });
    if (!found) throw new NotFoundException(`Module ${id} introuvable`);
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
