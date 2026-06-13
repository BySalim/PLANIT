import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { CreateFormationDto, FormationDto } from '@planit/contracts';
import { formationCode } from '@planit/utils';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma.service';
import { isRp } from '../common/rp-scope';
import { AnneesService } from '../annees/annees.service';
import { MaquettesService } from '../maquettes/maquettes.service';

const formationInclude = {
  // V05 LOT 4.3 — RP responsable surfacé.
  filiere: { include: { responsableRp: { select: { id: true, fullName: true } } } },
  anneeAcademique: true,
  _count: { select: { classes: true } },
} satisfies Prisma.FormationInclude;

type FormationRow = Prisma.FormationGetPayload<{ include: typeof formationInclude }>;

interface ListQuery {
  anneeId?: string;
  filiereId?: string;
}

/**
 * Formations (A.6 / V3-D4 / ADR-0010, refonte ADR-0018) — instances annuelles
 * d'une filière regroupant des classes.
 *
 * Création **pour l'année courante uniquement** (résolue côté serveur). Le RP ne
 * fournit que **filière + niveau** ; le reste est **dérivé** :
 *  - le `code` = `{SIGLE}-{NIVEAU}-{libelléAnnée}` (helper pur `formationCode`) ;
 *  - la **maquette `(filière, niveau)`** et sa **version pour l'année courante**
 *    sont créées ou **renouvelées** automatiquement
 *    (`MaquettesService.ensureMaquetteAndVersion`), dans la même transaction.
 * Au plus **une** formation par `(filière, niveau, année)` (garde + `@@unique`).
 * `isDoubleDiplome` n'existe plus ici : c'est une propriété de la filière.
 */
@Injectable()
export class FormationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly annees: AnneesService,
    private readonly maquettes: MaquettesService,
  ) {}

  /**
   * Liste filtrable (défaut = année courante si `anneeId` absent), **scopée à
   * l'école** de l'acteur via la filière (V05 / ADR-0019 §3). `ecoleId === null`
   * (ADMIN) ⇒ liste vide.
   */
  async list(query: ListQuery, user: CurrentUserPayload): Promise<FormationDto[]> {
    if (!user.ecoleId) return [];
    // Scope école + (RP) espace de travail via la filière (ADR-0022).
    const where: Prisma.FormationWhereInput = {
      filiere: { ecoleId: user.ecoleId, ...(isRp(user.role) ? { ownerRpId: user.id } : {}) },
    };

    if (query.anneeId) {
      where.anneeAcademiqueId = query.anneeId;
    } else {
      // Défaut : année courante de l'école. Si aucune n'est en cours, on ne
      // filtre pas par année (liste vide plutôt qu'erreur — la page reste
      // affichable).
      const current = await this.annees.findCurrentEntity(user.ecoleId);
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

  /**
   * Création pilote (ADR-0018) : filière + niveau → tout le reste est dérivé.
   * Transaction atomique : maquette + version garanties (créées ou renouvelées)
   * puis formation reliée. Garde anti-doublon `(filière, niveau, année)` avec un
   * message lisible avant la contrainte `@@unique`.
   */
  async create(dto: CreateFormationDto): Promise<FormationDto> {
    // L'école de la formation est celle de sa filière (racine de scope) ; on la
    // résout d'abord pour obtenir l'année courante DE CETTE école (ADR-0019 §2).
    const filiere = await this.prisma.filiere.findUnique({ where: { id: dto.filiereId } });
    if (!filiere) throw new BadRequestException(`Filière ${dto.filiereId} introuvable`);

    const currentYear = await this.annees.getCurrentEntityOrThrow(filiere.ecoleId);

    const duplicate = await this.prisma.formation.findUnique({
      where: {
        filiereId_niveau_anneeAcademiqueId: {
          filiereId: dto.filiereId,
          niveau: dto.niveau,
          anneeAcademiqueId: currentYear.id,
        },
      },
    });
    if (duplicate) {
      throw new ConflictException(
        `Une formation ${dto.niveau} ${filiere.sigle} existe déjà pour ${currentYear.libelle}`,
      );
    }

    const code = formationCode({
      sigle: filiere.sigle,
      niveau: dto.niveau,
      anneeLibelle: currentYear.libelle,
    });

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const maquetteVersionId = await this.maquettes.ensureMaquetteAndVersion(tx, {
          filiereId: dto.filiereId,
          niveau: dto.niveau,
          sigle: filiere.sigle,
          currentYearId: currentYear.id,
          // V05 LOT 6 (ADR-0022) — la maquette hérite du propriétaire de la filière.
          ownerRpId: filiere.ownerRpId,
        });
        return tx.formation.create({
          data: {
            code,
            niveau: dto.niveau,
            filiereId: dto.filiereId,
            anneeAcademiqueId: currentYear.id,
            maquetteVersionId,
          },
          include: formationInclude,
        });
      });
      return toDto(created);
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new ConflictException(
          `Une formation ${dto.niveau} ${filiere.sigle} existe déjà pour ${currentYear.libelle}`,
        );
      }
      throw err;
    }
  }
}

function toDto(row: FormationRow): FormationDto {
  const rp = row.filiere.responsableRp ?? null;
  return {
    id: row.id,
    code: row.code,
    niveau: row.niveau,
    filiereId: row.filiereId,
    filiere: { id: row.filiere.id, sigle: row.filiere.sigle, libelle: row.filiere.libelle },
    anneeAcademiqueId: row.anneeAcademiqueId,
    anneeLibelle: row.anneeAcademique.libelle,
    maquetteVersionId: row.maquetteVersionId,
    classeCount: row._count.classes,
    // V05 LOT 4.3 — V5-D5
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
