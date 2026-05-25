import { describe, expect, it } from 'vitest';
import { computeSnapshot, isDirty, toComparable } from '../../src/seance-v2/dirty-detection';
import type { SeanceForComparable } from '../../src/seance-v2/dirty-detection';

function baseSeance(): SeanceForComparable {
  return {
    libelle: 'Algo CM',
    typeV2: 'COURS',
    sousType: 'CM',
    startAt: new Date('2026-05-25T10:00:00.000Z'),
    endAt: new Date('2026-05-25T12:00:00.000Z'),
    moduleId: 'm1',
    enseignantId: 'e1',
    salleId: 's1',
    intervenantNom: null,
    description: null,
    classeIds: ['cb', 'ca'],
  };
}

describe('toComparable', () => {
  it('trie les classeIds lexicographiquement', () => {
    const c = toComparable(baseSeance());
    expect(c.classeIds).toEqual(['ca', 'cb']);
  });

  it('normalise les dates en ISO 8601 UTC', () => {
    const c = toComparable(baseSeance());
    expect(c.startAt).toBe('2026-05-25T10:00:00.000Z');
    expect(c.endAt).toBe('2026-05-25T12:00:00.000Z');
  });

  it('lance si typeV2 est null (row legacy V01 sans backfill)', () => {
    const broken = { ...baseSeance(), typeV2: null };
    expect(() => toComparable(broken)).toThrow();
  });
});

describe('computeSnapshot + isDirty', () => {
  it('produit la même chaîne pour deux séances équivalentes (clés dans un ordre différent)', () => {
    const s1 = baseSeance();
    const s2: SeanceForComparable = {
      // ordre des classeIds inversé — ne doit pas changer le snapshot
      classeIds: ['cb', 'ca'],
      description: s1.description,
      enseignantId: s1.enseignantId,
      endAt: s1.endAt,
      intervenantNom: s1.intervenantNom,
      libelle: s1.libelle,
      moduleId: s1.moduleId,
      salleId: s1.salleId,
      sousType: s1.sousType,
      startAt: s1.startAt,
      typeV2: s1.typeV2,
    };
    expect(computeSnapshot(s1)).toBe(computeSnapshot(s2));
  });

  it('isDirty=true si snapshot null/undefined (séance jamais publiée)', () => {
    expect(isDirty(baseSeance(), null)).toBe(true);
    expect(isDirty(baseSeance(), undefined)).toBe(true);
  });

  it('isDirty=false si snapshot identique', () => {
    const s = baseSeance();
    const snapshot = computeSnapshot(s);
    expect(isDirty(s, snapshot)).toBe(false);
    // Snapshot peut aussi être un objet JSON (Prisma.Json)
    expect(isDirty(s, JSON.parse(snapshot))).toBe(false);
  });

  it('isDirty=true si modification de l’heure', () => {
    const s = baseSeance();
    const snapshot = computeSnapshot(s);
    const modified: SeanceForComparable = {
      ...s,
      endAt: new Date('2026-05-25T13:00:00.000Z'),
    };
    expect(isDirty(modified, snapshot)).toBe(true);
  });

  it('isDirty=false si on permute juste l’ordre des classeIds', () => {
    const s = baseSeance();
    const snapshot = computeSnapshot(s);
    const permuted: SeanceForComparable = { ...s, classeIds: ['ca', 'cb'] };
    expect(isDirty(permuted, snapshot)).toBe(false);
  });
});
