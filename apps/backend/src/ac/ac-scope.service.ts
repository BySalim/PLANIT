import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { AcScopeDto, Role } from '@planit/contracts';
import { PrismaService } from '../common/prisma.service';

/**
 * Périmètre d'un AC (Attaché de Classe — V3-D9 / ADR-0010).
 *
 * Service **transverse** : classes, étudiants, salles, suivi et planning
 * l'utilisent pour restreindre ce qu'un AC voit. Le filtrage est **toujours**
 * appluqué côté serveur (jamais un simple masquage UI) :
 *  - un AC ne voit que **ses classes assignées** (`AssistantClasse`),
 *  - et les **salles dont son RP manager est responsable** (`Salle.rpResponsableId`).
 *
 * Pour les autres rôles (RP notamment), `isAc()` renvoie `false` et les services
 * n'appliquent aucune restriction de périmètre.
 */
@Injectable()
export class AcScopeService {
  constructor(private readonly prisma: PrismaService) {}

  isAc(role: Role): boolean {
    return role === 'ASSISTANT_PROGRAMME';
  }

  /** Ids des classes assignées à un AC par son RP. */
  async getAssignedClasseIds(acUserId: string): Promise<string[]> {
    const rows = await this.prisma.assistantClasse.findMany({
      where: { acId: acUserId },
      select: { classeId: true },
    });
    return rows.map((r) => r.classeId);
  }

  /** Id du RP manager d'un AC (null si non rattaché). */
  async getManagerRpId(acUserId: string): Promise<string | null> {
    const ac = await this.prisma.user.findUnique({
      where: { id: acUserId },
      select: { managerRpId: true },
    });
    return ac?.managerRpId ?? null;
  }

  /**
   * Vrai si la classe est dans le périmètre de l'AC. Utilisé pour autoriser une
   * mutation scoped (ex. inscription depuis une classe). Les non-AC sont
   * autorisés par les guards `@Roles` en amont — cette méthode ne concerne que
   * le sous-périmètre d'un AC.
   */
  async canAccessClasse(acUserId: string, classeId: string): Promise<boolean> {
    const link = await this.prisma.assistantClasse.findUnique({
      where: { acId_classeId: { acId: acUserId, classeId } },
    });
    return link !== null;
  }

  /** Lève 403 si la classe n'est pas dans le périmètre de l'AC. */
  async assertCanAccessClasse(acUserId: string, classeId: string): Promise<void> {
    if (!(await this.canAccessClasse(acUserId, classeId))) {
      throw new ForbiddenException("Cette classe n'est pas dans votre périmètre");
    }
  }

  /** `GET /api/ac/me/scope` — classes assignées + salles du RP manager. */
  async getScope(acUserId: string): Promise<AcScopeDto> {
    const [classeLinks, managerRpId] = await Promise.all([
      this.prisma.assistantClasse.findMany({
        where: { acId: acUserId },
        select: { classe: { select: { id: true, code: true, name: true } } },
        orderBy: { classe: { code: 'asc' } },
      }),
      this.getManagerRpId(acUserId),
    ]);

    const salles = managerRpId
      ? await this.prisma.salle.findMany({
          where: { rpResponsableId: managerRpId },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        })
      : [];

    return {
      classes: classeLinks.map((l) => l.classe),
      salles,
    };
  }

  // ── Assignation par le RP (B.7) ──────────────────────────────────────

  /**
   * Le RP n'assigne/retire des classes qu'aux AC **qu'il manage**. Lève 404 si
   * l'AC n'existe pas / n'est pas un AC, 403 s'il n'est pas managé par ce RP.
   */
  async assertManages(rpUserId: string, acId: string): Promise<void> {
    const ac = await this.prisma.user.findUnique({
      where: { id: acId },
      select: { role: true, managerRpId: true },
    });
    if (!ac || ac.role !== 'ASSISTANT_PROGRAMME') {
      throw new NotFoundException(`AC ${acId} introuvable`);
    }
    if (ac.managerRpId !== rpUserId) {
      throw new ForbiddenException("Cet AC n'est pas rattaché à vous");
    }
  }

  async assignClasse(rpUserId: string, acId: string, classeId: string): Promise<void> {
    await this.assertManages(rpUserId, acId);

    const classe = await this.prisma.classe.findUnique({ where: { id: classeId } });
    if (!classe) throw new NotFoundException(`Classe ${classeId} introuvable`);

    await this.prisma.assistantClasse.upsert({
      where: { acId_classeId: { acId, classeId } },
      update: {},
      create: { acId, classeId },
    });
  }

  async unassignClasse(rpUserId: string, acId: string, classeId: string): Promise<void> {
    await this.assertManages(rpUserId, acId);

    await this.prisma.assistantClasse.deleteMany({ where: { acId, classeId } });
  }
}
