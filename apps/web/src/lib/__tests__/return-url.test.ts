import { describe, expect, it } from 'vitest';
import { safeReturnUrl } from '../return-url';

describe('safeReturnUrl', () => {
  it('accepte un chemin interne absolu', () => {
    expect(safeReturnUrl('/rp')).toBe('/rp');
    expect(safeReturnUrl('/rp/enseignants')).toBe('/rp/enseignants');
    expect(safeReturnUrl('/etudiant/planning?date=2026-05-31')).toBe(
      '/etudiant/planning?date=2026-05-31',
    );
  });

  it('rejette une URL protocol-relative (open redirect)', () => {
    expect(safeReturnUrl('//evil.com')).toBeNull();
    expect(safeReturnUrl('//evil.com/path')).toBeNull();
  });

  it('rejette une URL absolue externe', () => {
    expect(safeReturnUrl('http://evil.com')).toBeNull();
    expect(safeReturnUrl('https://evil.com/rp')).toBeNull();
    expect(safeReturnUrl('javascript:alert(1)')).toBeNull();
  });

  it('rejette les backslashes (contournement //)', () => {
    expect(safeReturnUrl('/\\evil.com')).toBeNull();
    expect(safeReturnUrl('\\\\evil.com')).toBeNull();
  });

  it('rejette les valeurs vides ou absentes', () => {
    expect(safeReturnUrl('')).toBeNull();
    expect(safeReturnUrl(null)).toBeNull();
    expect(safeReturnUrl(undefined)).toBeNull();
  });

  it('rejette un chemin relatif sans slash initial', () => {
    expect(safeReturnUrl('rp')).toBeNull();
    expect(safeReturnUrl('evil.com')).toBeNull();
  });
});
