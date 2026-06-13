import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type {
  ClasseV3Dto,
  CreateClasseV3Dto,
  EtudiantDto,
  UpdateClasseV3Dto,
} from '@planit/contracts';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma.service';
import { isRp } from '../common/rp-scope';
import { AnneesService } from '../annees/annees.service';
import { AcScopeService } from '../ac/ac-scope.service';

const classeInclude = {
  // V05 LOT 4.3 — inclut le RP responsable des 2 filières (héritée + legacy fallback).
  filiere: { include: { responsableRp: { select: { id: true, fullName: true } } } },
  formation: {
    include: {
      filiere: { include: { responsableRp: { select: { id: true, fullName: true } } } },
      anneeAcademique: true,
    },
  },
  _count: { select: { inscriptions: true } },
} satisfies Prisma.ClasseInclude;

type ClasseRow = Prisma.ClasseGetPayload<{ include: typeof classeInclude }>;

interface ListQuery {
  anneeId?: string;
  filiereSigle?: string;
  q?: string;
}

/**
 * Classes V3 (B.1 / V3-D5 / ADR-0010) — refonte de l'ancien référentiel léger.
 *
 * `GET /api/classes` reste **partagé tous rôles** (le séance-picker V02 le
 * consomme) : la réponse `ClasseV3Dto` est un **sur-ensemble** de l'ancien
 * `ClasseRef` (`id`/`code`/`name` conservés) — la validation Zod côté front
 * (non-strict) ignore les champs ajoutés, donc le picker continue de marcher.
 * Nouveautés : filtres (`anneeId` défaut année courante, `filiereSigle`, `q`),
 * `places` (inscrits/capacité), niveau/filière/année hérités de la **formation**.
 *
 * **Scope AC** : un AC ne voit que ses classes assignées (filtrage serveur, pas
 * un masquage UI). Les mutations restent RP only (contrôleur).
 */
