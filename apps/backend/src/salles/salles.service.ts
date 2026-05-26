import { Injectable } from '@nestjs/common';
import type { SalleRef } from '@planit/contracts';
import { PrismaService } from '../common/prisma.service';

/**
 * Référentiel léger des Salles — utilisé par le formulaire séance V02 (LOT 3
 * R.2, select `salleId`) et par toute UI ayant besoin de lister les salles.
 *
 * Lecture seule : la création de salles passe par la seed (V01/V02) et fera
 * partie d'un LOT ultérieur (UI admin V03+).
 */
@Injectable()
export class SallesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<SalleRef[]> {
    const rows = await this.prisma.salle.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    return rows;
  }
}
