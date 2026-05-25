import type { Prisma } from '@prisma/client';
import type { SessionDto } from '@planit/contracts';

/** Prisma include clause loading every relation `toSessionDto` needs. */
export const seanceInclude = {
  classe: true,
  module: true,
  salle: true,
  teacher: true,
} satisfies Prisma.SeanceInclude;

/** A `Seance` row with its `classe`, `module`, `salle` and `teacher` loaded. */
export type SeanceWithRelations = Prisma.SeanceGetPayload<{ include: typeof seanceInclude }>;

/** Convert a Prisma `Seance` (with relations) to the API `SessionDto` shape. */
export function toSessionDto(seance: SeanceWithRelations): SessionDto {
  // V02 a relâché Seance.teacherId/salleId en nullable au niveau BD (les
  // EVENEMENT V02 peuvent ne pas en avoir). Le contrat V01 SessionDto, lui,
  // requiert teacher et salle non-null. Les séances créées via V01 fournissent
  // toujours ces FK ; le seed alimente aussi les rows V02. Cas extrême : un
  // EVENEMENT V02 sans salle/enseignant remonté par le V01 endpoint → ce cas
  // est filtré au niveau de buildWeekWhere ou retourne un placeholder.
  if (!seance.salle || !seance.teacher) {
    throw new Error(
      `Seance ${seance.id} sans salle ou teacher — V01 endpoint ne peut pas la mapper (V02 row)`,
    );
  }
  return {
    id: seance.id,
    type: seance.type,
    status: seance.status,
    startAt: seance.startAt.toISOString(),
    endAt: seance.endAt.toISOString(),
    isPublished: seance.isPublished,
    lastModifiedAt: seance.lastModifiedAt.toISOString(),
    lastPublishedAt: seance.lastPublishedAt ? seance.lastPublishedAt.toISOString() : null,
    classe: { id: seance.classe.id, code: seance.classe.code, name: seance.classe.name },
    module: { id: seance.module.id, code: seance.module.code, name: seance.module.name },
    salle: { id: seance.salle.id, name: seance.salle.name },
    teacher: { id: seance.teacher.id, fullName: seance.teacher.fullName },
  };
}
