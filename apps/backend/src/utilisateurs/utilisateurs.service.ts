import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hash as argon2Hash } from '@node-rs/argon2';
import { randomBytes } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import type {
  CreateUserAdminDto,
  ResetPasswordResultDto,
  Role,
  UpdateUserAdminDto,
  UserAdminDto,
  UserStatut,
} from '@planit/contracts';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthService } from '../auth/auth.service';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';

// argon2id profile — OWASP RFC 9106 (cf. ADR-0007 §1). Aligné sur
// `enseignants.service.ts` (même paramétrage pour tous les comptes).
const ARGON2_OPTS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

const ADMIN_ROLES: ReadonlySet<Role> = new Set<Role>(['ADMIN', 'SUPER_ADMIN']);

interface ListQuery {
  page?: number;
  pageSize?: number;
  ecoleId?: string;
  role?: Role;
  statut?: UserStatut;
  q?: string;
}

export interface PaginatedUsers {
  items: UserAdminDto[];
  total: number;
  page: number;
  pageSize: number;
}

/** Données d'un nouveau compte, partagées par l'Admin (tout rôle) et la création de Direction. */
export interface CreateAccountInput {
  email: string;
  fullName: string;
  role: Role;
  password: string;
  ecoleId: string | null;
  matricule?: string | null;
  statut?: UserStatut;
}

