import { describe, expect, it } from 'vitest';
import { formatDakar, now, TIMEZONE, toISODakar } from '../index';

/**
 * Tests for the date utilities — Africa/Dakar timezone helpers.
 * Africa/Dakar runs on UTC+0 year-round (no DST).
 */

describe('TIMEZONE constant', () => {
  it('vaut "Africa/Dakar"', () => {
    expect(TIMEZONE).toBe('Africa/Dakar');
  });
});

describe('now()', () => {
  it('retourne un objet Date valide', () => {
    const result = now();
    expect(result).toBeInstanceOf(Date);
    expect(Number.isNaN(result.getTime())).toBe(false);
  });

  it('retourne une date proche du temps réel (tolérance 5s)', () => {
    const before = Date.now();
    const result = now();
    const after = Date.now();
    // L'écart maximal toléré couvre la latence Node + conversion locale.
    const delta = 5_000;
    expect(result.getTime()).toBeGreaterThanOrEqual(before - delta);
    expect(result.getTime()).toBeLessThanOrEqual(after + delta);
  });
});

describe('formatDakar()', () => {
  it('formatte une date en français-Sénégal au fuseau Africa/Dakar', () => {
    const date = new Date('2026-05-25T10:00:00.000Z');
    const formatted = formatDakar(date, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    // Africa/Dakar = UTC+0 → 10:00 UTC = 10:00 locale.
    expect(formatted).toMatch(/10[:h]00/);
  });

  it("utilise le fuseau Dakar (UTC+0) même quand l'OS est sur un autre fuseau", () => {
    // Une date à minuit UTC doit afficher 00 (pas 02 comme Paris été ou 23 comme certaines TZ).
    const date = new Date('2026-05-25T00:00:00.000Z');
    const formatted = formatDakar(date, {
      hour: '2-digit',
      hour12: false,
    });
    expect(formatted).toMatch(/^00/);
  });

  it("accepte un format d'options custom (date longue)", () => {
    const date = new Date('2026-05-25T12:00:00.000Z');
    const formatted = formatDakar(date, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    // On vérifie la présence d'éléments — la chaîne exacte dépend de la locale.
    expect(formatted).toContain('2026');
    expect(formatted).toMatch(/25|mai/i);
  });
});

describe('toISODakar()', () => {
  it("retourne l'ISO string standard (UTC)", () => {
    const date = new Date('2026-05-25T10:00:00.000Z');
    expect(toISODakar(date)).toBe('2026-05-25T10:00:00.000Z');
  });

  it('préserve les millisecondes', () => {
    const date = new Date('2026-05-25T10:00:00.123Z');
    expect(toISODakar(date)).toBe('2026-05-25T10:00:00.123Z');
  });

  it("supporte une date au tout début de l'année", () => {
    const date = new Date('2026-01-01T00:00:00.000Z');
    expect(toISODakar(date)).toBe('2026-01-01T00:00:00.000Z');
  });
});
