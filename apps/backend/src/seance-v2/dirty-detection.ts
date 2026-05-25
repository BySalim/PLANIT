import { extractComparable } from '@planit/contracts';
import type { ComparableSeance, SessionSousType, SessionTypeV2 } from '@planit/contracts';
import { stableStringify } from '@planit/utils';

/**
 * Smart dirty detection (ADR-0008).
 *
 * Backend pipeline :
 *  - at `create` : `publishedSnapshot = null`, `hasUnpublishedChanges = true`.
 *  - at `update` : compute the current snapshot, compare to the stored one,
 *    set `hasUnpublishedChanges` accordingly.
 *  - at `publish` : write the current snapshot, set `hasUnpublishedChanges = false`.
 *
 * The `ComparableSeance` shape lives in `@planit/contracts/planning/comparable`
 * to be shared with the frontend (`useDirtyOverrides` LOT 3).
 */
export interface SeanceForComparable {
  libelle: string;
  typeV2: SessionTypeV2 | null;
  sousType: SessionSousType | null;
  startAt: Date | string;
  endAt: Date | string;
  moduleId: string | null;
  enseignantId: string | null;
  salleId: string | null;
  intervenantNom: string | null;
  description: string | null;
  classeIds: readonly string[];
}

/** Project a Prisma row to the canonical comparable shape. */
export function toComparable(seance: SeanceForComparable): ComparableSeance {
  if (seance.typeV2 === null) {
    throw new Error('toComparable: seance.typeV2 is null — V02 migration not complete on this row');
  }
  return extractComparable({
    libelle: seance.libelle,
    type: seance.typeV2,
    sousType: seance.sousType,
    startAt: seance.startAt,
    endAt: seance.endAt,
    moduleId: seance.moduleId,
    enseignantId: seance.enseignantId,
    salleId: seance.salleId,
    intervenantNom: seance.intervenantNom,
    description: seance.description,
    classeIds: seance.classeIds,
  });
}

/** Stable JSON snapshot of the comparable shape. Returned by `publish()`. */
export function computeSnapshot(seance: SeanceForComparable): string {
  return stableStringify(toComparable(seance));
}

/**
 * Is the séance dirty relative to its stored snapshot ?
 * - if `storedSnapshot` is null/undefined → always dirty (no reference)
 * - else compare via stableStringify (clés triées, dates ISO)
 */
export function isDirty(seance: SeanceForComparable, storedSnapshot: unknown): boolean {
  if (storedSnapshot === null || storedSnapshot === undefined) return true;
  const stored =
    typeof storedSnapshot === 'string' ? storedSnapshot : stableStringify(storedSnapshot);
  return computeSnapshot(seance) !== stored;
}
