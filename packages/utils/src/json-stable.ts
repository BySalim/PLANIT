// Stable JSON serialization with keys sorted recursively.
//
// Used by ADR-0008 (smart-dirty snapshot) to guarantee that two objects that
// are *semantically* equal produce the same string, regardless of the order
// in which their keys were created. Without this, `JSON.stringify({ a: 1,
// b: 2 })` and `JSON.stringify({ b: 2, a: 1 })` would yield different
// strings and the snapshot comparison would report a false positive.
//
// Pair with `extractComparable()` from `@planit/contracts` to produce the
// canonical shape before serializing.

type Stringifiable =
  | null
  | boolean
  | number
  | string
  | Date
  | Stringifiable[]
  | { [k: string]: Stringifiable };

/**
 * Serialize a value to a JSON string with keys sorted alphabetically at every
 * level. Arrays preserve their order ; dates are emitted as ISO 8601.
 *
 * Cycles throw — the caller is expected to pass a plain comparable shape, not
 * an arbitrary object graph.
 */
export function stableStringify(value: unknown): string {
  return JSON.stringify(normalize(value));
}

function normalize(value: unknown): Stringifiable {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') {
    return value;
  }
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalize);
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const sortedKeys = Object.keys(obj).sort();
    const out: Record<string, Stringifiable> = {};
    for (const key of sortedKeys) {
      out[key] = normalize(obj[key]);
    }
    return out;
  }
  throw new TypeError(`stableStringify: cannot serialize value of type ${typeof value}`);
}
