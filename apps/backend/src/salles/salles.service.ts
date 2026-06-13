import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { CreateSalleDto, SalleDto, UpdateSalleDto } from '@planit/contracts';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { requireEcole } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma.service';
import { AcScopeService } from '../ac/ac-scope.service';

const salleInclude = {
  rpResponsable: { select: { id: true, fullName: true } },
} satisfies Prisma.SalleInclude;

type SalleRow = Prisma.SalleGetPayload<{ include: typeof salleInclude }>;

/**
 * Salles (B.7 / V3-D10 / LOT 2 V5-D2).
 *
 * `GET /api/salles` — partagé tous rôles (séance-picker V02). Scope :
 *  - **AC** : salles dont son RP manager est responsable.
 *  - **DIRECTION** : toutes les salles de son école (`ecoleId`).
 *  - **RP / autres** : toutes les salles de son école (utile pour assigner).
 *
 * `POST /api/salles` (DIRECTION | RP) :
 *  - DIRECTION peut poser `rpResponsableId`.
 *  - RP → `rpResponsableId` forcé à `null` (salle commune).
 *
 * `PUT /api/salles/:id` (DIRECTION) : modification complète, peut assigner
 * ou retirer le `rpResponsableId`. RP : 403 (ne peut pas assigner).
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
    } else if (user.ecoleId) {
      // RP, DIRECTION, ENSEIGNANT, ETUDIANT → scope école (V05 / ADR-0019 §3).
      // ADMIN (ecoleId null) → toutes les salles (pas de restriction).
      where.ecoleId = user.ecoleId;
    }

    const rows = await this.prisma.salle.findMany({
      where,
      orderBy: { name: 'asc' },
      include: salleInclude,
    });
    return rows.map(toDto);
  }

  /**
   * Créer une salle rattachée à l'école de l'acteur.
   *  - DIRECTION : peut poser `rpResponsableId`.
   *  - RESPONSABLE_PROGRAMME : `rpResponsableId` forcé à `null` (commune).
   */
  async create(dto: CreateSalleDto, user: CurrentUserPayload): Promise<SalleDto> {
    const ecoleId = requireEcole(user);

    // RBAC sur rpResponsableId : seule la Direction peut assigner.
    const rpResponsableId = user.role === 'DIRECTION' ? (dto.rpResponsableId ?? null) : null;

    try {
      const row = await this.prisma.salle.create({
        data: {
          name: dto.name,
          type: dto.type,
          capacity: dto.capacity,
          ecoleId,
          rpResponsableId,
        },
        include: salleInclude,
      });
      return toDto(row);
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new ConflictException(`Une salle "${dto.name}" existe déjà`);
      }
      throw err;
    }
  }

  /**
   * Modifier une salle (DIRECTION uniquement — peut assigner rpResponsableId).
   * RP : refus 403 (ne peut pas assigner de responsable).
   */
  async update(id: string, dto: UpdateSalleDto, user: CurrentUserPayload): Promise<SalleDto> {
    if (user.role !== 'DIRECTION') {
      throw new ForbiddenException(
        'Seule la Direction peut modifier une salle ou assigner un responsable',
      );
    }
    const ecoleId = requireEcole(user);

    const exists = await this.prisma.salle.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException(`Salle ${id} introuvable`);
    if (exists.ecoleId !== ecoleId) {
      throw new ForbiddenException("Cette salle n'appartient pas à votre école");
    }

    const data: Prisma.SalleUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.capacity !== undefined) data.capacity = dto.capacity;
    if (dto.rpResponsableId !== undefined) {
      data.rpResponsable = dto.rpResponsableId
        ? { connect: { id: dto.rpResponsableId } }
        : { disconnect: true };
    }

    try {
      const row = await this.prisma.salle.update({ where: { id }, data, include: salleInclude });
      return toDto(row);
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new ConflictException(`Une salle "${dto.name}" existe déjà`);
      }
      throw err;
    }
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

function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: unknown }).code === 'P2002'
  );
}
