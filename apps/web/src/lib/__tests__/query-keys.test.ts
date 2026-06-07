import { describe, expect, it } from 'vitest';
import { enseignantKeys, filiereKeys, planningKeys, ueKeys } from '../queries';
import { academicKeys, enseignantSuiviKeys, studentSuiviKeys } from '../queries-v3';

// Query-key factories are the single source of truth for TanStack cache keys —
// a silent change here breaks invalidation. These assert their stable shape.

describe('planningKeys', () => {
  it('builds week / teacher / student / stats / session keys', () => {
    expect(planningKeys.sessions('2026-01-05')).toEqual(['planning', 'sessions', '2026-01-05']);
    expect(planningKeys.sessionsByTeacher('2026-01-05', 't1')).toEqual([
      'planning',
      'sessions',
      '2026-01-05',
      'teacher',
      't1',
    ]);
    expect(planningKeys.sessionsByStudent('2026-01-05', 's1')).toEqual([
      'planning',
      'sessions',
      '2026-01-05',
      'student',
      's1',
    ]);
    expect(planningKeys.stats('2026-01-05')).toEqual(['planning', 'stats', '2026-01-05']);
    expect(planningKeys.session('abc')).toEqual(['planning', 'session', 'abc']);
  });
});

describe('enseignantKeys / ueKeys / filiereKeys', () => {
  it('builds list keys with optional statut', () => {
    expect(enseignantKeys.list(2)).toEqual(['enseignants', 'list', 2, '']);
    expect(enseignantKeys.list(1, 'PERMANENT')).toEqual(['enseignants', 'list', 1, 'PERMANENT']);
  });

  it('builds UE list + lazy module keys', () => {
    expect(ueKeys.list()).toEqual(['ues', 'list']);
    expect(ueKeys.modules('ue1')).toEqual(['ues', 'modules', 'ue1']);
  });

  it('builds filiere list key', () => {
    expect(filiereKeys.list()).toEqual(['filieres', 'list']);
  });
});

describe('academicKeys', () => {
  it('nests under the academic-v3 root', () => {
    expect(academicKeys.annees()).toEqual(['academic-v3', 'annees']);
    expect(academicKeys.maquette('m1')).toEqual(['academic-v3', 'maquette', 'm1']);
    expect(academicKeys.maquetteVersions('m1')).toEqual([
      'academic-v3',
      'maquette',
      'm1',
      'versions',
    ]);
    expect(academicKeys.maquetteVersion('v1')).toEqual(['academic-v3', 'maquette-version', 'v1']);
    expect(academicKeys.classeEtudiants('c1')).toEqual([
      'academic-v3',
      'classe',
      'c1',
      'etudiants',
    ]);
    expect(academicKeys.classeSuivi('c1')).toEqual(['academic-v3', 'classe', 'c1', 'suivi']);
    expect(academicKeys.etudiants('aw')).toEqual(['academic-v3', 'etudiants', { q: 'aw' }]);
    expect(academicKeys.suiviSeances('s1')).toEqual([
      'academic-v3',
      'suivi-modules',
      's1',
      'seances',
    ]);
  });

  it('serializes filter objects into the formations / classes keys', () => {
    expect(academicKeys.formations({ anneeId: 'a1' })).toEqual([
      'academic-v3',
      'formations',
      { anneeId: 'a1' },
    ]);
    expect(academicKeys.classes({ q: 'GL' })).toEqual(['academic-v3', 'classes', { q: 'GL' }]);
  });
});

describe('student / enseignant suivi keys', () => {
  it('defaults classeId and semestre to "all"', () => {
    expect(studentSuiviKeys.suivi()).toEqual(['student-suivi', 'all', 'all']);
    expect(studentSuiviKeys.suivi('c1', 2)).toEqual(['student-suivi', 'c1', 2]);
  });

  it('builds the mes-enseignements key', () => {
    expect(enseignantSuiviKeys.suivi()).toEqual(['enseignant-suivi', 'mes-enseignements']);
  });
});
