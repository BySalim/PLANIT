import { Injectable, NotFoundException } from '@nestjs/common';
import type { PlanningViewGroup } from '@prisma/client';
import type {
  CreatePlanningViewGroupDto,
  PlanningViewGroupDto,
  PlanningViewKind,
  UpdatePlanningViewGroupDto,
} from '@planit/contracts';
import { PrismaService } from '../common/prisma.service';

// Dimension API (minuscule, alignée sur `ReferentielDim` du front) ↔ enum Prisma.
const DIM_TO_PRISMA = { classe: 'CLASSE', salle: 'SALLE', prof: 'PROF' } as const;
const PRISMA_TO_DIM = { CLASSE: 'classe', SALLE: 'salle', PROF: 'prof' } as const;

/**
 * V05 LOT 7.1 — groupes de vue planning (presets custom des vues by-X).
 *
 * Chaque groupe est **privé à son créateur** : toutes les opérations sont
 * scopées sur `userId = user.id` (jamais de fuite cross-utilisateur). Le
 * `refIds` est un tableau ordonné d'ids de références (classes/salles/profs)
 * qui définit les colonnes et leur ordre. Aucune validation de l'existence
 * des refs côté serveur (préférence UI ; une ref disparue est simplement
 * ignorée au rendu).
 */
@Injectable()
export class PlanningViewGroupsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string, view: PlanningViewKind): Promise<PlanningViewGroupDto[]> {
    return this.prisma.planningViewGroup
      .findMany({
        where: { userId, view: DIM_TO_PRISMA[view] },
        orderBy: { createdAt: 'asc' },
      })
      .then((rows) => rows.map(toDto));
  }

  async create(userId: string, dto: CreatePlanningViewGroupDto): Promise<PlanningViewGroupDto> {
    const row = await this.prisma.planningViewGroup.create({
      data: { userId, view: DIM_TO_PRISMA[dto.view], name: dto.name, refIds: dto.refIds },
    });
    return toDto(row);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdatePlanningViewGroupDto,
  ): Promise<PlanningViewGroupDto> {
    await this.assertOwned(userId, id);
    const row = await this.prisma.planningViewGroup.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.refIds !== undefined ? { refIds: dto.refIds } : {}),
      },
    });
    return toDto(row);
  }

  async remove(userId: string, id: string): Promise<{ id: string }> {
    await this.assertOwned(userId, id);
    await this.prisma.planningViewGroup.delete({ where: { id } });
    return { id };
  }

  /** 404 si le groupe n'existe pas OU n'appartient pas à l'utilisateur (pas de divulgation). */
  private async assertOwned(userId: string, id: string): Promise<void> {
    const row = await this.prisma.planningViewGroup.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!row || row.userId !== userId) {
      throw new NotFoundException(`Groupe de vue ${id} introuvable`);
    }
  }
}

function toDto(row: PlanningViewGroup): PlanningViewGroupDto {
  return { id: row.id, view: PRISMA_TO_DIM[row.view], name: row.name, refIds: row.refIds };
}
