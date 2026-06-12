import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type {
  CreateMaquetteModuleDto,
  MaquetteDto,
  MaquetteExportDto,
  MaquetteModuleDto,
  MaquetteVersionDto,
  Niveau,
  UpdateMaquetteModuleDto,
} from '@planit/contracts';
import { computeVHE, computeVHT, maquetteNom } from '@planit/utils';
import { PrismaService } from '../common/prisma.service';

// `include` partagé pour charger un MaquetteModule prêt à mapper (module + UE).
const moduleInclude = {
  module: { include: { ue: true } },
} satisfies Prisma.MaquetteModuleInclude;

type MaquetteModuleRow = Prisma.MaquetteModuleGetPayload<{ include: typeof moduleInclude }>;

/**
 * Maquettes versionnées (A.2 → A.5 / V3-D2/D3 / ADR-0010).
 *
 * Couvre les 3 entités couplées Maquette / MaquetteVersion / MaquetteModule
 * (même logique que UE+Module dans AcademicModule). Invariants clés :
 *  - **Immutabilité inter-versions** : « Renouveler » clone profondément la
 *    dernière version vers l'année courante ; modifier une version ne touche
 *    jamais les autres années.
 *  - **Une version par (maquette, année)** : garanti par `@@unique` ; renew 2×
 *    sur la même année → 409.
 *  - **VHE/VHT jamais persistés** : dérivés via `computeVHE/computeVHT` à la
 *    lecture (heures saisies = seule source).
 *  - **Filière + niveau figés** après création (cohérence des versions) ; seul
 *    le nom est modifiable.
 */
