import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { CreateUEDto, ModuleV2Dto, UEDto, UpdateUEDto } from '@planit/contracts';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma.service';
import { isRp } from '../common/rp-scope';

@Injectable()
export class UeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * V05 LOT 6 (ADR-0022 §2) — fragment `where` du périmètre UE : un RP ne voit
   * que SES UE (`ownerRpId = self`) dans son école. Endpoints UE = RP only, mais
   * on garde le pattern composable pour une éventuelle lecture Direction future.
   */
  private ownerWhere(user: CurrentUserPayload): Prisma.UEWhereInput {
    return {
      ...(user.ecoleId ? { ecoleId: user.ecoleId } : {}),
      ...(isRp(user.role) ? { ownerRpId: user.id } : {}),
    };
  }

  /** Lève 404 si l'UE n'est pas dans le périmètre de l'acteur (ne pas divulguer). */
  private async assertUeOwned(id: string, user: CurrentUserPayload): Promise<void> {
    const found = await this.prisma.uE.findFirst({
      where: { id, ...this.ownerWhere(user) },
      select: { id: true },
    });
    if (!found) throw new NotFoundException(`UE ${id} introuvable`);
  }

  /**
   * B.7 — liste des UE.
   *  - mode **lite** (par défaut) : pas de `modules` nested, juste
   *    `moduleCount`. Utilisé par la page UE & Modules pour un mount
   *    instantané même avec 50+ UE × 10+ modules. Les modules d'une UE
   *    sont lazy-fetch via `findModulesForUe()` à l'ouverture.
   *  - mode **full** (`withModules=true`) : `modules` nested, comme la
   *    V1. Utilisé par le formulaire de séance qui a besoin de la liste
   *    aplatie des modules pour le select Module.
   */
  async list(user: CurrentUserPayload, opts?: { withModules?: boolean }): Promise<UEDto[]> {
    const where = this.ownerWhere(user);
    if (opts?.withModules === true) {
      const rows = await this.prisma.uE.findMany({
        where,
        orderBy: { code: 'asc' },
        include: { modules: { orderBy: { code: 'asc' } } },
      });
      return rows.map(toDto);
    }
    const rows = await this.prisma.uE.findMany({
      where,
      orderBy: { code: 'asc' },
      include: { _count: { select: { modules: true } } },
    });
    return rows.map(toLiteDto);
  }

  async findOne(id: string, user: CurrentUserPayload): Promise<UEDto> {
    const row = await this.prisma.uE.findFirst({
      where: { id, ...this.ownerWhere(user) },
      include: { modules: { orderBy: { code: 'asc' } } },
    });
    if (!row) throw new NotFoundException(`UE ${id} introuvable`);
    return toDto(row);
  }

  /**
   * Modules d'une UE, triés par code. Utilisé par `GET /ues/:ueId/modules`
   * pour le lazy load côté front. Retourne 404 si l'UE n'existe pas / hors scope.
   */
  async findModulesForUe(ueId: string, user: CurrentUserPayload): Promise<ModuleV2Dto[]> {
    await this.assertUeOwned(ueId, user);
    const rows = await this.prisma.module.findMany({
      where: { ueId },
      orderBy: { code: 'asc' },
    });
    return rows.map(
      (m): ModuleV2Dto => ({
        id: m.id,
        code: m.code,
        libelle: m.libelle,
        color: m.color,
        ueId: m.ueId ?? ueId,
      }),
    );
  }

  async create(dto: CreateUEDto, user: CurrentUserPayload): Promise<UEDto> {
    try {
      const row = await this.prisma.uE.create({
        data: {
          code: dto.code,
          libelle: dto.libelle,
          color: dto.color,
          // V05 LOT 6 (ADR-0022) — UE personnelle au RP créateur, dans son école.
          ecoleId: user.ecoleId,
          ownerRpId: isRp(user.role) ? user.id : null,
        },
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

  async update(id: string, dto: UpdateUEDto, user: CurrentUserPayload): Promise<UEDto> {
    await this.assertUeOwned(id, user);

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
  async remove(id: string, user: CurrentUserPayload): Promise<void> {
    await this.assertUeOwned(id, user);

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

/**
 * Variante « lite » : pas de `modules` nested, juste un `moduleCount`
 * dérivé de Prisma `_count`. Utilisé par `list()` pour le mount initial
 * de la page UE & Modules — la liste détaillée est lazy-chargée à
 * l'ouverture de chaque accordéon.
 */
function toLiteDto(row: {
  id: string;
  code: string;
  libelle: string;
  color: string;
  _count: { modules: number };
}): UEDto {
  return {
    id: row.id,
    code: row.code,
    libelle: row.libelle,
    color: row.color,
    moduleCount: row._count.modules,
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
