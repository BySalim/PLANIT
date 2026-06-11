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
  // `salle` est nullable depuis V02 LOT 2 (séance V2 / EVENEMENT sans salle) et
  // le contrat SessionDto la reflète en nullable depuis 2026-06-10 — l'ancien
  // throw sur salle nulle faisait 500 sur TOUTE la semaine (vues consult).
  // `teacher` reste requis par le contrat : le create V2 garantit le miroir
  // (`teacherId = teacherIdV01 ?? createdByUserId`), et `buildWeekWhere` exclut
  // défensivement les rows sans teacher pour qu'une donnée legacy inattendue ne
  // refasse jamais tomber l'endpoint entier.
  if (!seance.teacher) {
    throw new Error(`Seance ${seance.id} sans teacher — V01 endpoint ne peut pas la mapper`);
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
    salle: seance.salle ? { id: seance.salle.id, name: seance.salle.name } : null,
    teacher: { id: seance.teacher.id, fullName: seance.teacher.fullName },
  };
}
