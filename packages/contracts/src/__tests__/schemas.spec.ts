import { describe, expect, it } from 'vitest';
import {
  createAnneeAcademiqueSchema,
  createSessionV2Schema,
  createUeSchema,
  inscriptionRequestSchema,
  loginSchema,
  roleSchema,
  salleSchema,
  sessionSchema,
  suiviModuleQuerySchema,
  ueSchema,
} from '../index';

// Contracts are mostly declarative Zod schemas — these tests exercise the
// branches that carry real logic: refines, discriminated unions, coercions
// and the hex-color / email regexes.

describe('auth schemas', () => {
  it('loginSchema accepts a valid email + password', () => {
    expect(loginSchema.parse({ email: 'a@b.com', password: 'longenough' })).toEqual({
      email: 'a@b.com',
      password: 'longenough',
    });
  });

  it('loginSchema rejects a short password and a bad email', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: 'short' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'nope', password: 'longenough' }).success).toBe(false);
  });

  it('roleSchema rejects an unknown role', () => {
    expect(roleSchema.safeParse('RESPONSABLE_PROGRAMME').success).toBe(true);
    expect(roleSchema.safeParse('WIZARD').success).toBe(false);
  });
});

describe('entities — hex color', () => {
  it('createUeSchema accepts 3 and 6 digit hex, rejects garbage', () => {
    expect(createUeSchema.safeParse({ code: 'INF', libelle: 'Info', color: '#abc' }).success).toBe(
      true,
    );
    expect(
      createUeSchema.safeParse({ code: 'INF', libelle: 'Info', color: '#3B82F6' }).success,
    ).toBe(true);
    expect(createUeSchema.safeParse({ code: 'INF', libelle: 'Info', color: 'red' }).success).toBe(
      false,
    );
  });

  it('ueSchema covers both lite (moduleCount) and full (modules) modes', () => {
    const lite = ueSchema.parse({
      id: '1',
      code: 'INF',
      libelle: 'Info',
      color: '#abc',
      moduleCount: 3,
    });
    expect(lite.modules).toBeUndefined();
    const full = ueSchema.parse({
      id: '1',
      code: 'INF',
      libelle: 'Info',
      color: '#abc',
      modules: [{ id: 'm1', code: 'M1', libelle: 'Mod', color: '#fff', ueId: '1' }],
    });
    expect(full.modules).toHaveLength(1);
  });
});

describe('planning — sessionSchema salle nullable', () => {
  const baseSession = {
    id: 's-1',
    type: 'CM',
    status: 'PROVISOIRE',
    startAt: '2026-06-09T08:00:00.000Z',
    endAt: '2026-06-09T10:00:00.000Z',
    isPublished: true,
    lastModifiedAt: '2026-06-09T08:00:00.000Z',
    lastPublishedAt: null,
    classe: { id: 'c-1', code: 'GL3', name: 'GL3 A' },
    module: { id: 'm-1', code: 'ALGO', name: 'Algorithmique' },
    teacher: { id: 't-1', fullName: 'M. Ba' },
  };

  it('accepte salle = null (séance V2 sans salle — fix 500 V1, 2026-06-10)', () => {
    expect(sessionSchema.safeParse({ ...baseSession, salle: null }).success).toBe(true);
  });

  it('accepte toujours une salle renseignée', () => {
    const parsed = sessionSchema.safeParse({
      ...baseSession,
      salle: { id: 'sa-1', name: 'Amphi A' },
    });
    expect(parsed.success).toBe(true);
  });
});

describe('academic — createAnneeAcademiqueSchema refine', () => {
  const base = { libelle: '2025-2026', debut: '2025-09-01T00:00:00.000Z' };

  it('passes when fin > debut and defaults etat to PLANIFIEE', () => {
    const parsed = createAnneeAcademiqueSchema.parse({
      ...base,
      fin: '2026-06-30T00:00:00.000Z',
    });
    expect(parsed.etat).toBe('PLANIFIEE');
  });

  it('fails when fin <= debut (refine branch)', () => {
    const res = createAnneeAcademiqueSchema.safeParse({
      ...base,
      fin: '2024-06-30T00:00:00.000Z',
    });
    expect(res.success).toBe(false);
  });
});

describe('academic — suiviModuleQuerySchema coercion', () => {
  it('coerces semestre from string and validates statut enum', () => {
    const parsed = suiviModuleQuerySchema.parse({ semestre: '2', statut: 'termine' });
    expect(parsed.semestre).toBe(2);
    expect(suiviModuleQuerySchema.safeParse({ statut: 'bogus' }).success).toBe(false);
  });
});

describe('academic — salle nullable rpResponsable', () => {
  it('accepts a null rpResponsable', () => {
    const parsed = salleSchema.parse({
      id: 's1',
      name: 'Amphi A',
      type: 'Amphi',
      capacity: 120,
      rpResponsable: null,
    });
    expect(parsed.rpResponsable).toBeNull();
  });
});

describe('inscriptionRequestSchema — discriminated union on mode', () => {
  it('accepts mode=existant (email only)', () => {
    expect(inscriptionRequestSchema.safeParse({ mode: 'existant', email: 'a@b.com' }).success).toBe(
      true,
    );
  });

  it('accepts mode=nouveau with nomComplet + matricule', () => {
    expect(
      inscriptionRequestSchema.safeParse({
        mode: 'nouveau',
        email: 'a@b.com',
        nomComplet: 'Awa Sow',
        matricule: 'M-001',
      }).success,
    ).toBe(true);
  });

  it('rejects mode=nouveau missing matricule, and an unknown mode', () => {
    expect(
      inscriptionRequestSchema.safeParse({ mode: 'nouveau', email: 'a@b.com', nomComplet: 'X' })
        .success,
    ).toBe(false);
    expect(inscriptionRequestSchema.safeParse({ mode: 'ghost', email: 'a@b.com' }).success).toBe(
      false,
    );
  });
});

describe('createSessionV2Schema — discriminated union on type', () => {
  const base = {
    libelle: 'Algo',
    startAt: '2026-01-05T08:00:00.000Z',
    endAt: '2026-01-05T10:00:00.000Z',
    classeIds: ['c1'],
  };

  it('accepts a COURS with module + enseignant', () => {
    expect(
      createSessionV2Schema.safeParse({
        ...base,
        type: 'COURS',
        sousType: 'CM',
        moduleId: 'm1',
        enseignantId: 'e1',
      }).success,
    ).toBe(true);
  });

  it('accepts an EVALUATION (sousType required)', () => {
    expect(
      createSessionV2Schema.safeParse({
        ...base,
        type: 'EVALUATION',
        sousType: 'EXAMEN',
        moduleId: 'm1',
        enseignantId: 'e1',
      }).success,
    ).toBe(true);
    // EVALUATION without sousType → rejected.
    expect(
      createSessionV2Schema.safeParse({
        ...base,
        type: 'EVALUATION',
        moduleId: 'm1',
        enseignantId: 'e1',
      }).success,
    ).toBe(false);
  });

  it('accepts an EVENEMENT with intervenantNom and no module', () => {
    expect(
      createSessionV2Schema.safeParse({
        ...base,
        type: 'EVENEMENT',
        intervenantNom: 'Conférencier',
      }).success,
    ).toBe(true);
  });

  it('rejects an empty classeIds array', () => {
    expect(
      createSessionV2Schema.safeParse({
        ...base,
        classeIds: [],
        type: 'COURS',
        moduleId: 'm1',
        enseignantId: 'e1',
      }).success,
    ).toBe(false);
  });
});
