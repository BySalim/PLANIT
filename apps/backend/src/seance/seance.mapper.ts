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
