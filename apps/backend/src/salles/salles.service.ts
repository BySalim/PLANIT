import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { SalleDto } from '@planit/contracts';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma.service';
import { AcScopeService } from '../ac/ac-scope.service';

const salleInclude = {
  rpResponsable: { select: { id: true, fullName: true } },
} satisfies Prisma.SalleInclude;

type SalleRow = Prisma.SalleGetPayload<{ include: typeof salleInclude }>;

/**
 * Salles (B.7 / V3-D10).
 *
 * `GET /api/salles` reste **partagé tous rôles** (le séance-picker V02 le
 * consomme) ; la réponse `SalleDto` est un **sur-ensemble** de l'ancien
 * `SalleRef` (`id`/`name` conservés) → rétro-compatible. Nouveautés : expose
 * `rpResponsable`, et **scope AC** = uniquement les salles dont son RP manager
 * est responsable (filtrage serveur).
 *
 * Le CRUD salle complet reste hors scope V03 (index — OUT).
 */
@Injectable()
export class SallesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly acScope: AcScopeService,
  ) {}

  async list(user: CurrentUserPayload): Promise<SalleDto[]> {
    const where: Prisma.SalleWhereInput = {};

    if (this.acScope.isAc(user.role)) {
      const managerRpId = await this.acScope.getManagerRpId(user.id);
      // AC sans manager → aucune salle visible (périmètre vide explicite).
      where.rpResponsableId = managerRpId ?? '__none__';
    }

    const rows = await this.prisma.salle.findMany({
      where,
      orderBy: { name: 'asc' },
      include: salleInclude,
    });
    return rows.map(toDto);
  }
}

function toDto(row: SalleRow): SalleDto {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    capacity: row.capacity,
    rpResponsable: row.rpResponsable
      ? { id: row.rpResponsable.id, fullName: row.rpResponsable.fullName }
      : null,
  };
}
