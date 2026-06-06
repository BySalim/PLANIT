import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type {
  EnseignantSuiviItemDto,
  Niveau,
  SessionV2Dto,
  SuiviModuleDto,
  SuiviModuleQueryDto,
} from '@planit/contracts';
import { computeVHE } from '@planit/utils';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma.service';
import { AcScopeService } from '../ac/ac-scope.service';
import { seanceV2Include, toSessionV2Dto } from '../seance-v2/seance-v2.mapper';

/** Heures d'une séance (Dakar = UTC, durée simple endAt - startAt). */
function seanceHours(startAt: Date, endAt: Date): number {
  return (endAt.getTime() - startAt.getTime()) / 3_600_000;
}

const versionModuleInclude = {
  formation: {
    include: {
      maquetteVersion: {
        include: { modules: { include: { module: { include: { ue: true } } } } },
      },
    },
  },
} satisfies Prisma.ClasseInclude;

type VersionModule = Prisma.MaquetteModuleGetPayload<{
  include: { module: { include: { ue: true } } };
}>;

/** Heures faites + enseignants agrégés pour un couple (classe, module). */
interface SeanceAgg {
  heures: number;
  enseignants: Map<string, { nom: string; heures: number }>;
}

/**
 * Suivi des modules (B.5/B.6 / V3-D8 / ADR-0012).
 *
 * Tout est **dérivé** sauf `estTermine` (seul état persisté sur `SuiviModule`) :
 *  - `heuresPrevues` = VHE du `MaquetteModule` de la version suivie par la classe,
 *  - `heuresFaites`  = somme des durées des séances **COURS** du module pour la classe,
 *  - `progression`   = heuresFaites / heuresPrevues (borné à 100),
 *  - `enseignants[]` = agrégat heures par enseignant sur ces séances.
 *
 * Les lignes `SuiviModule` sont **alignées paresseusement** sur les modules de
 * la version (création des manquantes au list) : le suivi reflète toujours la
 * maquette, même après un « Composer » (V3-D8). Agrégation des séances en **une
 * requête** + calcul en mémoire (perf suffisante à cette échelle ;
 * vue matérialisée en réserve — TD-V03-SUIVI-PERF).
 *
 * **Scope AC** : restreint aux classes assignées. « Terminer/Rouvrir » = RP only
 * (contrôleur).
 */
