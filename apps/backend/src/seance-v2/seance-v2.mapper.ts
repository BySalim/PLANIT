import type { Prisma } from '@prisma/client';
import type { SessionSousType, SessionTypeV2, SessionV2Dto } from '@planit/contracts';

/** Prisma include clause loading every relation `toSessionV2Dto` needs. */
export const seanceV2Include = {
  module: true,
  salle: true,
  enseignant: true,
  seanceClasses: { include: { classe: true } },
} satisfies Prisma.SeanceInclude;

export type SeanceV2WithRelations = Prisma.SeanceGetPayload<{
  include: typeof seanceV2Include;
}>;

/**
 * Map a Prisma `Seance` (with V02 relations) to the API `SessionV2Dto`.
 *
 * Throws if mandatory V02 fields are missing (typeV2 null) — this should
 * never happen for séances created via the V02 endpoints. Legacy V01 rows
 * with `typeV2 = null` are filtered out **at the query level** in the service.
 */
export function toSessionV2Dto(seance: SeanceV2WithRelations): SessionV2Dto {
  if (!seance.typeV2) {
    throw new Error(
      `Seance ${seance.id} has typeV2=null — cannot map to SessionV2Dto. ` +
        `Legacy V01 rows must be backfilled before V02 exposure (TD-030).`,
    );
  }

  const classes = [...seance.seanceClasses]
    .sort((a, b) => a.classe.code.localeCompare(b.classe.code))
    .map((link) => ({
      id: link.classe.id,
      code: link.classe.code,
      name: link.classe.name,
    }));

  // V02 contract requires `classes.min(1)`. If the row has no SeanceClasse
  // link (legacy V01 not backfilled), fall back to the V01 `classeId` field
  // to keep the response valid. This is a transitional safety net — once
  // TD-030 backfills are done, this branch can be removed.
  if (classes.length === 0 && seance.classeId) {
    // We have only the classeId; we'd need a separate fetch to get code/name.
    // Push an unresolved ref ; the caller (service) is expected to backfill
    // legacy rows before exposing them. Throwing keeps the contract strict.
    throw new Error(
      `Seance ${seance.id} has no SeanceClasse link — legacy V01 row, run TD-030 backfill`,
    );
  }

  return {
    id: seance.id,
    libelle: seance.libelle,
    type: seance.typeV2 as SessionTypeV2,
    sousType: (seance.sousType ?? null) as SessionSousType | null,
    startAt: seance.startAt.toISOString(),
    endAt: seance.endAt.toISOString(),
    intervenantNom: seance.intervenantNom,
    description: seance.description,

    hasUnpublishedChanges: seance.hasUnpublishedChanges,
    isPublished: seance.isPublished,
    lastModifiedAt: seance.lastModifiedAt.toISOString(),
    lastPublishedAt: seance.lastPublishedAt ? seance.lastPublishedAt.toISOString() : null,

    module: seance.module
      ? {
          id: seance.module.id,
          code: seance.module.code,
          name: seance.module.libelle || seance.module.name,
        }
      : null,
    enseignant: seance.enseignant
      ? { id: seance.enseignant.id, nomComplet: seance.enseignant.nomComplet }
      : null,
    salle: seance.salle ? { id: seance.salle.id, name: seance.salle.name } : null,
    classes,
  };
}

/**
 * Map a V02 (typeV2, sousType) tuple to the V01 enum used by the legacy
 * `Seance.type` column. Necessary as long as the V01 column stays NOT NULL
 * (cleanup TD-029). Mapping rules :
 *  - COURS + sousType ∈ {CM, TD, TP}      → sousType (literal)
 *  - COURS without sousType               → CM (default)
 *  - EVALUATION + sousType EXAMEN         → EXAM
 *  - EVALUATION + sousType RATTRAPAGE     → RATTRAP
 *  - EVALUATION + sousType DEVOIR         → DEVOIR
 *  - EVENEMENT                            → EVENT
 */
export function mapV2ToV01Type(
  typeV2: SessionTypeV2,
  sousType: SessionSousType | null,
): 'CM' | 'TD' | 'TP' | 'EXAM' | 'RATTRAP' | 'DEVOIR' | 'EVENT' {
  if (typeV2 === 'EVENEMENT') return 'EVENT';
  if (typeV2 === 'COURS') {
    if (sousType === 'CM' || sousType === 'TD' || sousType === 'TP') return sousType;
    return 'CM';
  }
  // EVALUATION
  if (sousType === 'EXAMEN') return 'EXAM';
  if (sousType === 'RATTRAPAGE') return 'RATTRAP';
  if (sousType === 'DEVOIR') return 'DEVOIR';
  return 'DEVOIR'; // default
}