@Injectable()
export class UtilisateursService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly auth: AuthService,
  ) {}

  // ── Helper de création de compte (factorisé depuis enseignants.service.ts) ──
  /**
   * Crée un `User` (argon2id) dans le client fourni (transaction recommandée).
   * Choke point unique de création de compte : valide l'invariant
   * `ecoleId` (null ssi ADMIN/SUPER_ADMIN) et l'unicité email/matricule.
   * Réutilisé par le CRUD Admin **et** la création de Direction (Écoles).
   */
  async createAccount(
    client: Prisma.TransactionClient,
    input: CreateAccountInput,
  ): Promise<UserRow> {
    this.assertEcoleScope(input.role, input.ecoleId);

    const existing = await client.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new ConflictException(`Un compte existe déjà avec l'email ${input.email}`);
    }
    if (input.matricule) {
      const dupMat = await client.user.findUnique({ where: { matricule: input.matricule } });
      if (dupMat) throw new ConflictException(`Matricule ${input.matricule} déjà utilisé`);
    }

    const passwordHash = await argon2Hash(input.password, ARGON2_OPTS);
    return client.user.create({
      data: {
        email: input.email,
        fullName: input.fullName,
        role: input.role,
        passwordHash,
        ecoleId: input.ecoleId,
        matricule: input.matricule ?? null,
        statut: input.statut ?? 'ACTIF',
      },
      include: USER_INCLUDE,
    });
  }

  // ── Lectures ────────────────────────────────────────────────────────────
  /** Liste paginée cross-école, archivés exclus (V5-D7 : archive = hors listes). */
  async list(query: ListQuery): Promise<PaginatedUsers> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(200, Math.max(1, query.pageSize ?? 50));

    const where: Prisma.UserWhereInput = { deletedAt: null };
    if (query.ecoleId) where.ecoleId = query.ecoleId;
    if (query.role) where.role = query.role;
    if (query.statut) where.statut = query.statut;
    if (query.q) {
      where.OR = [
        { email: { contains: query.q, mode: 'insensitive' } },
        { fullName: { contains: query.q, mode: 'insensitive' } },
        { matricule: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: USER_INCLUDE,
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items: rows.map(toUserAdminDto), total, page, pageSize };
  }

  // ── Mutations ─────────────────────────────────────────────────────────────
  async create(actor: CurrentUserPayload, dto: CreateUserAdminDto): Promise<UserAdminDto> {
    this.assertCanManageRoles(actor, dto.role);
    const ecoleId = dto.ecoleId ?? null;

    const created = await this.prisma.$transaction(async (tx) => {
      const user = await this.createAccount(tx, {
        email: dto.email,
        fullName: dto.fullName,
        role: dto.role,
        password: dto.password,
        ecoleId,
        matricule: dto.matricule ?? null,
      });
      await this.audit.log(tx, {
        actorId: actor.id,
        action: 'user.create',
        targetType: 'User',
        targetId: user.id,
        ecoleId,
        meta: { role: dto.role, email: dto.email },
      });
      return user;
    });

    return toUserAdminDto(created);
  }

  async update(
    actor: CurrentUserPayload,
    id: string,
    dto: UpdateUserAdminDto,
  ): Promise<UserAdminDto> {
    const target = await this.findActiveOrThrow(id);
    // Gestion d'un compte admin (existant OU cible) = SUPER_ADMIN uniquement.
    this.assertCanManageRoles(actor, target.role, ...(dto.role ? [dto.role] : []));

    const nextRole = dto.role ?? target.role;
    const nextEcoleId = dto.ecoleId !== undefined ? dto.ecoleId : target.ecoleId;
    this.assertEcoleScope(nextRole, nextEcoleId);

    const data: Prisma.UserUpdateInput = {};
    if (dto.fullName !== undefined) data.fullName = dto.fullName;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.ecoleId !== undefined) {
      data.ecole = dto.ecoleId === null ? { disconnect: true } : { connect: { id: dto.ecoleId } };
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.user.update({ where: { id }, data, include: USER_INCLUDE });
      await this.audit.log(tx, {
        actorId: actor.id,
        action: 'user.update',
        targetType: 'User',
        targetId: id,
        ecoleId: u.ecoleId,
        meta: { fields: Object.keys(data) },
      });
      return u;
    });

    return toUserAdminDto(updated);
  }

  /** Suspend un compte : `statut=SUSPENDU` + révocation des sessions actives. */
  async suspend(actor: CurrentUserPayload, id: string): Promise<UserAdminDto> {
    const target = await this.findActiveOrThrow(id);
    this.assertCanManageRoles(actor, target.role);
    this.assertNotSelf(actor, id, 'suspendre');

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id },
        data: { statut: 'SUSPENDU' },
        include: USER_INCLUDE,
      });
      await this.audit.log(tx, {
        actorId: actor.id,
        action: 'user.suspend',
        targetType: 'User',
        targetId: id,
        ecoleId: u.ecoleId,
      });
      return u;
    });

    await this.auth.revokeUserSessions(id);
    return toUserAdminDto(updated);
  }

  /** Réactive un compte suspendu (`statut=ACTIF`). Ne restaure pas les sessions. */
  async reactivate(actor: CurrentUserPayload, id: string): Promise<UserAdminDto> {
    const target = await this.findActiveOrThrow(id);
    this.assertCanManageRoles(actor, target.role);

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id },
        data: { statut: 'ACTIF' },
        include: USER_INCLUDE,
      });
      await this.audit.log(tx, {
        actorId: actor.id,
        action: 'user.reactivate',
        targetType: 'User',
        targetId: id,
        ecoleId: u.ecoleId,
      });
      return u;
    });

    return toUserAdminDto(updated);
  }

  /** Archive (soft-delete) : `deletedAt` posé + sessions révoquées. Sort des listes. */
  async archive(actor: CurrentUserPayload, id: string): Promise<UserAdminDto> {
    const target = await this.findActiveOrThrow(id);
    this.assertCanManageRoles(actor, target.role);
    this.assertNotSelf(actor, id, 'archiver');

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id },
        data: { deletedAt: new Date(), statut: 'SUSPENDU' },
        include: USER_INCLUDE,
      });
      await this.audit.log(tx, {
        actorId: actor.id,
        action: 'user.archive',
        targetType: 'User',
        targetId: id,
        ecoleId: target.ecoleId,
      });
      return u;
    });

    await this.auth.revokeUserSessions(id);
    return toUserAdminDto(updated);
  }

  /**
   * Réinitialise le mot de passe : génère un mot de passe temporaire fort,
   * le hash, révoque les sessions, et le renvoie **une seule fois** (pas de
   * canal d'envoi avant V06 — transmis hors-bande par l'Admin, ADR-0020 §7).
   */
  async resetPassword(actor: CurrentUserPayload, id: string): Promise<ResetPasswordResultDto> {
    const target = await this.findActiveOrThrow(id);
    this.assertCanManageRoles(actor, target.role);

    const temporaryPassword = generateTempPassword();
    const passwordHash = await argon2Hash(temporaryPassword, ARGON2_OPTS);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { passwordHash } });
      await this.audit.log(tx, {
        actorId: actor.id,
        action: 'user.reset_password',
        targetType: 'User',
        targetId: id,
        ecoleId: target.ecoleId,
      });
    });

    await this.auth.revokeUserSessions(id);
    return { temporaryPassword };
  }

  // ── Internes ────────────────────────────────────────────────────────────
  private async findActiveOrThrow(id: string): Promise<UserRow> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: USER_INCLUDE,
    });
    if (!user) throw new NotFoundException(`Utilisateur ${id} introuvable`);
    return user;
  }

  /** V5-D2 : seul un SUPER_ADMIN gère un compte ADMIN/SUPER_ADMIN. */
  private assertCanManageRoles(actor: CurrentUserPayload, ...roles: Role[]): void {
    const touchesAdmin = roles.some((r) => ADMIN_ROLES.has(r));
    if (touchesAdmin && actor.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Seul un SUPER_ADMIN peut gérer un compte ADMIN ou SUPER_ADMIN');
    }
  }

  /** Invariant ecoleId : null ssi ADMIN/SUPER_ADMIN (ADR-0019 §3). */
  private assertEcoleScope(role: Role, ecoleId: string | null): void {
    const crossEcole = ADMIN_ROLES.has(role);
    if (crossEcole && ecoleId !== null) {
      throw new BadRequestException("Un ADMIN/SUPER_ADMIN n'est rattaché à aucune école");
    }
    if (!crossEcole && !ecoleId) {
      throw new BadRequestException('Une école de rattachement (ecoleId) est requise pour ce rôle');
    }
  }

  private assertNotSelf(actor: CurrentUserPayload, id: string, verbe: string): void {
    if (actor.id === id) {
      throw new BadRequestException(`Impossible de ${verbe} votre propre compte`);
    }
  }
}

// ── Mapping & util ──────────────────────────────────────────────────────────

const USER_INCLUDE = { ecole: { select: { id: true, nom: true } } } as const;
export type UserRow = Prisma.UserGetPayload<{ include: typeof USER_INCLUDE }>;

export function toUserAdminDto(row: UserRow): UserAdminDto {
  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    role: row.role,
    statut: row.statut,
    ecoleId: row.ecoleId,
    ecole: row.ecole ? { id: row.ecole.id, nom: row.ecole.nom } : null,
    matricule: row.matricule,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Mot de passe temporaire : 13 octets aléatoires en base64url (~18 caractères,
 * ≥ 104 bits d'entropie) — satisfait `createUserAdminSchema` (min 12).
 */
function generateTempPassword(): string {
  return randomBytes(13).toString('base64url');
}
