import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hash as argon2Hash } from '@node-rs/argon2';
import type { Prisma } from '@prisma/client';
import type {
  CreateEnseignantDto,
  EnseignantDto,
  EnseignantStatut,
  UpdateEnseignantDto,
} from '@planit/contracts';
import { PrismaService } from '../common/prisma.service';

// argon2id profile — OWASP RFC 9106 (cf. ADR-0007 §1).
const ARGON2_OPTS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

interface ListQuery {
  page?: number;
  pageSize?: number;
  statut?: EnseignantStatut;
  specialite?: string;
}

export interface PaginatedEnseignants {
  items: EnseignantDto[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable()
export class EnseignantsService {
  constructor(private readonly prisma: PrismaService) {}

  /** B.6 — liste avec pagination + filtres optionnels, **scopée à l'école**. */
  async list(query: ListQuery, ecoleId: string | null): Promise<PaginatedEnseignants> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(200, Math.max(1, query.pageSize ?? 50));

    if (!ecoleId) return { items: [], total: 0, page, pageSize };

    const where: Prisma.EnseignantWhereInput = { ecoleId };
    if (query.statut) where.statut = query.statut;
    if (query.specialite) where.specialite = { contains: query.specialite, mode: 'insensitive' };

    const [rows, total] = await Promise.all([
      this.prisma.enseignant.findMany({
        where,
        orderBy: { nomComplet: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.enseignant.count({ where }),
    ]);

    return {
      items: rows.map(toDto),
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: string): Promise<EnseignantDto> {
    const row = await this.prisma.enseignant.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`Enseignant ${id} introuvable`);
    return toDto(row);
  }

  /**
   * B.6 — création atomique User + Enseignant. Le User a `role=ENSEIGNANT`
   * et `passwordHash` argon2id du mot de passe fourni. L'Enseignant est
   * lié 1-1 via `userId`.
   */
  async create(dto: CreateEnseignantDto, ecoleId: string): Promise<EnseignantDto> {
    // Email unique sur User ET sur emailInstitutionnel (séparés mais alignés
    // dans le seed et l'API).
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.emailInstitutionnel },
    });
    if (existing) {
      throw new ConflictException(`Un compte existe déjà avec l'email ${dto.emailInstitutionnel}`);
    }

    const passwordHash = await argon2Hash(dto.password, ARGON2_OPTS);

    // V05 — le compte User et la fiche Enseignant sont rattachés à la même école
    // que l'acteur créateur (ADR-0019 : enseignant = personnel d'une école).
    const enseignant = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.emailInstitutionnel,
          fullName: dto.nomComplet,
          role: 'ENSEIGNANT',
          passwordHash,
          ecoleId,
        },
      });
      return tx.enseignant.create({
        data: {
          userId: user.id,
          nomComplet: dto.nomComplet,
          emailInstitutionnel: dto.emailInstitutionnel,
          whatsapp: dto.whatsapp ?? null,
          statut: dto.statut,
          specialite: dto.specialite,
          ecoleId,
        },
      });
    });

    return toDto(enseignant);
  }

  async update(id: string, dto: UpdateEnseignantDto): Promise<EnseignantDto> {
    const exists = await this.prisma.enseignant.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException(`Enseignant ${id} introuvable`);

    const data: Prisma.EnseignantUpdateInput = {};
    if (dto.nomComplet !== undefined) data.nomComplet = dto.nomComplet;
    if (dto.whatsapp !== undefined) data.whatsapp = dto.whatsapp;
    if (dto.statut !== undefined) data.statut = dto.statut;
    if (dto.specialite !== undefined) data.specialite = dto.specialite;

    const updated = await this.prisma.enseignant.update({ where: { id }, data });

    // Sync minimal côté User (nom complet uniquement, email immuable ici).
    if (dto.nomComplet !== undefined) {
      await this.prisma.user.update({
        where: { id: exists.userId },
        data: { fullName: dto.nomComplet },
      });
    }

    return toDto(updated);
  }

  /**
   * B.6 — soft delete : refuse 409 si l'enseignant est référencé par une
   * séance V02 (`Seance.enseignantId`) ou V01 (`Seance.teacherId` → User).
   * En V02 strict, on ne supprime jamais — l'utilisateur est désactivé via
   * `User.deletedAt` (champ existant en BD).
   */
  async remove(id: string): Promise<void> {
    const enseignant = await this.prisma.enseignant.findUnique({ where: { id } });
    if (!enseignant) throw new NotFoundException(`Enseignant ${id} introuvable`);

    const refsV2 = await this.prisma.seance.count({ where: { enseignantId: id } });
    const refsV1 = await this.prisma.seance.count({ where: { teacherId: enseignant.userId } });
    if (refsV2 + refsV1 > 0) {
      // Soft delete : marquer User comme supprimé et conserver l'historique.
      await this.prisma.user.update({
        where: { id: enseignant.userId },
        data: { deletedAt: new Date() },
      });
      return;
    }

    // Hard delete possible (aucune séance). Cascade supprime l'Enseignant via la FK.
    await this.prisma.user.delete({ where: { id: enseignant.userId } });
  }
}

type EnseignantRow = Awaited<ReturnType<PrismaService['enseignant']['findUniqueOrThrow']>>;

function toDto(row: EnseignantRow): EnseignantDto {
  return {
    id: row.id,
    userId: row.userId,
    nomComplet: row.nomComplet,
    emailInstitutionnel: row.emailInstitutionnel,
    whatsapp: row.whatsapp,
    statut: row.statut,
    specialite: row.specialite,
  };
}

// Re-export type so the controller can avoid duplicating it.
export type { ListQuery as EnseignantsListQuery };

// Silence unused import in some TS configs.
void BadRequestException;
