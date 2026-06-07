import { describe, expect, it } from 'vitest';
import { type Result, err, isErr, isOk, ok } from '../index';

describe('result', () => {
  it('ok wraps a value with ok=true', () => {
    const r = ok(42);
    expect(r).toEqual({ ok: true, value: 42 });
  });

  it('err wraps an error with ok=false', () => {
    const boom = new Error('boom');
    const r = err(boom);
    expect(r).toEqual({ ok: false, error: boom });
  });

  it('isOk narrows to the Ok branch', () => {
    const r: Result<number, string> = ok(1);
    expect(isOk(r)).toBe(true);
    expect(isErr(r)).toBe(false);
    if (isOk(r)) {
      // Type narrowing: `.value` is accessible without a cast.
      expect(r.value).toBe(1);
    }
  });

  it('isErr narrows to the Err branch', () => {
    const r: Result<number, string> = err('nope');
    expect(isErr(r)).toBe(true);
    expect(isOk(r)).toBe(false);
    if (isErr(r)) {
      expect(r.error).toBe('nope');
    }
  });
});