@Injectable()
export class MaquettesService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Maquette (A.2) ───────────────────────────────────────────────────

  /** Liste lite : identité + filière + niveau + compteur de versions. */
  async list(): Promise<MaquetteDto[]> {
    const rows = await this.prisma.maquette.findMany({
      orderBy: [{ niveau: 'asc' }, { nom: 'asc' }],
      include: { filiere: true, _count: { select: { versions: true } } },
    });
    return rows.map(toMaquetteDto);
  }

  async findOne(id: string): Promise<MaquetteDto> {
    const row = await this.prisma.maquette.findUnique({
      where: { id },
      include: { filiere: true, _count: { select: { versions: true } } },
    });
    if (!row) throw new NotFoundException(`Maquette ${id} introuvable`);
    return toMaquetteDto(row);
  }

  /**
   * Provisionnement automatique (ADR-0018) — appelé **dans la transaction** de
   * création d'une formation. Garantit que la maquette `(filière, niveau)` existe
   * (nom dérivé) et qu'une `MaquetteVersion` existe pour l'année courante :
   *  - version déjà présente pour l'année → réutilisée ;
   *  - sinon, **renouvellement** = clone profond de la dernière version (modules +
   *    heures) ; à défaut (maquette neuve) → version **vide**.
   * Renvoie l'`id` de la version de l'année courante. Aucune création directe de
   * maquette par le RP — c'est l'unique point d'entrée.
   */
  async ensureMaquetteAndVersion(
    tx: Prisma.TransactionClient,
    args: { filiereId: string; niveau: Niveau; sigle: string; currentYearId: string },
  ): Promise<string> {
    const { filiereId, niveau, sigle, currentYearId } = args;

    const maquette = await tx.maquette.upsert({
      where: { filiereId_niveau: { filiereId, niveau } },
      update: {},
      create: { nom: maquetteNom({ niveau, sigle }), filiereId, niveau },
    });

    const existing = await tx.maquetteVersion.findUnique({
      where: {
        maquetteId_anneeAcademiqueId: {
          maquetteId: maquette.id,
          anneeAcademiqueId: currentYearId,
        },
      },
    });
    if (existing) return existing.id;

    // Clone de la dernière version (toute année) — renouvellement immuable.
    const source = await tx.maquetteVersion.findFirst({
      where: { maquetteId: maquette.id },
      orderBy: { anneeAcademique: { debut: 'desc' } },
      include: { modules: true },
    });

    const version = await tx.maquetteVersion.create({
      data: { maquetteId: maquette.id, anneeAcademiqueId: currentYearId },
    });
    if (source && source.modules.length > 0) {
      await tx.maquetteModule.createMany({
        data: source.modules.map((m) => ({
          maquetteVersionId: version.id,
          moduleId: m.moduleId,
          semestre: m.semestre,
          heuresCM: m.heuresCM,
          heuresTD: m.heuresTD,
          heuresTP: m.heuresTP,
          heuresTPE: m.heuresTPE,
        })),
      });
    }
    return version.id;
  }

  // ── Versions (A.3) ───────────────────────────────────────────────────

  /** Versions d'une maquette (lite : moduleCount + année), récentes en tête. */
  async listVersions(maquetteId: string): Promise<MaquetteVersionDto[]> {
    const maquette = await this.prisma.maquette.findUnique({ where: { id: maquetteId } });
    if (!maquette) throw new NotFoundException(`Maquette ${maquetteId} introuvable`);

    const rows = await this.prisma.maquetteVersion.findMany({
      where: { maquetteId },
      orderBy: { anneeAcademique: { debut: 'desc' } },
      include: { anneeAcademique: true, _count: { select: { modules: true } } },
    });
    return rows.map(toVersionLite);
  }

  /** Détail d'une version : modules (VHE/VHT dérivés) + classes la suivant (M.6). */
  async getVersion(vid: string): Promise<MaquetteVersionDto> {
    const version = await this.prisma.maquetteVersion.findUnique({
      where: { id: vid },
      include: {
        anneeAcademique: true,
        modules: { include: moduleInclude, orderBy: [{ semestre: 'asc' }] },
      },
    });
    if (!version) throw new NotFoundException(`Version de maquette ${vid} introuvable`);

    const classes = await this.classesFollowingVersion(vid);

    return {
      id: version.id,
      maquetteId: version.maquetteId,
      anneeAcademiqueId: version.anneeAcademiqueId,
      annee: {
        id: version.anneeAcademique.id,
        libelle: version.anneeAcademique.libelle,
        etat: version.anneeAcademique.etat,
      },
      modules: version.modules.map(toModuleDto),
      moduleCount: version.modules.length,
      classes,
      createdAt: version.createdAt.toISOString(),
      updatedAt: version.updatedAt.toISOString(),
    };
  }

  // ── Composer (A.4) ───────────────────────────────────────────────────

  async addModule(vid: string, dto: CreateMaquetteModuleDto): Promise<MaquetteModuleDto> {
    const version = await this.prisma.maquetteVersion.findUnique({ where: { id: vid } });
    if (!version) throw new NotFoundException(`Version de maquette ${vid} introuvable`);

    const moduleExists = await this.prisma.module.findUnique({ where: { id: dto.moduleId } });
    if (!moduleExists) throw new BadRequestException(`Module ${dto.moduleId} introuvable`);

    try {
      const row = await this.prisma.maquetteModule.create({
        data: {
          maquetteVersionId: vid,
          moduleId: dto.moduleId,
          semestre: dto.semestre,
          heuresCM: dto.heuresCM,
          heuresTD: dto.heuresTD,
          heuresTP: dto.heuresTP,
          heuresTPE: dto.heuresTPE,
        },
        include: moduleInclude,
      });
      return toModuleDto(row);
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new ConflictException('Ce module est déjà présent dans cette version');
      }
      throw err;
    }
  }

  async updateModule(id: string, dto: UpdateMaquetteModuleDto): Promise<MaquetteModuleDto> {
    const exists = await this.prisma.maquetteModule.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException(`Module de maquette ${id} introuvable`);

    const data: Prisma.MaquetteModuleUpdateInput = {};
    if (dto.semestre !== undefined) data.semestre = dto.semestre;
    if (dto.heuresCM !== undefined) data.heuresCM = dto.heuresCM;
    if (dto.heuresTD !== undefined) data.heuresTD = dto.heuresTD;
    if (dto.heuresTP !== undefined) data.heuresTP = dto.heuresTP;
    if (dto.heuresTPE !== undefined) data.heuresTPE = dto.heuresTPE;

    const row = await this.prisma.maquetteModule.update({
      where: { id },
      data,
      include: moduleInclude,
    });
    return toModuleDto(row);
  }

  async removeModule(id: string): Promise<void> {
    const exists = await this.prisma.maquetteModule.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException(`Module de maquette ${id} introuvable`);
    await this.prisma.maquetteModule.delete({ where: { id } });
  }

  // ── Export (A.5) ─────────────────────────────────────────────────────

  /** Structure complète d'une version + totaux dérivés (rendu image/PDF, LOT 7). */
  async exportVersion(vid: string): Promise<MaquetteExportDto> {
    const version = await this.prisma.maquetteVersion.findUnique({
      where: { id: vid },
      include: {
        anneeAcademique: true,
        modules: { include: moduleInclude, orderBy: [{ semestre: 'asc' }] },
        maquette: { include: { filiere: true, _count: { select: { versions: true } } } },
      },
    });
    if (!version) throw new NotFoundException(`Version de maquette ${vid} introuvable`);

    const modules = version.modules.map(toModuleDto);
    const classes = await this.classesFollowingVersion(vid);

    const totaux = modules.reduce(
      (acc, m) => ({
        cm: acc.cm + m.heuresCM,
        td: acc.td + m.heuresTD,
        tp: acc.tp + m.heuresTP,
        tpe: acc.tpe + m.heuresTPE,
        vhe: acc.vhe + (m.vhe ?? 0),
        vht: acc.vht + (m.vht ?? 0),
      }),
      { cm: 0, td: 0, tp: 0, tpe: 0, vhe: 0, vht: 0 },
    );

    return {
      maquette: toMaquetteDto(version.maquette),
      version: {
        id: version.id,
        maquetteId: version.maquetteId,
        anneeAcademiqueId: version.anneeAcademiqueId,
        annee: {
          id: version.anneeAcademique.id,
          libelle: version.anneeAcademique.libelle,
          etat: version.anneeAcademique.etat,
        },
        modules,
        moduleCount: modules.length,
        classes,
        createdAt: version.createdAt.toISOString(),
        updatedAt: version.updatedAt.toISOString(),
      },
      modules,
      totaux,
    };
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  /** Classes suivant une version (via leur formation). 2ᵉ colonne page Maquettes. */
  private async classesFollowingVersion(
    vid: string,
  ): Promise<{ id: string; code: string; name: string }[]> {
    return this.prisma.classe.findMany({
      where: { formation: { maquetteVersionId: vid } },
      select: { id: true, code: true, name: true },
      orderBy: { code: 'asc' },
    });
  }
}

