import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hash as argon2Hash } from '@node-rs/argon2';
import type { Prisma } from '@prisma/client';
import type { CreatePersonnelDto, PersonnelDto, UpdatePersonnelDto } from '@planit/contracts';
import type { User } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from './audit.service';

// argon2id profile — OWASP RFC 9106 (cf. ADR-0007 §1, aligné sur EnseignantsService).
const ARGON2_OPTS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

// Alias sur le type Prisma complet : on évite une définition manuelle restrictive
// (le rôle vient du type Prisma Role, pas d'un sous-ensemble fixé ici).
type PersonnelRow = User;

/**
 * Personnel d'école : RP + AC gérés par la Direction (LOT 2 / V5-D2).
 *
 * Toutes les opérations sont **scopées à l'`ecoleId`** de l'acteur Direction.
 * La création hash le mot de passe en argon2id (identique à EnseignantsService).
 * La suspension invalide les refresh tokens existants (session coupée immédiatement).
 * Chaque action sensible est tracée via `AuditService`.
 */
@Injectable()
export class PersonnelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Liste RP + AC de l'école (tri nom asc). */
  async list(ecoleId: string): Promise<PersonnelDto[]> {
    const rows = await this.prisma.user.findMany({
      where: {
        ecoleId,
        role: { in: ['RESPONSABLE_PROGRAMME', 'ASSISTANT_PROGRAMME'] },
        deletedAt: null,
      },
      orderBy: { fullName: 'asc' },
    });
    return rows.map(toDto);
  }

  /**
   * Crée un RP ou AC rattaché à l'école. Email unique sur toute la table User.
   * Le mot de passe est haché en argon2id côté service (le DTO transporte le
   * mot de passe en clair — jamais stocké tel quel).
   */
  async create(dto: CreatePersonnelDto, ecoleId: string, actorId: string): Promise<PersonnelDto> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException(`Un compte existe déjà avec l'email ${dto.email}`);
    }

    const passwordHash = await argon2Hash(dto.password, ARGON2_OPTS);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        fullName: dto.fullName,
        role: dto.role,
        passwordHash,
        ecoleId,
        statut: 'ACTIF',
        matricule: dto.matricule ?? null,
      },
    });

    await this.audit.log({
      actorId,
      action: 'PERSONNEL_CREATED',
      targetType: 'User',
      targetId: user.id,
      ecoleId,
      meta: { role: dto.role, email: dto.email },
    });

    return toDto(user);
  }

  /**
   * Mise à jour du nom et/ou de l'email d'un personnel. Vérifie que le
   * personnel appartient à l'école de l'acteur Direction (cross-école bloqué).
   */
  async update(
    id: string,
    dto: UpdatePersonnelDto,
    ecoleId: string,
    actorId: string,
  ): Promise<PersonnelDto> {
    const user = await this.findPersonnel(id, ecoleId);

    if (dto.email !== undefined && dto.email !== user.email) {
      const conflict = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (conflict) {
        throw new ConflictException(`Un compte existe déjà avec l'email ${dto.email}`);
      }
    }

    const data: Prisma.UserUpdateInput = {};
    if (dto.fullName !== undefined) data.fullName = dto.fullName;
    if (dto.email !== undefined) data.email = dto.email;

    const updated = await this.prisma.user.update({ where: { id }, data });

    await this.audit.log({
      actorId,
      action: 'PERSONNEL_UPDATED',
      targetType: 'User',
      targetId: id,
      ecoleId,
      meta: dto as Record<string, unknown>,
    });

    return toDto(updated);
  }

  /**
   * Suspension : statut → SUSPENDU + révocation de tous les refresh tokens.
   * La session est coupée immédiatement (le access token expire naturellement
   * dans les 15 min ; les refresh tokens ne permettent plus de renouveler).
   */
  async suspendre(id: string, ecoleId: string, actorId: string): Promise<PersonnelDto> {
    const user = await this.findPersonnel(id, ecoleId);
    if (user.statut === 'SUSPENDU') {
      throw new ConflictException('Ce personnel est déjà suspendu');
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.user.update({ where: { id }, data: { statut: 'SUSPENDU' } }),
      this.prisma.refreshToken.deleteMany({ where: { userId: id } }),
    ]);

    await this.audit.log({
      actorId,
      action: 'PERSONNEL_SUSPENDED',
      targetType: 'User',
      targetId: id,
      ecoleId,
    });

    return toDto(updated);
  }

  /** Réactivation : statut → ACTIF. */
  async reactiver(id: string, ecoleId: string, actorId: string): Promise<PersonnelDto> {
    const user = await this.findPersonnel(id, ecoleId);
    if (user.statut === 'ACTIF') {
      throw new ConflictException('Ce personnel est déjà actif');
    }

    const updated = await this.prisma.user.update({ where: { id }, data: { statut: 'ACTIF' } });

    await this.audit.log({
      actorId,
      action: 'PERSONNEL_REACTIVATED',
      targetType: 'User',
      targetId: id,
      ecoleId,
    });

    return toDto(updated);
  }

  // ── helpers ──────────────────────────────────────────────────────────

  private async findPersonnel(id: string, ecoleId: string): Promise<PersonnelRow> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.deletedAt) {
      throw new NotFoundException(`Personnel ${id} introuvable`);
    }
    if (user.role !== 'RESPONSABLE_PROGRAMME' && user.role !== 'ASSISTANT_PROGRAMME') {
      throw new NotFoundException(`Personnel ${id} introuvable`);
    }
    if (user.ecoleId !== ecoleId) {
      throw new ForbiddenException("Ce personnel n'appartient pas à votre école");
    }
    return user;
  }
}

function toDto(row: PersonnelRow): PersonnelDto {
  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    // Le filtre `role: { in: ['RESPONSABLE_PROGRAMME', 'ASSISTANT_PROGRAMME'] }`
    // garantit que seuls ces rôles arrivent ici — cast sûr.
    role: row.role as 'RESPONSABLE_PROGRAMME' | 'ASSISTANT_PROGRAMME',
    statut: row.statut,
    // ecoleId est garanti non-null par le filtre d'école dans findPersonnel.
    ecoleId: row.ecoleId as string,
    matricule: row.matricule,
    createdAt: row.createdAt.toISOString(),
  };
}
