import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { CreateFormationDto, FormationDto, UpdateFormationDto } from '@planit/contracts';
import { PrismaService } from '../common/prisma.service';
import { AnneesService } from '../annees/annees.service';

const formationInclude = {
  filiere: true,
  anneeAcademique: true,
  _count: { select: { classes: true } },
} satisfies Prisma.FormationInclude;

type FormationRow = Prisma.FormationGetPayload<{ include: typeof formationInclude }>;

interface ListQuery {
  anneeId?: string;
  filiereId?: string;
}

/**
 * Formations (A.6 / V3-D4 / ADR-0010) — instances annuelles d'une filière
 * regroupant des classes.
 *
 * Création **pour l'année courante uniquement** : `anneeAcademiqueId` est résolu
 * côté serveur via `AnneesService`, jamais fourni par le client. La version de
 * maquette référencée doit appartenir à cette même année (cohérence : une
 * formation 2025 s'appuie sur une maquette 2025 — le RP « Renouvelle » d'abord
 * si besoin). Une version d'une autre année → 400.
 */
@Injectable()
export class FormationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly annees: AnneesService,
  ) {}

  /** Liste filtrable (défaut = année courante si `anneeId` absent). */
  async list(query: ListQuery): Promise<FormationDto[]> {
    const where: Prisma.FormationWhereInput = {};

    if (query.anneeId) {
      where.anneeAcademiqueId = query.anneeId;
    } else {
      // Défaut : année courante. Si aucune n'est en cours, on ne filtre pas
      // (liste vide plutôt qu'erreur — la page reste affichable).
      const current = await this.annees.findCurrentEntity();
      if (current) where.anneeAcademiqueId = current.id;
    }
    if (query.filiereId) where.filiereId = query.filiereId;

    const rows = await this.prisma.formation.findMany({
      where,
      orderBy: [{ niveau: 'asc' }, { code: 'asc' }],
      include: formationInclude,
    });
    return rows.map(toDto);
  }

  async findOne(id: string): Promise<FormationDto> {
    const row = await this.prisma.formation.findUnique({
      where: { id },
      include: formationInclude,
    });
    if (!row) throw new NotFoundException(`Formation ${id} introuvable`);
    return toDto(row);
  }

  async create(dto: CreateFormationDto): Promise<FormationDto> {
    const currentYear = await this.annees.getCurrentEntityOrThrow();

    const filiere = await this.prisma.filiere.findUnique({ where: { id: dto.filiereId } });
    if (!filiere) throw new BadRequestException(`Filière ${dto.filiereId} introuvable`);

    await this.assertVersionInYear(dto.maquetteVersionId, currentYear.id);

    try {
      const row = await this.prisma.formation.create({
        data: {
          code: dto.code,
          niveau: dto.niveau,
          filiereId: dto.filiereId,
          anneeAcademiqueId: currentYear.id,
          maquetteVersionId: dto.maquetteVersionId,
          isDoubleDiplome: dto.isDoubleDiplome,
        },
        include: formationInclude,
      });
      return toDto(row);
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new ConflictException(`Le code de formation "${dto.code}" est déjà utilisé`);
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateFormationDto): Promise<FormationDto> {
    const exists = await this.prisma.formation.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException(`Formation ${id} introuvable`);

    // Changer la version : la nouvelle doit rester dans l'année de la formation.
    if (dto.maquetteVersionId !== undefined) {
      await this.assertVersionInYear(dto.maquetteVersionId, exists.anneeAcademiqueId);
    }

    const data: Prisma.FormationUpdateInput = {};
    if (dto.code !== undefined) data.code = dto.code;
    if (dto.isDoubleDiplome !== undefined) data.isDoubleDiplome = dto.isDoubleDiplome;
    if (dto.maquetteVersionId !== undefined) {
      data.maquetteVersion = { connect: { id: dto.maquetteVersionId } };
    }

    try {
      const row = await this.prisma.formation.update({
        where: { id },
        data,
        include: formationInclude,
      });
      return toDto(row);
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new ConflictException(`Le code de formation "${dto.code ?? ''}" est déjà utilisé`);
      }
      throw err;
    }
  }

  /** La version doit exister ET appartenir à `anneeId`, sinon 400. */
  private async assertVersionInYear(versionId: string, anneeId: string): Promise<void> {
    const version = await this.prisma.maquetteVersion.findUnique({ where: { id: versionId } });
    if (!version) {
      throw new BadRequestException(`Version de maquette ${versionId} introuvable`);
    }
    if (version.anneeAcademiqueId !== anneeId) {
      throw new BadRequestException(
        "La version de maquette doit appartenir à l'année de la formation (renouvelez la maquette pour l'année courante d'abord)",
      );
    }
  }
}

function toDto(row: FormationRow): FormationDto {
  return {
    id: row.id,
    code: row.code,
    niveau: row.niveau,
    filiereId: row.filiereId,
    filiere: { id: row.filiere.id, sigle: row.filiere.sigle, libelle: row.filiere.libelle },
    anneeAcademiqueId: row.anneeAcademiqueId,
    anneeLibelle: row.anneeAcademique.libelle,
    maquetteVersionId: row.maquetteVersionId,
    isDoubleDiplome: row.isDoubleDiplome,
    classeCount: row._count.classes,
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