// ── Mappers ──────────────────────────────────────────────────────────────

type MaquetteRow = Prisma.MaquetteGetPayload<{
  include: { filiere: true; _count: { select: { versions: true } } };
}>;

function toMaquetteDto(row: MaquetteRow): MaquetteDto {
  return {
    id: row.id,
    nom: row.nom,
    filiereId: row.filiereId,
    filiere: { id: row.filiere.id, sigle: row.filiere.sigle, libelle: row.filiere.libelle },
    niveau: row.niveau,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    versionCount: row._count.versions,
  };
}

type VersionLiteRow = Prisma.MaquetteVersionGetPayload<{
  include: { anneeAcademique: true; _count: { select: { modules: true } } };
}>;

function toVersionLite(row: VersionLiteRow): MaquetteVersionDto {
  return {
    id: row.id,
    maquetteId: row.maquetteId,
    anneeAcademiqueId: row.anneeAcademiqueId,
    annee: {
      id: row.anneeAcademique.id,
      libelle: row.anneeAcademique.libelle,
      etat: row.anneeAcademique.etat,
    },
    moduleCount: row._count.modules,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toModuleDto(row: MaquetteModuleRow): MaquetteModuleDto {
  const heures = {
    heuresCM: row.heuresCM,
    heuresTD: row.heuresTD,
    heuresTP: row.heuresTP,
    heuresTPE: row.heuresTPE,
  };
  return {
    id: row.id,
    maquetteVersionId: row.maquetteVersionId,
    moduleId: row.moduleId,
    module: {
      id: row.module.id,
      code: row.module.code,
      libelle: row.module.libelle,
      color: row.module.color,
      ue: row.module.ue
        ? {
            id: row.module.ue.id,
            code: row.module.ue.code,
            libelle: row.module.ue.libelle,
            color: row.module.ue.color,
          }
        : null,
    },
    semestre: row.semestre,
    ...heures,
    vhe: computeVHE(heures),
    vht: computeVHT(heures),
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
