import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { AnneeAcademique, Prisma } from '@prisma/client';
import type {
  AnneeAcademiqueDto,
  CreateAnneeAcademiqueDto,
  UpdateAnneeAcademiqueDto,
} from '@planit/contracts';
import { resolveCurrentYear } from '@planit/utils';
import { PrismaService } from '../common/prisma.service';

/**
 * AnneeAcademique (A.1 / V3-D1 / ADR-0010).
 *
 * Source de vérité de « l'année courante ». La règle « au plus une année
 * `EN_COURS` » est garantie EN BASE par un index unique partiel Postgres
 * (`WHERE etat = 'EN_COURS'`, posé en SQL brut dans la migration v3). Le
 * service double cette garantie d'un pré-contrôle applicatif pour renvoyer
 * un 409 explicite (le P2002 d'un index partiel ne porte pas de `target`
 * fiable à mapper). La logique de sélection elle-même est déléguée au helper
 * pur partagé `resolveCurrentYear` (@planit/utils) — une seule source de
 * vérité back + front.
 */
@Injectable()
export class AnneesService {
  constructor(private readonly prisma: PrismaService) {}

  /** A.1 — liste triée par date de début décroissante (année récente en tête). */
  async list(): Promise<AnneeAcademiqueDto[]> {
    const rows = await this.prisma.anneeAcademique.findMany({ orderBy: { debut: 'desc' } });
    return rows.map(toDto);
  }

  /** A.1 — `GET /api/annees/current`. 404 si aucune année en cours. */
  async getCurrent(): Promise<AnneeAcademiqueDto> {
    const current = await this.findCurrentEntity();
    if (!current) {
      throw new NotFoundException('Aucune année académique en cours');
    }
    return toDto(current);
  }

  /**
   * Entité de l'année courante, ou `null`. Utilisée en interne par les
   * créations rattachées à l'année courante (formations, classes, inscriptions).
   * Délègue la sélection au helper pur partagé.
   */
  async findCurrentEntity(): Promise<AnneeAcademique | null> {
    const rows = await this.prisma.anneeAcademique.findMany({ where: { etat: 'EN_COURS' } });
    return resolveCurrentYear(rows);
  }

  /**
   * Année courante ou 409 — pour les opérations qui *exigent* une année en
   * cours (création de formation/classe/inscription). Le 409 (et non 404)
   * signale un état serveur incohérent côté métier, pas une route absente.
   */
  async getCurrentEntityOrThrow(): Promise<AnneeAcademique> {
    const current = await this.findCurrentEntity();
    if (!current) {
      throw new ConflictException(
        "Aucune année académique en cours — impossible de rattacher la ressource à l'année courante",
      );
    }
    return current;
  }

  async create(dto: CreateAnneeAcademiqueDto): Promise<AnneeAcademiqueDto> {
    if (dto.etat === 'EN_COURS') {
      await this.assertNoOtherEnCours();
    }
    try {
      const row = await this.prisma.anneeAcademique.create({
        data: {
          libelle: dto.libelle,
          debut: new Date(dto.debut),
          fin: new Date(dto.fin),
          etat: dto.etat,
        },
      });
      return toDto(row);
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new ConflictException(`Le libellé d'année "${dto.libelle}" est déjà utilisé`);
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateAnneeAcademiqueDto): Promise<AnneeAcademiqueDto> {
    const exists = await this.prisma.anneeAcademique.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException(`Année ${id} introuvable`);

    if (dto.etat === 'EN_COURS' && exists.etat !== 'EN_COURS') {
      await this.assertNoOtherEnCours(id);
    }

    const data: Prisma.AnneeAcademiqueUpdateInput = {};
    if (dto.libelle !== undefined) data.libelle = dto.libelle;
    if (dto.debut !== undefined) data.debut = new Date(dto.debut);
    if (dto.fin !== undefined) data.fin = new Date(dto.fin);
    if (dto.etat !== undefined) data.etat = dto.etat;

    try {
      const row = await this.prisma.anneeAcademique.update({ where: { id }, data });
      return toDto(row);
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new ConflictException(`Le libellé d'année "${dto.libelle}" est déjà utilisé`);
      }
      throw err;
    }
  }

  /** Garde « une seule EN_COURS » — 409 explicite avant de heurter l'index partiel. */
  private async assertNoOtherEnCours(exceptId?: string): Promise<void> {
    const where: Prisma.AnneeAcademiqueWhereInput = { etat: 'EN_COURS' };
    if (exceptId) where.id = { not: exceptId };
    const conflicting = await this.prisma.anneeAcademique.findFirst({ where });
    if (conflicting) {
      throw new ConflictException(
        `Une année est déjà EN_COURS (« ${conflicting.libelle} ») — clôturez-la d'abord`,
      );
    }
  }
}

function toDto(row: AnneeAcademique): AnneeAcademiqueDto {
  return {
    id: row.id,
    libelle: row.libelle,
    debut: row.debut.toISOString(),
    fin: row.fin.toISOString(),
    etat: row.etat,
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