@Injectable()
export class SuiviModulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly acScope: AcScopeService,
  ) {}

  async list(user: CurrentUserPayload, query: SuiviModuleQueryDto): Promise<SuiviModuleDto[]> {
    const classeIds = await this.resolveScopeClasseIds(user, query.classeId);
    if (classeIds.length === 0) return [];

    const classes = await this.prisma.classe.findMany({
      where: { id: { in: classeIds } },
      include: versionModuleInclude,
    });

    // Couples (classe, module) attendus = modules de la version suivie.
    const expected: {
      classeId: string;
      classeCode: string;
      niveau: Niveau | null;
      mm: VersionModule;
    }[] = [];
    for (const classe of classes) {
      const modules = classe.formation?.maquetteVersion?.modules ?? [];
      const niveau = classe.formation?.niveau ?? null;
      for (const mm of modules) {
        expected.push({ classeId: classe.id, classeCode: classe.code, niveau, mm });
      }
    }
    if (expected.length === 0) return [];

    const suiviByKey = await this.ensureSuiviRows(
      expected.map((e) => ({ classeId: e.classeId, moduleId: e.mm.moduleId })),
    );
    const moduleIds = [...new Set(expected.map((e) => e.mm.moduleId))];
    const agg = await this.aggregateSeances(classeIds, moduleIds);

    const items: SuiviModuleDto[] = expected.map(({ classeId, classeCode, niveau, mm }) => {
      const key = keyOf(classeId, mm.moduleId);
      const suivi = suiviByKey.get(key);
      const heuresPrevues = computeVHE(mm);
      const a = agg.get(key);
      const heuresFaites = a?.heures ?? 0;
      const progression =
        heuresPrevues > 0 ? Math.min(100, Math.round((heuresFaites / heuresPrevues) * 100)) : 0;
      const enseignants = a
        ? [...a.enseignants.entries()].map(([id, v]) => ({ id, nom: v.nom, heures: v.heures }))
        : [];

      return {
        id: suivi?.id ?? '',
        classeId,
        classeCode,
        niveau,
        moduleId: mm.moduleId,
        module: {
          id: mm.module.id,
          code: mm.module.code,
          libelle: mm.module.libelle,
          color: mm.module.color,
          ue: mm.module.ue
            ? {
                id: mm.module.ue.id,
                code: mm.module.ue.code,
                libelle: mm.module.ue.libelle,
                color: mm.module.ue.color,
              }
            : null,
        },
        semestre: mm.semestre,
        heuresPrevues,
        heuresFaites,
        progression,
        enseignants,
        estTermine: suivi?.estTermine ?? false,
      };
    });

    return this.applyFilters(items, query);
  }

  /** B.6 — séances COURS du module suivi, pour le bouton « Voir les séances ». */
  async seancesForSuivi(user: CurrentUserPayload, suiviId: string): Promise<SessionV2Dto[]> {
    const suivi = await this.prisma.suiviModule.findUnique({ where: { id: suiviId } });
    if (!suivi) throw new NotFoundException(`Suivi ${suiviId} introuvable`);

    if (this.acScope.isAc(user.role)) {
      await this.acScope.assertCanAccessClasse(user.id, suivi.classeId);
    }

    const seances = await this.prisma.seance.findMany({
      where: {
        typeV2: 'COURS',
        moduleId: suivi.moduleId,
        seanceClasses: { some: { classeId: suivi.classeId } },
      },
      include: seanceV2Include,
      // Ordre chronologique inverse : la séance la plus récente d'abord
      // (l'API est la source d'autorité de l'ordre affiché dans le drawer).
      orderBy: { startAt: 'desc' },
    });
    return seances.map(toSessionV2Dto);
  }

  /** Terminer (RP) — marque le suivi terminé puis renvoie le DTO recalculé. */
  async terminer(suiviId: string): Promise<SuiviModuleDto> {
    return this.setTermine(suiviId, true);
  }

  /** Rouvrir (RP). */
  async rouvrir(suiviId: string): Promise<SuiviModuleDto> {
    return this.setTermine(suiviId, false);
  }

  /**
   * S.3 — pivot enseignant (V3-D15).
   *
   * Renvoie pour chaque module enseigné la liste des classes avec :
   * - `heuresFaites` ventilées CM/TD/TP (via `Seance.sousType`)
   * - `heuresPrevues` = VHE du MaquetteModule de la version suivie par la classe
   * - `sessionsCount` = nombre de séances COURS du module pour la classe
   * - `estTermine` = flag du SuiviModule correspondant
   * - `status` global du module : `completed` si toutes les classes terminées,
   *   `ongoing` si au moins une a des heures faites, sinon `upcoming`.
   */
  async mesEnseignements(userId: string): Promise<EnseignantSuiviItemDto[]> {
    const enseignant = await this.prisma.enseignant.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!enseignant) return [];

    // Séances COURS de l'enseignant avec module + classes (select strict, pas d'include).
    // Le filtre moduleId IS NOT NULL est appliqué en JS (`if (!s.moduleId) continue`)
    // car Prisma v6 TypeScript refuse null dans NOT pour un champ StringNullable.
    const seances = await this.prisma.seance.findMany({
      where: {
        typeV2: 'COURS',
        enseignantId: enseignant.id,
      },
      select: {
        id: true,
        moduleId: true,
        sousType: true,
        startAt: true,
        endAt: true,
        seanceClasses: { select: { classeId: true } },
        module: {
          select: {
            id: true,
            code: true,
            libelle: true,
            color: true,
            ue: { select: { id: true, code: true, libelle: true } },
          },
        },
      },
    });

    if (seances.length === 0) return [];

    const moduleIds = [...new Set(seances.map((s) => s.moduleId as string))];
    const classeIds = [...new Set(seances.flatMap((s) => s.seanceClasses.map((c) => c.classeId)))];

    // Classes avec maquette pour heuresPrevues (select strict — pas d'include imbriqué).
    const classes = await this.prisma.classe.findMany({
      where: { id: { in: classeIds } },
      select: {
        id: true,
        code: true,
        name: true,
        formation: {
          select: {
            anneeAcademique: { select: { etat: true } },
            maquetteVersion: {
              select: {
                modules: {
                  select: {
                    moduleId: true,
                    heuresCM: true,
                    heuresTD: true,
                    heuresTP: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    const classeMap = new Map(classes.map((c) => [c.id, c]));
    // Spec S.3 : le pivot enseignant ne couvre que l'année académique EN_COURS.
    const currentYearClasseIds = new Set(
      classes.filter((c) => c.formation?.anneeAcademique?.etat === 'EN_COURS').map((c) => c.id),
    );

    // estTermine par (classeId, moduleId).
    const suiviRows = await this.prisma.suiviModule.findMany({
      where: { classeId: { in: classeIds }, moduleId: { in: moduleIds } },
      select: { classeId: true, moduleId: true, estTermine: true },
    });
    const suiviMap = new Map<string, boolean>(
      suiviRows.map((r) => [keyOf(r.classeId, r.moduleId), r.estTermine]),
    );

    // Agrégat heures par (moduleId, classeId).
    type ModRef = NonNullable<(typeof seances)[number]['module']>;
    interface ClasseAgg {
      heuresCM: number;
      heuresTD: number;
      heuresTP: number;
      heuresFaites: number;
      sessionsCount: number;
      moduleRef: ModRef | null;
    }
    const agg = new Map<string, Map<string, ClasseAgg>>();

    for (const s of seances) {
      if (!s.moduleId) continue;
      const hours = seanceHours(s.startAt, s.endAt);

      for (const link of s.seanceClasses) {
        const cid = link.classeId;
        if (!currentYearClasseIds.has(cid)) continue; // Spec S.3 : année courante uniquement
        let byClasse = agg.get(s.moduleId);
        if (!byClasse) {
          byClasse = new Map();
          agg.set(s.moduleId, byClasse);
        }
        let ca = byClasse.get(cid);
        if (!ca) {
          ca = {
            heuresCM: 0,
            heuresTD: 0,
            heuresTP: 0,
            heuresFaites: 0,
            sessionsCount: 0,
            moduleRef: s.module,
          };
          byClasse.set(cid, ca);
        }
        ca.heuresFaites += hours;
        ca.sessionsCount += 1;
        if (s.sousType === 'CM') ca.heuresCM += hours;
        else if (s.sousType === 'TD') ca.heuresTD += hours;
        else if (s.sousType === 'TP') ca.heuresTP += hours;
      }
    }

    const items: EnseignantSuiviItemDto[] = [];

    for (const moduleId of agg.keys()) {
      const byClasse = agg.get(moduleId);
      if (!byClasse) continue;
      const firstEntry = [...byClasse.values()][0];
      if (!firstEntry) continue;
      const mod = firstEntry.moduleRef;

      const classeItems = [...byClasse.entries()].map(([cid, ca]) => {
        const classeInfo = classeMap.get(cid);
        const mms = classeInfo?.formation?.maquetteVersion?.modules ?? [];
        const mm = mms.find((m) => m.moduleId === moduleId);
        const heuresPrevues = mm ? computeVHE(mm) : 0;
        const progression =
          heuresPrevues > 0
            ? Math.min(100, Math.round((ca.heuresFaites / heuresPrevues) * 100))
            : 0;
        const estTermine = suiviMap.get(keyOf(cid, moduleId)) ?? false;

        return {
          classeId: cid,
          classeCode: classeInfo?.code ?? cid,
          className: classeInfo?.name ?? cid,
          heuresFaites: ca.heuresFaites,
          heuresCM: ca.heuresCM,
          heuresTD: ca.heuresTD,
          heuresTP: ca.heuresTP,
          heuresPrevues,
          progression,
          sessionsCount: ca.sessionsCount,
          estTermine,
        };
      });

      const allDone = classeItems.every((c) => c.estTermine);
      const anyStarted = classeItems.some((c) => c.heuresFaites > 0);
      const status: EnseignantSuiviItemDto['status'] = allDone
        ? 'completed'
        : anyStarted
          ? 'ongoing'
          : 'upcoming';

      items.push({
        moduleId,
        module: {
          id: mod?.id ?? moduleId,
          code: mod?.code ?? '',
          libelle: mod?.libelle ?? '',
          color: mod?.color ?? '#A8A29E',
          ue: mod?.ue ? { id: mod.ue.id, code: mod.ue.code, libelle: mod.ue.libelle } : null,
        },
        classes: classeItems,
        status,
      });
    }

    return items;
  }

  // ── internes ─────────────────────────────────────────────────────────

  private async setTermine(suiviId: string, estTermine: boolean): Promise<SuiviModuleDto> {
    const exists = await this.prisma.suiviModule.findUnique({ where: { id: suiviId } });
    if (!exists) throw new NotFoundException(`Suivi ${suiviId} introuvable`);

    await this.prisma.suiviModule.update({
      where: { id: suiviId },
      data: { estTermine, termineAt: estTermine ? new Date() : null },
    });
    return this.getOne(exists.classeId, exists.moduleId);
  }

  /** Recalcule un SuiviModuleDto unique (après terminer/rouvrir). */
  private async getOne(classeId: string, moduleId: string): Promise<SuiviModuleDto> {
    const [classe, suivi] = await Promise.all([
      this.prisma.classe.findUnique({ where: { id: classeId }, include: versionModuleInclude }),
      this.prisma.suiviModule.findUnique({
        where: { classeId_moduleId: { classeId, moduleId } },
      }),
    ]);
    const mm = classe?.formation?.maquetteVersion?.modules.find((m) => m.moduleId === moduleId);
    if (!classe || !mm || !suivi) {
      throw new NotFoundException(`Suivi (classe ${classeId}, module ${moduleId}) introuvable`);
    }

    const agg = await this.aggregateSeances([classeId], [moduleId]);
    const a = agg.get(keyOf(classeId, moduleId));
    const heuresPrevues = computeVHE(mm);
    const heuresFaites = a?.heures ?? 0;

    return {
      id: suivi.id,
      classeId,
      classeCode: classe.code,
      niveau: classe.formation?.niveau ?? null,
      moduleId,
      module: {
        id: mm.module.id,
        code: mm.module.code,
        libelle: mm.module.libelle,
        color: mm.module.color,
        ue: mm.module.ue
          ? {
              id: mm.module.ue.id,
              code: mm.module.ue.code,
              libelle: mm.module.ue.libelle,
              color: mm.module.ue.color,
            }
          : null,
      },
      semestre: mm.semestre,
      heuresPrevues,
      heuresFaites,
      progression:
        heuresPrevues > 0 ? Math.min(100, Math.round((heuresFaites / heuresPrevues) * 100)) : 0,
      enseignants: a
        ? [...a.enseignants.entries()].map(([id, v]) => ({ id, nom: v.nom, heures: v.heures }))
        : [],
      estTermine: suivi.estTermine,
    };
  }

  /**
   * S.2 — self-scope ETUDIANT : classes de l'étudiant via Inscription, année courante.
   * Si l'étudiant n'est inscrit dans aucune classe pour l'année courante → liste vide.
   */
  private async resolveEtudiantClasseIds(userId: string): Promise<string[]> {
    const current = await this.prisma.anneeAcademique.findFirst({
      where: { etat: 'EN_COURS' },
      select: { id: true },
    });
    if (!current) return [];

    const inscriptions = await this.prisma.inscription.findMany({
      where: { etudiantId: userId, anneeAcademiqueId: current.id },
      select: { classeId: true },
    });
    return inscriptions.map((i) => i.classeId);
  }

  private async resolveScopeClasseIds(
    user: CurrentUserPayload,
    classeId?: string,
  ): Promise<string[]> {
    const isStudent = user.role === 'ETUDIANT' || user.role === 'RESPONSABLE_CLASSE';
    if (classeId) {
      if (this.acScope.isAc(user.role)) {
        await this.acScope.assertCanAccessClasse(user.id, classeId);
      } else if (isStudent) {
        const own = await this.resolveEtudiantClasseIds(user.id);
        if (!own.includes(classeId)) {
          throw new ForbiddenException('Classe hors de votre périmètre');
        }
      }
      return [classeId];
    }
    if (this.acScope.isAc(user.role)) {
      return this.acScope.getAssignedClasseIds(user.id);
    }
    if (isStudent) {
      return this.resolveEtudiantClasseIds(user.id);
    }
    const rows = await this.prisma.classe.findMany({
      where: { formationId: { not: null } },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  /** Crée les lignes SuiviModule manquantes puis renvoie la map par clé. */
  private async ensureSuiviRows(
    pairs: { classeId: string; moduleId: string }[],
  ): Promise<Map<string, { id: string; estTermine: boolean }>> {
    const classeIds = [...new Set(pairs.map((p) => p.classeId))];
    const existing = await this.prisma.suiviModule.findMany({
      where: { classeId: { in: classeIds } },
      select: { id: true, classeId: true, moduleId: true, estTermine: true },
    });
    const existingKeys = new Set(existing.map((r) => keyOf(r.classeId, r.moduleId)));

    const missing = pairs.filter((p) => !existingKeys.has(keyOf(p.classeId, p.moduleId)));
    if (missing.length > 0) {
      await this.prisma.suiviModule.createMany({ data: missing, skipDuplicates: true });
    }

    const all =
      missing.length > 0
        ? await this.prisma.suiviModule.findMany({
            where: { classeId: { in: classeIds } },
            select: { id: true, classeId: true, moduleId: true, estTermine: true },
          })
        : existing;

    const map = new Map<string, { id: string; estTermine: boolean }>();
    for (const r of all)
      map.set(keyOf(r.classeId, r.moduleId), { id: r.id, estTermine: r.estTermine });
    return map;
  }

  /** Une requête → agrégat heures + enseignants par (classe, module). */
  private async aggregateSeances(
    classeIds: string[],
    moduleIds: string[],
  ): Promise<Map<string, SeanceAgg>> {
    const seances = await this.prisma.seance.findMany({
      where: {
        typeV2: 'COURS',
        moduleId: { in: moduleIds },
        seanceClasses: { some: { classeId: { in: classeIds } } },
      },
      include: {
        enseignant: { select: { id: true, nomComplet: true } },
        seanceClasses: { select: { classeId: true } },
      },
    });

    const map = new Map<string, SeanceAgg>();
    for (const s of seances) {
      if (!s.moduleId) continue;
      const hours = seanceHours(s.startAt, s.endAt);
      for (const link of s.seanceClasses) {
        if (!classeIds.includes(link.classeId)) continue;
        const key = keyOf(link.classeId, s.moduleId);
        let agg = map.get(key);
        if (!agg) {
          agg = { heures: 0, enseignants: new Map() };
          map.set(key, agg);
        }
        agg.heures += hours;
        if (s.enseignant) {
          const e = agg.enseignants.get(s.enseignant.id);
          if (e) e.heures += hours;
          else
            agg.enseignants.set(s.enseignant.id, { nom: s.enseignant.nomComplet, heures: hours });
        }
      }
    }
    return map;
  }

  private applyFilters(items: SuiviModuleDto[], query: SuiviModuleQueryDto): SuiviModuleDto[] {
    let out = items;
    if (query.semestre !== undefined) {
      out = out.filter((i) => i.semestre === query.semestre);
    }
    if (query.statut) {
      out = out.filter((i) => {
        if (query.statut === 'termine') return i.estTermine;
        if (query.statut === 'en_cours') return !i.estTermine && i.heuresFaites > 0;
        return !i.estTermine && i.heuresFaites === 0; // a_planifier
      });
    }
    if (query.q) {
      const q = query.q.toLowerCase();
      out = out.filter(
        (i) =>
          i.module.libelle.toLowerCase().includes(q) || i.module.code.toLowerCase().includes(q),
      );
    }
    return out;
  }
}

function keyOf(classeId: string, moduleId: string): string {
  return `${classeId}::${moduleId}`;
}
