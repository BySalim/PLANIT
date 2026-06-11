import { describe, expect, it, vi } from 'vitest';
import { getRequestId, requestContext } from '../../src/common/request-context';
import { requestIdMiddleware } from '../../src/common/request-id.middleware';

// requestId / corrélation des logs (ADR-0009 Phase 1). Unitaire pur : ne boote
// ni l'app ni la BD — teste l'AsyncLocalStorage + le middleware Express isolés.

interface Res {
  headers: Record<string, string>;
  setHeader(name: string, value: string): void;
}
function makeRes(): Res {
  return {
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
    },
  };
}

describe('requestContext', () => {
  it('retourne undefined hors de tout contexte', () => {
    expect(getRequestId()).toBeUndefined();
  });

  it('expose le requestId à l’intérieur de run()', () => {
    requestContext.run({ requestId: 'abc-123' }, () => {
      expect(getRequestId()).toBe('abc-123');
    });
    expect(getRequestId()).toBeUndefined();
  });
});

describe('requestIdMiddleware', () => {
  it('génère un requestId, le pose en en-tête et ouvre le contexte', () => {
    const res = makeRes();
    let seen: string | undefined;
    const next = vi.fn(() => {
      seen = getRequestId();
    });

    requestIdMiddleware({ headers: {} }, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.headers['X-Request-Id']).toBeDefined();
    // Le contexte est actif pendant next() …
    expect(seen).toBe(res.headers['X-Request-Id']);
    // … et refermé après.
    expect(getRequestId()).toBeUndefined();
  });

  it('reprend un X-Request-Id entrant sain (continuité de trace)', () => {
    const res = makeRes();
    let seen: string | undefined;
    requestIdMiddleware({ headers: { 'x-request-id': 'trace-42' } }, res, () => {
      seen = getRequestId();
    });
    expect(seen).toBe('trace-42');
    expect(res.headers['X-Request-Id']).toBe('trace-42');
  });

  it('ignore un en-tête entrant vide ou aberrant (trop long) et en génère un', () => {
    const res = makeRes();
    const tooLong = 'x'.repeat(500);
    requestIdMiddleware({ headers: { 'x-request-id': tooLong } }, res, () => {});
    expect(res.headers['X-Request-Id']).not.toBe(tooLong);
    expect(res.headers['X-Request-Id'].length).toBeLessThanOrEqual(128);
  });

  it('prend la première valeur si l’en-tête est multiple', () => {
    const res = makeRes();
    let seen: string | undefined;
    requestIdMiddleware({ headers: { 'x-request-id': ['first', 'second'] } }, res, () => {
      seen = getRequestId();
    });
    expect(seen).toBe('first');
  });
});