@Injectable()
export class ClassesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly annees: AnneesService,
    private readonly acScope: AcScopeService,
  ) {}

  async list(user: CurrentUserPayload, query: ListQuery): Promise<ClasseV3Dto[]> {
    // Scope multi-école : une classe hérite de l'école de sa filière (via la
    // formation). ADMIN (ecoleId null) ne consulte pas ce référentiel scopé.
    if (!user.ecoleId) return [];

    const where: Prisma.ClasseWhereInput = {};
    const filiereWhere: Prisma.FiliereWhereInput = { ecoleId: user.ecoleId };
    const formationWhere: Prisma.FormationWhereInput = { filiere: filiereWhere };

    // Année : défaut = année courante de l'école (si aucune EN_COURS, pas de
    // filtre année).
    if (query.anneeId) {
      formationWhere.anneeAcademiqueId = query.anneeId;
    } else {
      const current = await this.annees.findCurrentEntity(user.ecoleId);
      if (current) formationWhere.anneeAcademiqueId = current.id;
    }
    if (query.filiereSigle) {
      filiereWhere.sigle = query.filiereSigle;
    }
    where.formation = formationWhere;

    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { code: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    // Scope AC : restreindre aux classes assignées.
    if (this.acScope.isAc(user.role)) {
      const assigned = await this.acScope.getAssignedClasseIds(user.id);
      where.id = { in: assigned };
    }

    // V05 LOT 6 (ADR-0022) — un RP ne voit que SES classes (espace de travail).
    if (isRp(user.role)) {
      where.ownerRpId = user.id;
    }

    const rows = await this.prisma.classe.findMany({
      where,
      orderBy: { code: 'asc' },
      include: classeInclude,
    });
    return rows.map(toDto);
  }

  async findOne(user: CurrentUserPayload, id: string): Promise<ClasseV3Dto> {
    if (this.acScope.isAc(user.role)) {
      await this.acScope.assertCanAccessClasse(user.id, id);
    }
    const row = await this.prisma.classe.findUnique({ where: { id }, include: classeInclude });
    if (!row) throw new NotFoundException(`Classe ${id} introuvable`);
    // V05 LOT 6 (ADR-0022) — un RP n'accède qu'à SES classes (404 sinon).
    if (isRp(user.role) && row.ownerRpId !== user.id) {
      throw new NotFoundException(`Classe ${id} introuvable`);
    }
    return toDto(row);
  }

  /** Roster de la classe (onglet « Étudiants inscrits » de la fiche, C.4). */
  async listEtudiants(user: CurrentUserPayload, id: string): Promise<EtudiantDto[]> {
    if (this.acScope.isAc(user.role)) {
      await this.acScope.assertCanAccessClasse(user.id, id);
    }
    const classe = await this.prisma.classe.findUnique({ where: { id } });
    if (!classe) throw new NotFoundException(`Classe ${id} introuvable`);
    // V05 LOT 6 (ADR-0022) — un RP n'accède qu'au roster de SES classes.
    if (isRp(user.role) && classe.ownerRpId !== user.id) {
      throw new NotFoundException(`Classe ${id} introuvable`);
    }

    const inscriptions = await this.prisma.inscription.findMany({
      where: { classeId: id },
      include: { etudiant: true },
      orderBy: { etudiant: { fullName: 'asc' } },
    });
    return inscriptions.map((i) => ({
      id: i.etudiant.id,
      nomComplet: i.etudiant.fullName,
      email: i.etudiant.email,
      matricule: i.etudiant.matricule,
      // V05 LOT 6 — id d'inscription pour permettre le retrait (RP/AC scopé).
      inscriptionId: i.id,
    }));
  }

  async create(dto: CreateClasseV3Dto, user: CurrentUserPayload): Promise<ClasseV3Dto> {
    const formation = await this.requireCurrentYearFormation(dto.formationId);

    try {
      const row = await this.prisma.classe.create({
        data: {
          code: dto.code,
          name: dto.name,
          capaciteMax: dto.capaciteMax,
          formationId: formation.id,
          // Synchronise la FK filière legacy depuis la formation (cohérence
          // transition V01→V03, cf. TD-V03-CLASSEID).
          filiereId: formation.filiereId,
          // V05 LOT 6 (ADR-0022) — RP créateur = propriétaire de la classe.
          ownerRpId: isRp(user.role) ? user.id : null,
        },
        include: classeInclude,
      });
      return toDto(row);
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new ConflictException(`Le code de classe "${dto.code}" est déjà utilisé`);
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateClasseV3Dto, user: CurrentUserPayload): Promise<ClasseV3Dto> {
    const exists = await this.prisma.classe.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException(`Classe ${id} introuvable`);
    // V05 LOT 6 (ADR-0022) — un RP ne modifie que SES classes.
    if (isRp(user.role) && exists.ownerRpId !== user.id) {
      throw new NotFoundException(`Classe ${id} introuvable`);
    }

    const data: Prisma.ClasseUpdateInput = {};
    if (dto.code !== undefined) data.code = dto.code;
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.capaciteMax !== undefined) data.capaciteMax = dto.capaciteMax;
    if (dto.formationId !== undefined) {
      const formation = await this.requireCurrentYearFormation(dto.formationId);
      data.formation = { connect: { id: formation.id } };
      data.filiere = { connect: { id: formation.filiereId } };
    }

    try {
      const row = await this.prisma.classe.update({ where: { id }, data, include: classeInclude });
      return toDto(row);
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new ConflictException(`Le code de classe "${dto.code ?? ''}" est déjà utilisé`);
      }
      throw err;
    }
  }

  /** La formation de rattachement doit exister ET être de l'année courante. */
  private async requireCurrentYearFormation(
    formationId: string,
  ): Promise<{ id: string; filiereId: string }> {
    // On charge la filière pour résoudre l'école (racine de scope) et donc
    // l'année courante DE CETTE école (V05 / ADR-0019 §2).
    const formation = await this.prisma.formation.findUnique({
      where: { id: formationId },
      include: { filiere: { select: { ecoleId: true } } },
    });
    if (!formation) throw new BadRequestException(`Formation ${formationId} introuvable`);

    const current = await this.annees.getCurrentEntityOrThrow(formation.filiere.ecoleId);
    if (formation.anneeAcademiqueId !== current.id) {
      throw new BadRequestException(
        "La classe doit être rattachée à une formation de l'année courante",
      );
    }
    return { id: formation.id, filiereId: formation.filiereId };
  }
}

function toDto(row: ClasseRow): ClasseV3Dto {
  // Filière + niveau + année héritées de la formation (V3-D5) ; fallback sur la
  // FK filière legacy si la classe n'a pas encore de formation (transition).
  const filiere = row.formation?.filiere ?? row.filiere;
  // V05 LOT 4.3 — V5-D5 : surface le RP responsable (héritée formation.filiere, sinon legacy).
  const rp = filiere?.responsableRp ?? null;
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    niveau: row.formation?.niveau ?? null,
    filiere: filiere ? { id: filiere.id, sigle: filiere.sigle, libelle: filiere.libelle } : null,
    formationId: row.formationId,
    anneeLibelle: row.formation?.anneeAcademique.libelle ?? null,
    // ADR-0018 : double-diplôme dérivé de la filière (de la formation, sinon FK legacy).
    isDoubleDiplome: (row.formation?.filiere ?? row.filiere)?.isDoubleDiplome ?? false,
    capaciteMax: row.capaciteMax,
    places: { inscrits: row._count.inscriptions, capaciteMax: row.capaciteMax },
    responsable: rp ? { id: rp.id, fullName: rp.fullName } : null,
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
