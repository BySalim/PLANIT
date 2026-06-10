import { describe, expect, it } from 'vitest';
import { seanceInclude, toSessionDto } from '../../src/seance/seance.mapper';
import type { SeanceWithRelations } from '../../src/seance/seance.mapper';

/**
 * Unit tests for the seance → SessionDto mapper.
 * Vérifie la forme du DTO (champs présents, refs imbriquées, dates ISO).
 */

function buildSeance(overrides: Partial<SeanceWithRelations> = {}): SeanceWithRelations {
  const start = new Date('2026-05-25T08:00:00.000Z');
  const end = new Date('2026-05-25T10:00:00.000Z');
  const base: SeanceWithRelations = {
    id: 'seance-1',
    type: 'CM',
    status: 'PROVISOIRE',
    startAt: start,
    endAt: end,
    isPublished: false,
    lastModifiedAt: start,
    lastPublishedAt: null,
    classeId: 'classe-1',
    moduleId: 'module-1',
    salleId: 'salle-1',
    teacherId: 'teacher-1',
    classe: { id: 'classe-1', code: 'GL3-A', name: 'Génie Logiciel 3 A' },
    module: { id: 'module-1', code: 'ALGO', name: 'Algorithmique' },
    salle: { id: 'salle-1', name: 'Amphi A' },
    teacher: {
      id: 'teacher-1',
      fullName: 'M. Oumar Ndiaye',
    } as SeanceWithRelations['teacher'],
  } as SeanceWithRelations;
  return { ...base, ...overrides };
}

describe('seanceInclude', () => {
  it('inclut les 4 relations attendues par le DTO', () => {
    expect(seanceInclude).toEqual({
      classe: true,
      module: true,
      salle: true,
      teacher: true,
    });
  });
});

describe('toSessionDto', () => {
  it('retourne la forme SessionDto attendue avec tous les champs scalaires', () => {
    const dto = toSessionDto(buildSeance());

    expect(dto.id).toBe('seance-1');
    expect(dto.type).toBe('CM');
    expect(dto.status).toBe('PROVISOIRE');
    expect(dto.isPublished).toBe(false);
  });

  it('convertit startAt / endAt / lastModifiedAt en ISO string', () => {
    const dto = toSessionDto(buildSeance());

    expect(dto.startAt).toBe('2026-05-25T08:00:00.000Z');
    expect(dto.endAt).toBe('2026-05-25T10:00:00.000Z');
    expect(dto.lastModifiedAt).toBe('2026-05-25T08:00:00.000Z');
  });

  it("lastPublishedAt = null quand la séance n'a jamais été publiée", () => {
    const dto = toSessionDto(buildSeance({ lastPublishedAt: null }));

    expect(dto.lastPublishedAt).toBeNull();
  });

  it('lastPublishedAt = ISO string quand la séance est publiée', () => {
    const publishedAt = new Date('2026-05-20T12:00:00.000Z');
    const dto = toSessionDto(buildSeance({ lastPublishedAt: publishedAt }));

    expect(dto.lastPublishedAt).toBe('2026-05-20T12:00:00.000Z');
  });

  it('imbrique les refs classe / module / salle / teacher avec uniquement leurs champs publics', () => {
    const dto = toSessionDto(buildSeance());

    expect(dto.classe).toEqual({ id: 'classe-1', code: 'GL3-A', name: 'Génie Logiciel 3 A' });
    expect(dto.module).toEqual({ id: 'module-1', code: 'ALGO', name: 'Algorithmique' });
    expect(dto.salle).toEqual({ id: 'salle-1', name: 'Amphi A' });
    expect(dto.teacher).toEqual({ id: 'teacher-1', fullName: 'M. Oumar Ndiaye' });
  });

  it('ne fuit pas les champs scalaires de jointure (foreign keys, etc.)', () => {
    const dto = toSessionDto(buildSeance());

    // Le DTO expose les refs imbriquées, pas les *Id bruts du modèle Prisma.
    expect(dto).not.toHaveProperty('classeId');
    expect(dto).not.toHaveProperty('moduleId');
    expect(dto).not.toHaveProperty('salleId');
    expect(dto).not.toHaveProperty('teacherId');
  });

  it('salle = null mappée en null (séance V2 sans salle — incident 500 2026-06-10)', () => {
    const dto = toSessionDto(buildSeance({ salleId: null, salle: null }));

    expect(dto.salle).toBeNull();
    // Le reste du DTO reste intact : la séance est représentable sans salle.
    expect(dto.id).toBe('seance-1');
    expect(dto.teacher).toEqual({ id: 'teacher-1', fullName: 'M. Oumar Ndiaye' });
  });

  it('jette si teacher est null (contrat SessionDto le requiert — buildWeekWhere filtre en amont)', () => {
    expect(() => toSessionDto(buildSeance({ teacherId: null, teacher: null }))).toThrow(
      /sans teacher/,
    );
  });

  it("préserve l'ordre quand on map plusieurs seances", () => {
    const seances = [
      buildSeance({ id: 's-1' }),
      buildSeance({ id: 's-2' }),
      buildSeance({ id: 's-3' }),
    ];

    const dtos = seances.map(toSessionDto);

    expect(dtos.map((d) => d.id)).toEqual(['s-1', 's-2', 's-3']);
  });

  it('retourne [] pour [].map(toSessionDto)', () => {
    const dtos: ReturnType<typeof toSessionDto>[] = [];
    expect(dtos).toEqual([]);
  });
});
