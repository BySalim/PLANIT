import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { InscriptionDto, InscriptionRequestDto } from '@planit/contracts';
import { isDoubleDiplomeInscription } from '@planit/utils';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma.service';
import { AcScopeService } from '../ac/ac-scope.service';

/**
 * Inscriptions (B.3/B.4 / V3-D7 / ADR-0011).
 *
 * Flux **email → existant/nouveau** (union discriminée) :
 *  - `existant` : l'étudiant doit déjà exister (résolu par email) → ajout simple.
 *  - `nouveau`  : crée l'`User(role=ETUDIANT)` (nomComplet + matricule **saisi**)
 *    puis l'inscription, dans **une transaction**.
 *
 * Règle double-diplôme : `isDoubleDiplome` est **dénormalisé** depuis la
 * formation de la classe (helper unique `isDoubleDiplomeInscription`) ; la base
 * garantit « ≤ 2 inscriptions/an, 1 par catégorie » via le `@@unique`. On
 * pré-contrôle pour renvoyer un 409 lisible (cf. ADR-0011 §2).
 *
 * **Partagé RP + AC** : un AC ne peut inscrire que dans ses classes assignées.
 *
 * La FK legacy `User.classeId` (transition, TD-V03-CLASSEID) est synchronisée
 * sur la classe non-double-diplôme pour que la vue planning étudiant V02 reste
 * cohérente après une (dés)inscription.
 */
@Injectable()
export class InscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly acScope: AcScopeService,
  ) {}

  async create(
    user: CurrentUserPayload,
    classeId: string,
    dto: InscriptionRequestDto,
  ): Promise<InscriptionDto> {
    if (this.acScope.isAc(user.role)) {
      await this.acScope.assertCanAccessClasse(user.id, classeId);
    }

    const classe = await this.prisma.classe.findUnique({
      where: { id: classeId },
      include: { formation: true },
    });
    if (!classe) throw new NotFoundException(`Classe ${classeId} introuvable`);
    if (!classe.formation) {
      throw new BadRequestException(
        "Cette classe n'est rattachée à aucune formation — inscription impossible",
      );
    }

    const anneeAcademiqueId = classe.formation.anneeAcademiqueId;
    const isDoubleDiplome = isDoubleDiplomeInscription(classe.formation);

    // Résolution de l'étudiant selon le mode.
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (dto.mode === 'existant') {
      if (!existing || existing.role !== 'ETUDIANT' || existing.deletedAt) {
        throw new NotFoundException(
          `Aucun étudiant avec l'email ${dto.email} — utilisez le mode « nouveau »`,
        );
      }
      await this.assertInscriptionRules(existing.id, classeId, anneeAcademiqueId, isDoubleDiplome);
    } else if (existing) {
      // mode « nouveau » mais l'email existe déjà → conflit explicite.
      throw new ConflictException(
        `Un compte existe déjà avec l'email ${dto.email} — utilisez le mode « existant »`,
      );
    }

    const inscription = await this.prisma.$transaction(async (tx) => {
      const etudiantId =
        dto.mode === 'existant'
          ? // existing est garanti défini sur ce branch (vérifié plus haut).
            (existing?.id ?? '__unreachable__')
          : (
              await tx.user.create({
                data: {
                  email: dto.email,
                  fullName: dto.nomComplet,
                  role: 'ETUDIANT',
                  matricule: dto.matricule,
                },
              })
            ).id;

      const created = await tx.inscription.create({
        data: { etudiantId, classeId, anneeAcademiqueId, isDoubleDiplome },
      });

      // Sync FK legacy : la classe non-DD est la classe « principale » de
      // l'étudiant (la vue planning V02 lit `User.classeId`).
      if (!isDoubleDiplome) {
        await tx.user.update({ where: { id: etudiantId }, data: { classeId } });
      }

      return created;
    });

    return toDto(inscription);
  }

  async remove(user: CurrentUserPayload, id: string): Promise<void> {
    const inscription = await this.prisma.inscription.findUnique({ where: { id } });
    if (!inscription) throw new NotFoundException(`Inscription ${id} introuvable`);

    if (this.acScope.isAc(user.role)) {
      await this.acScope.assertCanAccessClasse(user.id, inscription.classeId);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.inscription.delete({ where: { id } });
      // Nettoie la FK legacy si elle pointait sur cette classe.
      await tx.user.updateMany({
        where: { id: inscription.etudiantId, classeId: inscription.classeId },
        data: { classeId: null },
      });
    });
  }

  /**
   * Pré-contrôles double-diplôme (409 lisible avant l'`@@unique` base) :
   *  1. déjà inscrit dans CETTE classe cette année,
   *  2. déjà inscrit dans une classe de la MÊME catégorie (DD / non-DD) cette année.
   */
  private async assertInscriptionRules(
    etudiantId: string,
    classeId: string,
    anneeAcademiqueId: string,
    isDoubleDiplome: boolean,
  ): Promise<void> {
    const sameClasse = await this.prisma.inscription.findUnique({
      where: { etudiantId_classeId_anneeAcademiqueId: { etudiantId, classeId, anneeAcademiqueId } },
    });
    if (sameClasse) {
      throw new ConflictException('Cet étudiant est déjà inscrit dans cette classe cette année');
    }

    const sameCategory = await this.prisma.inscription.findUnique({
      where: {
        etudiantId_anneeAcademiqueId_isDoubleDiplome: {
          etudiantId,
          anneeAcademiqueId,
          isDoubleDiplome,
        },
      },
    });
    if (sameCategory) {
      throw new ConflictException(
        isDoubleDiplome
          ? 'Cet étudiant a déjà une inscription double-diplôme cette année'
          : 'Cet étudiant a déjà une inscription (hors double-diplôme) cette année',
      );
    }
  }
}

function toDto(row: {
  id: string;
  etudiantId: string;
  classeId: string;
  anneeAcademiqueId: string;
  isDoubleDiplome: boolean;
  createdAt: Date;
}): InscriptionDto {
  return {
    id: row.id,
    etudiantId: row.etudiantId,
    classeId: row.classeId,
    anneeAcademiqueId: row.anneeAcademiqueId,
    isDoubleDiplome: row.isDoubleDiplome,
    createdAt: row.createdAt.toISOString(),
  };
}
