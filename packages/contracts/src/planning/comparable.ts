import type { SessionSousType, SessionTypeV2 } from './planning-v2';

// ─────────────────────────────────────────────────────────────────────
// Comparable shape — projection used for smart-dirty detection (ADR-0008 §2).
// ─────────────────────────────────────────────────────────────────────
// MUST stay in sync with `Seance` business fields. NOT included on purpose:
// id, createdAt, updatedAt, lastModifiedAt, lastPublishedAt, isPublished,
// hasUnpublishedChanges, publishedSnapshot itself — to avoid circular
// comparison and exclude server-managed timestamps.

export interface ComparableSeance {
  libelle: string;
  type: SessionTypeV2;
  sousType: SessionSousType | null;
  startAt: string; // ISO 8601 UTC
  endAt: string; // ISO 8601 UTC
  moduleId: string | null;
  enseignantId: string | null;
  salleId: string | null;
  intervenantNom: string | null;
  description: string | null;
  classeIds: string[]; // sorted lexicographically
}

/**
 * Project a séance to its comparable shape. Dates are normalized to ISO 8601 UTC.
 * `classeIds` is sorted to make set-equality stable under JSON serialization.
 *
 * Used by:
 *  - backend: `SeanceService` (LOT 2 V02) — at create/update/publish, to
 *    populate `publishedSnapshot` and compute `hasUnpublishedChanges`.
 *  - frontend: `useDirtyOverrides` (LOT 3 V02) — to predict the badge state
 *    optimistically before the API round-trip.
 *
 * Pair with `stableStringify` (`@planit/utils`) to obtain a canonical string
 * for equality checks.
 */
export function extractComparable(input: {
  libelle: string;
  type: SessionTypeV2;
  sousType: SessionSousType | null;
  startAt: Date | string;
  endAt: Date | string;
  moduleId: string | null;
  enseignantId: string | null;
  salleId: string | null;
  intervenantNom: string | null;
  description: string | null;
  classeIds: readonly string[];
}): ComparableSeance {
  return {
    libelle: input.libelle,
    type: input.type,
    sousType: input.sousType,
    startAt: toIso(input.startAt),
    endAt: toIso(input.endAt),
    moduleId: input.moduleId,
    enseignantId: input.enseignantId,
    salleId: input.salleId,
    intervenantNom: input.intervenantNom,
    description: input.description,
    classeIds: [...input.classeIds].sort(),
  };
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}
