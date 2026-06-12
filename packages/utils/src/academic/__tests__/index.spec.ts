import { describe, expect, it } from 'vitest';
import {
  computeVHE,
  computeVHT,
  formationCode,
  isDoubleDiplomeInscription,
  maquetteNom,
  resolveCurrentYear,
  semestreAbsolu,
  semestreLabel,
} from '../index';

describe('computeVHE', () => {
  it('somme CM + TD + TP (exclut TPE)', () => {
    expect(computeVHE({ heuresCM: 20, heuresTD: 10, heuresTP: 6 })).toBe(36);
  });

  it('vaut 0 quand toutes les heures encadrées sont nulles', () => {
    expect(computeVHE({ heuresCM: 0, heuresTD: 0, heuresTP: 0 })).toBe(0);
  });
});

describe('computeVHT', () => {
  it('VHT = VHE + TPE', () => {
    expect(computeVHT({ heuresCM: 20, heuresTD: 10, heuresTP: 6, heuresTPE: 14 })).toBe(50);
  });

  it('VHT = VHE quand TPE = 0', () => {
    const h = { heuresCM: 12, heuresTD: 8, heuresTP: 0, heuresTPE: 0 };
    expect(computeVHT(h)).toBe(computeVHE(h));
  });
});

describe('resolveCurrentYear', () => {
  const annees = [
    { libelle: '2024-2025', etat: 'CLOTUREE' },
    { libelle: '2025-2026', etat: 'EN_COURS' },
    { libelle: '2026-2027', etat: 'PLANIFIEE' },
  ];

  it("renvoie l'unique année EN_COURS", () => {
    expect(resolveCurrentYear(annees)?.libelle).toBe('2025-2026');
  });

  it('renvoie null si aucune année en cours', () => {
    expect(resolveCurrentYear([{ etat: 'PLANIFIEE' }, { etat: 'CLOTUREE' }])).toBeNull();
  });

  it('renvoie null sur liste vide', () => {
    expect(resolveCurrentYear([])).toBeNull();
  });
});

describe('isDoubleDiplomeInscription', () => {
  it('reflète la catégorie de la filière de la formation (ADR-0018)', () => {
    expect(isDoubleDiplomeInscription({ filiere: { isDoubleDiplome: true } })).toBe(true);
    expect(isDoubleDiplomeInscription({ filiere: { isDoubleDiplome: false } })).toBe(false);
  });
});

describe('formationCode', () => {
  it('compose SIGLE-NIVEAU-libelléAnnée', () => {
    expect(formationCode({ sigle: 'GLRS', niveau: 'L3', anneeLibelle: '2025-2026' })).toBe(
      'GLRS-L3-2025-2026',
    );
  });
});

describe('maquetteNom', () => {
  it('compose « Maquette {niveau} {sigle} »', () => {
    expect(maquetteNom({ niveau: 'L1', sigle: 'GLRS' })).toBe('Maquette L1 GLRS');
  });
});

describe('semestreAbsolu / semestreLabel', () => {
  it('dérive le semestre absolu du niveau et du rang', () => {
    expect(semestreAbsolu('L1', 1)).toBe(1);
    expect(semestreAbsolu('L1', 2)).toBe(2);
    expect(semestreAbsolu('L3', 1)).toBe(5);
    expect(semestreAbsolu('L3', 2)).toBe(6);
    expect(semestreAbsolu('M2', 2)).toBe(10);
  });

  it('formate le libellé Sn', () => {
    expect(semestreLabel('L3', 1)).toBe('S5');
    expect(semestreLabel('M1', 2)).toBe('S8');
  });
});
