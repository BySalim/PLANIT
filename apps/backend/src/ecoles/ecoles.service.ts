import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { CreateEcoleDto, EcoleDto, UpdateEcoleDto, UserAdminDto } from '@planit/contracts';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { UtilisateursService, toUserAdminDto } from '../utilisateurs/utilisateurs.service';

/** Corps de création de la Direction d'une école (1.2). */
export interface CreateDirectionInput {
  email: string;
  fullName: string;
  password: string;
}

@Injectable()
export class EcolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly utilisateurs: UtilisateursService,
  ) {}

  /** Liste des écoles actives (archivées exclues — V5-D7). */
  async list(): Promise<EcoleDto[]> {
    const rows = await this.prisma.ecole.findMany({
      where: { statut: 'ACTIVE' },
      orderBy: { nom: 'asc' },
    });
    return rows.map(toDto);
  }

  async create(actor: CurrentUserPayload, dto: CreateEcoleDto): Promise<EcoleDto> {
    const existing = await this.prisma.ecole.findUnique({ where: { nom: dto.nom } });
    if (existing) throw new ConflictException(`Une école « ${dto.nom} » existe déjà`);

    const created = await this.prisma.$transaction(async (tx) => {
      const ecole = await tx.ecole.create({ data: { nom: dto.nom } });
      await this.audit.log(tx, {
        actorId: actor.id,
        action: 'ecole.create',
        targetType: 'Ecole',
        targetId: ecole.id,
        ecoleId: ecole.id,
        meta: { nom: ecole.nom },
      });
      return ecole;
    });

    return toDto(created);
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

    return toDto(updated);
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

    return toDto(updated);
  }

  /** Crée le compte Direction d'une école (1.2) — argon2id + transaction + audit. */
  async createDirection(
    actor: CurrentUserPayload,
    ecoleId: string,
    dto: CreateDirectionInput,
  ): Promise<UserAdminDto> {
    await this.findOrThrow(ecoleId);

    const created = await this.prisma.$transaction(async (tx) => {
      const user = await this.utilisateurs.createAccount(tx, {
        email: dto.email,
        fullName: dto.fullName,
        role: 'DIRECTION',
        password: dto.password,
        ecoleId,
      });
      await this.audit.log(tx, {
        actorId: actor.id,
        action: 'ecole.direction.create',
        targetType: 'User',
        targetId: user.id,
        ecoleId,
        meta: { email: dto.email },
      });
      return user;
    });

    return toUserAdminDto(created);
  }

  private async findOrThrow(id: string): Promise<void> {
    const ecole = await this.prisma.ecole.findUnique({ where: { id } });
    if (!ecole) throw new NotFoundException(`École ${id} introuvable`);
  }
}

type EcoleRow = Awaited<ReturnType<PrismaService['ecole']['findUniqueOrThrow']>>;

function toDto(row: EcoleRow): EcoleDto {
  return {
    id: row.id,
    nom: row.nom,
    statut: row.statut,
    archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
  };
}
