import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type {
  EtudiantDetailDto,
  EtudiantDto,
  EtudiantLookupDto,
  InscriptionHistoryItemDto,
} from '@planit/contracts';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma.service';
import { AcScopeService } from '../ac/ac-scope.service';

/**
 * Étudiants (B.2 / V3-D6) — lecture/recherche seule. **Aucune création directe**
 * (la seule porte d'entrée d'un nouvel étudiant est l'inscription depuis une
 * classe — cf. InscriptionsService).
 *
 * **Scope AC** : un AC ne voit que les étudiants inscrits dans **ses** classes
 * assignées (filtrage serveur sur `inscriptions.some.classeId`).
 */
@Injectable()
export class EtudiantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly acScope: AcScopeService,
  ) {}

  /** Recherche par nom / matricule / email (B.2). */
  async list(user: CurrentUserPayload, q?: string): Promise<EtudiantDto[]> {
    const where: Prisma.UserWhereInput = { role: 'ETUDIANT', deletedAt: null };

    if (q) {
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { matricule: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (this.acScope.isAc(user.role)) {
      const assigned = await this.acScope.getAssignedClasseIds(user.id);
      where.inscriptions = { some: { classeId: { in: assigned } } };
    }

    const rows = await this.prisma.user.findMany({ where, orderBy: { fullName: 'asc' } });
    return rows.map(toDto);
  }

  /** Fiche : identité + historique d'inscriptions par année (B.2 / E.3). */
  async findOne(user: CurrentUserPayload, id: string): Promise<EtudiantDetailDto> {
    const row = await this.prisma.user.findFirst({
      where: { id, role: 'ETUDIANT', deletedAt: null },
      include: {
        inscriptions: {
          include: {
            classe: { include: { filiere: true, formation: { include: { filiere: true } } } },
            anneeAcademique: true,
          },
          orderBy: { anneeAcademique: { debut: 'desc' } },
        },
      },
    });
    if (!row) throw new NotFoundException(`Étudiant ${id} introuvable`);

    if (this.acScope.isAc(user.role)) {
      const assigned = new Set(await this.acScope.getAssignedClasseIds(user.id));
      const inScope = row.inscriptions.some((i) => assigned.has(i.classeId));
      if (!inScope) {
        throw new ForbiddenException("Cet étudiant n'est pas dans votre périmètre");
      }
    }

    const inscriptions: InscriptionHistoryItemDto[] = row.inscriptions.map((i) => {
      const filiere = i.classe.formation?.filiere ?? i.classe.filiere;
      return {
        id: i.id,
        anneeLibelle: i.anneeAcademique.libelle,
        classeId: i.classeId,
        classeCode: i.classe.code,
        classeName: i.classe.name,
        filiereSigle: filiere?.sigle ?? null,
        isDoubleDiplome: i.isDoubleDiplome,
      };
    });

    return { ...toDto(row), inscriptions };
  }

  /**
   * Lookup par email (B.3) — préalable à l'inscription côté UI. Renvoie
   * `{ found, etudiant }` plutôt qu'un 404 : le flux d'inscription bifurque
   * (« existant » vs « nouveau ») selon ce booléen.
   */
  async lookupByEmail(email: string): Promise<EtudiantLookupDto> {
    const row = await this.prisma.user.findFirst({
      where: { email, role: 'ETUDIANT', deletedAt: null },
    });
    return { found: row !== null, etudiant: row ? toDto(row) : null };
  }
}

function toDto(row: {
  id: string;
  fullName: string;
  email: string;
  matricule: string | null;
}): EtudiantDto {
  return {
    id: row.id,
    nomComplet: row.fullName,
    email: row.email,
    matricule: row.matricule,
  };
}
