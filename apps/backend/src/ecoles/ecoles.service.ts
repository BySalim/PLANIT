import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type {
  DirectionSummaryDto,
  CreateEcoleDto,
  EcoleDto,
  UpdateEcoleDto,
} from '@planit/contracts';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { UtilisateursService } from '../utilisateurs/utilisateurs.service';

@Injectable()
export class EcolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly utilisateurs: UtilisateursService,
  ) {}

  /** Liste des écoles actives (archivées exclues — V5-D7) avec leur Direction. */
  async list(): Promise<EcoleDto[]> {
    const rows = await this.prisma.ecole.findMany({
      where: { statut: 'ACTIVE' },
      orderBy: { nom: 'asc' },
    });
    if (rows.length === 0) return [];

    // Direction de chaque école en une requête (évite le N+1). On retient la
    // plus ancienne par école — une école ≈ une Direction (ADR-0020).
    const directions = await this.prisma.user.findMany({
      where: { role: 'DIRECTION', deletedAt: null, ecoleId: { in: rows.map((r) => r.id) } },
      orderBy: { createdAt: 'asc' },
    });
    const byEcole = new Map<string, DirectionSummaryDto>();
    for (const d of directions) {
      if (d.ecoleId && !byEcole.has(d.ecoleId)) byEcole.set(d.ecoleId, toDirectionSummary(d));
    }

    return rows.map((r) => toDto(r, byEcole.get(r.id) ?? null));
  }

  /**
   * Crée une école **et** sa Direction dans une seule transaction (ADR-0020) :
   * une école ne vit jamais sans Direction. C'est le seul point de création
   * d'un compte DIRECTION.
   */
  async create(actor: CurrentUserPayload, dto: CreateEcoleDto): Promise<EcoleDto> {
    const existing = await this.prisma.ecole.findUnique({ where: { nom: dto.nom } });
    if (existing) throw new ConflictException(`Une école « ${dto.nom} » existe déjà`);

    const created = await this.prisma.$transaction(async (tx) => {
      const ecole = await tx.ecole.create({ data: { nom: dto.nom } });
      // createAccount lève 409 si l'email est déjà pris → rollback de l'école.
      const direction = await this.utilisateurs.createAccount(tx, {
        email: dto.direction.email,
        fullName: dto.direction.fullName,
        role: 'DIRECTION',
        password: dto.direction.password,
        ecoleId: ecole.id,
      });
      await this.audit.log(tx, {
        actorId: actor.id,
        action: 'ecole.create',
        targetType: 'Ecole',
        targetId: ecole.id,
        ecoleId: ecole.id,
        meta: { nom: ecole.nom },
      });
      await this.audit.log(tx, {
        actorId: actor.id,
        action: 'ecole.direction.create',
        targetType: 'User',
        targetId: direction.id,
        ecoleId: ecole.id,
        meta: { email: direction.email },
      });
      return { ecole, direction };
    });

    return toDto(created.ecole, toDirectionSummary(created.direction));
  }

  async update(actor: CurrentUserPayload, id: string, dto: UpdateEcoleDto): Promise<EcoleDto> {
    await this.findOrThrow(id);

    if (dto.nom !== undefined) {
      const dup = await this.prisma.ecole.findFirst({
        where: { nom: dto.nom, id: { not: id } },
      });
      if (dup) throw new ConflictException(`Une école « ${dto.nom} » existe déjà`);
    }

    const data: Prisma.EcoleUpdateInput = {};
    if (dto.nom !== undefined) data.nom = dto.nom;

    const updated = await this.prisma.$transaction(async (tx) => {
      const ecole = await tx.ecole.update({ where: { id }, data });
      await this.audit.log(tx, {
        actorId: actor.id,
        action: 'ecole.update',
        targetType: 'Ecole',
        targetId: id,
        ecoleId: id,
        meta: { fields: Object.keys(data) },
      });
      return ecole;
    });

    return toDto(updated, await this.findDirectionSummary(id));
  }

  /** Archive une école : `statut=ARCHIVEE` + `archivedAt`. Sort des listes, jamais supprimée. */
  async archive(actor: CurrentUserPayload, id: string): Promise<EcoleDto> {
    await this.findOrThrow(id);

    const updated = await this.prisma.$transaction(async (tx) => {
      const ecole = await tx.ecole.update({
        where: { id },
        data: { statut: 'ARCHIVEE', archivedAt: new Date() },
      });
      await this.audit.log(tx, {
        actorId: actor.id,
        action: 'ecole.archive',
        targetType: 'Ecole',
        targetId: id,
        ecoleId: id,
      });
      return ecole;
    });

    return toDto(updated, await this.findDirectionSummary(id));
  }

  private async findOrThrow(id: string): Promise<void> {
    const ecole = await this.prisma.ecole.findUnique({ where: { id } });
    if (!ecole) throw new NotFoundException(`École ${id} introuvable`);
  }

  /** Direction active la plus ancienne d'une école, ou null (cas défensif). */
  private async findDirectionSummary(ecoleId: string): Promise<DirectionSummaryDto | null> {
    const direction = await this.prisma.user.findFirst({
      where: { role: 'DIRECTION', deletedAt: null, ecoleId },
      orderBy: { createdAt: 'asc' },
    });
    return direction ? toDirectionSummary(direction) : null;
  }
}

type EcoleRow = Awaited<ReturnType<PrismaService['ecole']['findUniqueOrThrow']>>;

function toDto(row: EcoleRow, direction: DirectionSummaryDto | null): EcoleDto {
  return {
    id: row.id,
    nom: row.nom,
    statut: row.statut,
    archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
    direction,
  };
}

function toDirectionSummary(user: {
  id: string;
  email: string;
  fullName: string;
  statut: DirectionSummaryDto['statut'];
}): DirectionSummaryDto {
  return { id: user.id, email: user.email, fullName: user.fullName, statut: user.statut };
}
