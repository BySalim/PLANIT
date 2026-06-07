import { describe, expect, it } from 'vitest';
import { extractComparable } from '../planning/comparable';

const baseInput = {
  libelle: 'Algo',
  type: 'COURS' as const,
  sousType: 'CM' as const,
  moduleId: 'm1',
  enseignantId: 'e1',
  salleId: 's1',
  intervenantNom: null,
  description: null,
};

describe('extractComparable', () => {
  it('normalizes Date inputs to ISO strings (toIso Date branch)', () => {
    const out = extractComparable({
      ...baseInput,
      startAt: new Date('2026-01-05T08:00:00.000Z'),
      endAt: new Date('2026-01-05T10:00:00.000Z'),
      classeIds: ['c1'],
    });
    expect(out.startAt).toBe('2026-01-05T08:00:00.000Z');
    expect(out.endAt).toBe('2026-01-05T10:00:00.000Z');
  });

  it('passes through string inputs unchanged (toIso string branch)', () => {
    const out = extractComparable({
      ...baseInput,
      startAt: '2026-01-05T08:00:00.000Z',
      endAt: '2026-01-05T10:00:00.000Z',
      classeIds: ['c1'],
    });
    expect(out.startAt).toBe('2026-01-05T08:00:00.000Z');
  });

  it('sorts classeIds lexicographically for stable set-equality', () => {
    const out = extractComparable({
      ...baseInput,
      startAt: '2026-01-05T08:00:00.000Z',
      endAt: '2026-01-05T10:00:00.000Z',
      classeIds: ['c3', 'c1', 'c2'],
    });
    expect(out.classeIds).toEqual(['c1', 'c2', 'c3']);
  });

  it('does not mutate the input classeIds array', () => {
    const classeIds = ['c2', 'c1'];
    extractComparable({
      ...baseInput,
      startAt: '2026-01-05T08:00:00.000Z',
      endAt: '2026-01-05T10:00:00.000Z',
      classeIds,
    });
    expect(classeIds).toEqual(['c2', 'c1']);
  });
});
