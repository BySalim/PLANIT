import { describe, expect, it } from 'vitest';
import { stableStringify } from '../json-stable';

describe('stableStringify', () => {
  it('sorts top-level keys alphabetically', () => {
    expect(stableStringify({ b: 2, a: 1, c: 3 })).toBe('{"a":1,"b":2,"c":3}');
  });

  it('produces equal strings for semantically equal objects regardless of key order', () => {
    const left = { libelle: 'Algo', startAt: '2026-01-01T10:00:00.000Z', moduleId: 'm1' };
    const right = { startAt: '2026-01-01T10:00:00.000Z', moduleId: 'm1', libelle: 'Algo' };
    expect(stableStringify(left)).toBe(stableStringify(right));
  });

  it('sorts nested object keys recursively', () => {
    const value = { outer: { z: 1, a: 2, m: 3 } };
    expect(stableStringify(value)).toBe('{"outer":{"a":2,"m":3,"z":1}}');
  });

  it('preserves array order (insertion-sensitive)', () => {
    expect(stableStringify({ ids: ['c', 'a', 'b'] })).toBe('{"ids":["c","a","b"]}');
  });

  it('emits Date as ISO 8601 UTC', () => {
    const date = new Date('2026-05-25T10:00:00.000Z');
    expect(stableStringify({ at: date })).toBe('{"at":"2026-05-25T10:00:00.000Z"}');
  });

  it('treats undefined and null as null', () => {
    expect(stableStringify({ x: null, y: undefined })).toBe('{"x":null,"y":null}');
  });

  it('throws on unsupported types (function)', () => {
    expect(() => stableStringify({ fn: () => 1 })).toThrow(TypeError);
  });
});
