import { Injectable } from '@nestjs/common';
import type { ClasseRef } from '@planit/contracts';
import { PrismaService } from '../common/prisma.service';

/**
 * Référentiel léger des Classes — utilisé par le formulaire séance V02 (LOT 3
 * R.3, ClasseChipsPicker) et par toute UI ayant besoin de lister les classes.
 *
 * Lecture seule : la création de classes passe par la seed (V01/V02) et fera
 * partie d'un LOT ultérieur (UI admin V03+).
 */
@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<ClasseRef[]> {
    const rows = await this.prisma.classe.findMany({
      select: { id: true, code: true, name: true },
      orderBy: { code: 'asc' },
    });
    return rows;
  }
}
