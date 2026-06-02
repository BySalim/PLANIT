import { hash } from '@node-rs/argon2';
import { Prisma, type PrismaClient } from '@prisma/client';

// PLANIT runs on Africa/Dakar time (UTC+0, no DST). Session timestamps are
// built directly in UTC: the UTC wall-clock equals the Dakar wall-clock.
// Dates are anchored to the CURRENT week so the planning view always shows
// the seed sessions ("semaine courante").

/** Monday 00:00 (UTC) of the week containing today. */
function mondayOfCurrentWeek(): Date {
  const today = new Date();
  const dow = today.getUTCDay(); // 0 = Sunday … 6 = Saturday
  const offsetToMonday = dow === 0 ? -6 : 1 - dow;
  return new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + offsetToMonday),
  );
}

/** A timestamp on `dayOffset` days after Monday, at `hour` o'clock (Dakar = UTC). */
function at(monday: Date, dayOffset: number, hour: number): Date {
  return new Date(
    Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + dayOffset, hour),
  );
}

// argon2id profile — OWASP RFC 9106 (cf. ADR-0007 §1).
const ARGON2_OPTS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

const SEED_PASSWORD = 'Test1234!';

/**
 * Idempotently seed the vague-02 dataset (upsert-based — safe to run repeatedly).
 *
 * Schema is **hybrid** during the LOT 0 → LOT 2 window: each Seance carries
 * both V01 columns (`type` enum, `status`, `classeId` direct FK, `teacherId`
 * → User) AND V02 columns (`typeV2`, `sousType`, `enseignantId`, multi-classes
 * via `SeanceClasse`). LOT 2 V02 will refactor the API to rely on V02 fields
 * only, then drop the V01 columns in a subsequent migration.
 *
 * Shared by the Prisma seed CLI and the integration test `resetDb` helper.
 */
export async function seedDatabase(prisma: PrismaClient): Promise<void> {
  const monday = mondayOfCurrentWeek();
  const passwordHash = await hash(SEED_PASSWORD, ARGON2_OPTS);

  // ── Filières ─────────────────────────────────────────────────────────
  const filiereGlrs = await prisma.filiere.upsert({
    where: { id: 'seed-filiere-glrs' },
    update: {
      sigle: 'GLRS',
      libelle: 'Génie Logiciel Réseaux et Système',
      grade: 'LICENCE',
      isDoubleDiplome: false,
    },
    create: {
      id: 'seed-filiere-glrs',
      sigle: 'GLRS',
      libelle: 'Génie Logiciel Réseaux et Système',
      grade: 'LICENCE',
      isDoubleDiplome: false,
    },
  });

  const filiereGl = await prisma.filiere.upsert({
    where: { id: 'seed-filiere-gl' },
    update: {
      sigle: 'GL',
      libelle: 'Génie Logiciel',
      grade: 'MASTER',
      isDoubleDiplome: true,
    },
    create: {
      id: 'seed-filiere-gl',
      sigle: 'GL',
      libelle: 'Génie Logiciel',
      grade: 'MASTER',
      isDoubleDiplome: true,
    },
  });

  // ── Classes (3 classes pour démo multi-classes V2-D6) ────────────────
  const classeGl3a = await prisma.classe.upsert({
    where: { id: 'seed-classe-gl3a' },
    update: {
      code: 'GL3-A',
      name: 'Génie Logiciel 3ème année A',
      filiereId: filiereGlrs.id,
    },
    create: {
      id: 'seed-classe-gl3a',
      code: 'GL3-A',
      name: 'Génie Logiciel 3ème année A',
      filiereId: filiereGlrs.id,
    },
  });

  const classeGl3b = await prisma.classe.upsert({
    where: { id: 'seed-classe-gl3b' },
    update: {
      code: 'GL3-B',
      name: 'Génie Logiciel 3ème année B',
      filiereId: filiereGlrs.id,
    },
    create: {
      id: 'seed-classe-gl3b',
      code: 'GL3-B',
      name: 'Génie Logiciel 3ème année B',
      filiereId: filiereGlrs.id,
    },
  });

  await prisma.classe.upsert({
    where: { id: 'seed-classe-gl2a' },
    update: {
      code: 'GL2-A',
      name: 'Génie Logiciel 2ème année A',
      filiereId: filiereGlrs.id,
    },
    create: {
      id: 'seed-classe-gl2a',
      code: 'GL2-A',
      name: 'Génie Logiciel 2ème année A',
      filiereId: filiereGlrs.id,
    },
  });

  // ── Acteurs (RP, 3 enseignants, 1 étudiant — tous password "Test1234!" en argon2id) ─
  await prisma.user.upsert({
    where: { id: 'seed-rp' },
    update: {
      email: 'aminata.diallo@planit.test',
      fullName: 'Mme Aminata Diallo',
      role: 'RESPONSABLE_PROGRAMME',
      passwordHash,
    },
    create: {
      id: 'seed-rp',
      email: 'aminata.diallo@planit.test',
      fullName: 'Mme Aminata Diallo',
      role: 'RESPONSABLE_PROGRAMME',
      passwordHash,
    },
  });

  const teacherSeeds = [
    {
      id: 'seed-teacher-algo',
      email: 'oumar.ndiaye@planit.test',
      fullName: 'M. Oumar Ndiaye',
      whatsapp: '+221 77 000 00 01',
      statut: 'PERMANENT' as const,
      specialite: 'Algorithmique',
      enseignantId: 'seed-enseignant-algo',
    },
    {
      id: 'seed-teacher-bdd',
      email: 'fatou.sall@planit.test',
      fullName: 'Mme Fatou Sall',
      whatsapp: '+221 77 000 00 02',
      statut: 'PERMANENT' as const,
      specialite: 'Bases de données',
      enseignantId: 'seed-enseignant-bdd',
    },
    {
      id: 'seed-teacher-net',
      email: 'mamadou.ba@planit.test',
      fullName: 'M. Mamadou Ba',
      whatsapp: '+221 77 000 00 03',
      statut: 'VACATAIRE' as const,
      specialite: 'Réseaux',
      enseignantId: 'seed-enseignant-net',
    },
  ];

  for (const t of teacherSeeds) {
    await prisma.user.upsert({
      where: { id: t.id },
      update: {
        email: t.email,
        fullName: t.fullName,
        role: 'ENSEIGNANT',
        passwordHash,
      },
      create: {
        id: t.id,
        email: t.email,
        fullName: t.fullName,
        role: 'ENSEIGNANT',
        passwordHash,
      },
    });
    await prisma.enseignant.upsert({
      where: { id: t.enseignantId },
      update: {
        userId: t.id,
        nomComplet: t.fullName,
        emailInstitutionnel: t.email,
        whatsapp: t.whatsapp,
        statut: t.statut,
        specialite: t.specialite,
      },
      create: {
        id: t.enseignantId,
        userId: t.id,
        nomComplet: t.fullName,
        emailInstitutionnel: t.email,
        whatsapp: t.whatsapp,
        statut: t.statut,
        specialite: t.specialite,
      },
    });
  }

  await prisma.user.upsert({
    where: { id: 'seed-student' },
    update: {
      email: 'ibrahima.sow@planit.test',
      fullName: 'Ibrahima Sow',
      role: 'ETUDIANT',
      classeId: classeGl3a.id,
      passwordHash,
      matricule: 'ISM-2024-0001',
    },
    create: {
      id: 'seed-student',
      email: 'ibrahima.sow@planit.test',
      fullName: 'Ibrahima Sow',
      role: 'ETUDIANT',
      classeId: classeGl3a.id,
      passwordHash,
      matricule: 'ISM-2024-0001',
    },
  });

  // ── UE & Modules (3 UE × 2 modules — couleurs cf. vague-02-scenarios) ──
  const ues = [
    {
      id: 'seed-ue-algo',
      code: 'ALGO-UE',
      libelle: 'Algorithmique & Structures',
      color: '#3B82F6',
    },
    {
      id: 'seed-ue-data',
      code: 'DATA-UE',
      libelle: 'Données & Systèmes',
      color: '#10B981',
    },
    {
      id: 'seed-ue-net',
      code: 'NET-UE',
      libelle: 'Réseaux & Sécurité',
      color: '#F59E0B',
    },
  ];
  for (const ue of ues) {
    await prisma.uE.upsert({ where: { id: ue.id }, update: ue, create: ue });
  }

  // Hybrid schema: `name` is the V01 column, `libelle`/`color`/`ueId` are V02.
  const modules = [
    {
      id: 'seed-module-algo',
      code: 'ALGO',
      name: 'Algorithmique Avancée',
      libelle: 'Algorithmique Avancée',
      color: '#2563EB',
      ueId: 'seed-ue-algo',
    },
    {
      id: 'seed-module-dstr',
      code: 'DSTR',
      name: 'Structures de Données',
      libelle: 'Structures de Données',
      color: '#1D4ED8',
      ueId: 'seed-ue-algo',
    },
    {
      id: 'seed-module-bdd',
      code: 'BDD',
      name: 'Bases de Données',
      libelle: 'Bases de Données',
      color: '#059669',
      ueId: 'seed-ue-data',
    },
    {
      id: 'seed-module-sys',
      code: 'SYS',
      name: "Systèmes d'Exploitation",
      libelle: "Systèmes d'Exploitation",
      color: '#047857',
      ueId: 'seed-ue-data',
    },
    {
      id: 'seed-module-net',
      code: 'NET',
      name: 'Réseaux',
      libelle: 'Réseaux',
      color: '#D97706',
      ueId: 'seed-ue-net',
    },
    {
      id: 'seed-module-sec',
      code: 'SEC',
      name: 'Sécurité Informatique',
      libelle: 'Sécurité Informatique',
      color: '#B45309',
      ueId: 'seed-ue-net',
    },
  ];
  for (const mod of modules) {
    await prisma.module.upsert({ where: { id: mod.id }, update: mod, create: mod });
  }

  // ── Salles (V01 + Salle 202 pour démo multi-classes) ────────────────
  const salles = [
    { id: 'seed-salle-amphi', name: 'Amphi A', type: 'Amphithéâtre', capacity: 120 },
    { id: 'seed-salle-201', name: 'Salle 201', type: 'Salle de cours', capacity: 30 },
    { id: 'seed-salle-labo', name: 'Labo Informatique', type: 'Laboratoire', capacity: 30 },
    { id: 'seed-salle-202', name: 'Salle 202', type: 'Salle de cours', capacity: 40 },
  ];
  for (const salle of salles) {
    await prisma.salle.upsert({ where: { id: salle.id }, update: salle, create: salle });
  }

  // ── Settings (singleton) ─────────────────────────────────────────────
  await prisma.settings.upsert({
    where: { id: 'singleton' },
    update: { dayStartHour: 8, dayEndHour: 20 },
    create: { id: 'singleton', dayStartHour: 8, dayEndHour: 20 },
  });

  // ── Séances (10 séances : V01-héritées + multi-classes + évaluation + 2 drafts) ─
  // Each row carries both V01 (`type`, `status`, `classeId`, `teacherId`) and
  // V02 (`libelle`, `typeV2`, `sousType`, `enseignantId`, multi-classes via
  // SeanceClasse). LOT 2 will start consuming V02 only.
  interface SeanceSeed {
    id: string;
    libelle: string;
    // V01 enum
    type: 'CM' | 'TD' | 'TP' | 'EXAM' | 'RATTRAP' | 'DEVOIR' | 'EVENT';
    status: 'PROVISOIRE' | 'VALIDE' | 'PUBLIE';
    // V02 enums
    typeV2: 'COURS' | 'EVALUATION' | 'EVENEMENT';
    sousType: 'CM' | 'TD' | 'TP' | 'EXAMEN' | 'RATTRAPAGE' | 'DEVOIR' | null;
    isPublished: boolean;
    dayOffset: number;
    startHour: number;
    endHour: number;
    moduleId: string;
    salleId: string;
    teacherId: string; // V01 — User.id of the enseignant's User row
    enseignantId: string | null; // V02 — Enseignant.id (null for EVENEMENT with external speaker)
    intervenantNom: string | null;
    description: string | null;
    classeId: string; // V01 — primary class (kept for the legacy mapper)
    classeIds: string[]; // V02 — full N-N list, always includes classeId
  }

  const seances: SeanceSeed[] = [
    // 6 séances héritées V01 (toutes COURS publiées)
    {
      id: 'seed-seance-01',
      libelle: 'Algorithmique Avancée',
      type: 'CM',
      status: 'PUBLIE',
      typeV2: 'COURS',
      sousType: 'CM',
      isPublished: true,
      dayOffset: 0,
      startHour: 10,
      endHour: 12,
      moduleId: 'seed-module-algo',
      salleId: 'seed-salle-amphi',
      teacherId: 'seed-teacher-algo',
      enseignantId: 'seed-enseignant-algo',
      intervenantNom: null,
      description: null,
      classeId: classeGl3a.id,
      classeIds: [classeGl3a.id],
    },
    {
      id: 'seed-seance-02',
      libelle: 'Algorithmique Avancée — TD',
      type: 'TD',
      status: 'PUBLIE',
      typeV2: 'COURS',
      sousType: 'TD',
      isPublished: true,
      dayOffset: 0,
      startHour: 14,
      endHour: 16,
      moduleId: 'seed-module-algo',
      salleId: 'seed-salle-201',
      teacherId: 'seed-teacher-algo',
      enseignantId: 'seed-enseignant-algo',
      intervenantNom: null,
      description: null,
      classeId: classeGl3a.id,
      classeIds: [classeGl3a.id],
    },
    {
      id: 'seed-seance-03',
      libelle: 'Bases de Données — TP',
      type: 'TP',
      status: 'PUBLIE',
      typeV2: 'COURS',
      sousType: 'TP',
      isPublished: true,
      dayOffset: 1,
      startHour: 10,
      endHour: 12,
      moduleId: 'seed-module-bdd',
      salleId: 'seed-salle-labo',
      teacherId: 'seed-teacher-bdd',
      enseignantId: 'seed-enseignant-bdd',
      intervenantNom: null,
      description: null,
      classeId: classeGl3a.id,
      classeIds: [classeGl3a.id],
    },
    {
      id: 'seed-seance-04',
      libelle: 'Réseaux — CM',
      type: 'CM',
      status: 'PUBLIE',
      typeV2: 'COURS',
      sousType: 'CM',
      isPublished: true,
      dayOffset: 2,
      startHour: 8,
      endHour: 10,
      moduleId: 'seed-module-net',
      salleId: 'seed-salle-amphi',
      teacherId: 'seed-teacher-net',
      enseignantId: 'seed-enseignant-net',
      intervenantNom: null,
      description: null,
      classeId: classeGl3a.id,
      classeIds: [classeGl3a.id],
    },
    {
      id: 'seed-seance-05',
      libelle: 'Structures de Données — CM',
      type: 'CM',
      status: 'PUBLIE',
      typeV2: 'COURS',
      sousType: 'CM',
      isPublished: true,
      dayOffset: 2,
      startHour: 14,
      endHour: 16,
      moduleId: 'seed-module-dstr',
      salleId: 'seed-salle-201',
      teacherId: 'seed-teacher-algo',
      enseignantId: 'seed-enseignant-algo',
      intervenantNom: null,
      description: null,
      classeId: classeGl3a.id,
      classeIds: [classeGl3a.id],
    },
    {
      id: 'seed-seance-06',
      libelle: 'Systèmes — TP',
      type: 'TP',
      status: 'PUBLIE',
      typeV2: 'COURS',
      sousType: 'TP',
      isPublished: true,
      dayOffset: 3,
      startHour: 10,
      endHour: 12,
      moduleId: 'seed-module-sys',
      salleId: 'seed-salle-labo',
      teacherId: 'seed-teacher-bdd',
      enseignantId: 'seed-enseignant-bdd',
      intervenantNom: null,
      description: null,
      classeId: classeGl3a.id,
      classeIds: [classeGl3a.id],
    },
    // 1 séance multi-classes : Conférence (Événement), publiée
    {
      id: 'seed-seance-07-conf',
      libelle: 'Conférence IA — Tendances 2026',
      type: 'EVENT',
      status: 'PUBLIE',
      typeV2: 'EVENEMENT',
      sousType: null,
      isPublished: true,
      dayOffset: 4,
      startHour: 14,
      endHour: 16,
      moduleId: 'seed-module-algo', // placeholder V01 — V02 will treat as no module
      salleId: 'seed-salle-amphi',
      teacherId: 'seed-teacher-algo', // placeholder V01 — V02 reads intervenantNom
      enseignantId: null,
      intervenantNom: 'Dr. Mamadou Faye',
      description: "Conférence inter-classes — état de l'art IA appliquée",
      classeId: classeGl3a.id,
      classeIds: [classeGl3a.id, classeGl3b.id],
    },
    // 1 séance Évaluation, publiée
    {
      id: 'seed-seance-08-eval',
      libelle: 'Examen ALGO',
      type: 'EXAM',
      status: 'PUBLIE',
      typeV2: 'EVALUATION',
      sousType: 'EXAMEN',
      isPublished: true,
      dayOffset: 4,
      startHour: 8,
      endHour: 10,
      moduleId: 'seed-module-algo',
      salleId: 'seed-salle-amphi',
      teacherId: 'seed-teacher-algo',
      enseignantId: 'seed-enseignant-algo',
      intervenantNom: null,
      description: null,
      classeId: classeGl3a.id,
      classeIds: [classeGl3a.id],
    },
    // 2 séances non publiées (compteur « Publier les modifications » au démarrage)
    {
      id: 'seed-seance-09-draft',
      libelle: 'Réseaux — TD',
      type: 'TD',
      status: 'VALIDE',
      typeV2: 'COURS',
      sousType: 'TD',
      isPublished: false,
      dayOffset: 3,
      startHour: 14,
      endHour: 16,
      moduleId: 'seed-module-net',
      salleId: 'seed-salle-202',
      teacherId: 'seed-teacher-net',
      enseignantId: 'seed-enseignant-net',
      intervenantNom: null,
      description: null,
      classeId: classeGl3b.id,
      classeIds: [classeGl3b.id],
    },
    {
      id: 'seed-seance-10-draft',
      libelle: 'Sécurité Informatique — CM',
      type: 'CM',
      status: 'PROVISOIRE',
      typeV2: 'COURS',
      sousType: 'CM',
      isPublished: false,
      dayOffset: 4,
      startHour: 10,
      endHour: 12,
      moduleId: 'seed-module-sec',
      salleId: 'seed-salle-201',
      teacherId: 'seed-teacher-net',
      enseignantId: 'seed-enseignant-net',
      intervenantNom: null,
      description: null,
      classeId: classeGl3a.id,
      classeIds: [classeGl3a.id],
    },
  ];

  for (const s of seances) {
    const startAt = at(monday, s.dayOffset, s.startHour);
    const endAt = at(monday, s.dayOffset, s.endHour);

    // V02 snapshot for published rows (cf. ADR-0008 §3). Drafts: null.
    const publishedSnapshot = s.isPublished
      ? {
          libelle: s.libelle,
          type: s.typeV2,
          sousType: s.sousType,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          moduleId: s.moduleId,
          enseignantId: s.enseignantId,
          salleId: s.salleId,
          intervenantNom: s.intervenantNom,
          description: s.description,
          classeIds: [...s.classeIds].sort(),
        }
      : null;

    const data: Prisma.SeanceUncheckedCreateInput = {
      // V01 columns
      type: s.type,
      status: s.status,
      classeId: s.classeId,
      teacherId: s.teacherId,
      // V02 columns
      libelle: s.libelle,
      typeV2: s.typeV2,
      sousType: s.sousType,
      intervenantNom: s.intervenantNom,
      description: s.description,
      publishedSnapshot: publishedSnapshot ?? Prisma.DbNull,
      hasUnpublishedChanges: !s.isPublished,
      enseignantId: s.enseignantId,
      // Shared
      startAt,
      endAt,
      isPublished: s.isPublished,
      lastModifiedAt: startAt,
      lastPublishedAt: s.isPublished ? startAt : null,
      moduleId: s.moduleId,
      salleId: s.salleId,
    };

    await prisma.seance.upsert({
      where: { id: s.id },
      update: data,
      create: { id: s.id, ...data },
    });

    // V02 N-N link (additive). Clear then re-add for idempotency.
    await prisma.seanceClasse.deleteMany({ where: { seanceId: s.id } });
    for (const classeId of s.classeIds) {
      await prisma.seanceClasse.create({
        data: { seanceId: s.id, classeId },
      });
    }
  }

  await seedVague03(prisma, {
    passwordHash,
    filiereGlrsId: filiereGlrs.id,
    filiereGlId: filiereGl.id,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Vague 03 — Référentiel académique (ADR-0010 / 0011 / 0012, LOT 0.7)
// ─────────────────────────────────────────────────────────────────────────────
// Étend la seed V02 : 3 années académiques, AC + 2ᵉ RP, étudiants
// supplémentaires, maquettes versionnées + modules, formations, classes
// (formationId + capaciteMax) + classe MASTER double-diplôme, salles
// rpResponsableId, inscriptions (dont 1 étudiant double-diplôme + 1 historique),
// suivi des modules. Idempotent (upsert sur id fixes). Cf. vague-03-scenarios.md.
// ─────────────────────────────────────────────────────────────────────────────

interface SeedV03Ctx {
  passwordHash: string;
  filiereGlrsId: string;
  filiereGlId: string;
}

/** Heures CM/TD/TP/TPE saisies (VHE/VHT dérivés à l'affichage — V3-D3). */
interface MaquetteModuleSeed {
  moduleId: string;
  semestre: number;
  cm: number;
  td: number;
  tp: number;
  tpe: number;
}

async function seedVague03(
  prisma: PrismaClient,
  { passwordHash, filiereGlrsId, filiereGlId }: SeedV03Ctx,
): Promise<void> {
  // ── Années académiques (V3-D1 — une seule EN_COURS, garantie en base) ──
  const annees = [
    {
      id: 'seed-annee-2024',
      libelle: '2024-2025',
      debut: new Date(Date.UTC(2024, 8, 1)),
      fin: new Date(Date.UTC(2025, 7, 31)),
      etat: 'CLOTUREE' as const,
    },
    {
      id: 'seed-annee-2025',
      libelle: '2025-2026',
      debut: new Date(Date.UTC(2025, 8, 1)),
      fin: new Date(Date.UTC(2026, 7, 31)),
      etat: 'EN_COURS' as const,
    },
    {
      id: 'seed-annee-2026',
      libelle: '2026-2027',
      debut: new Date(Date.UTC(2026, 8, 1)),
      fin: new Date(Date.UTC(2027, 7, 31)),
      etat: 'PLANIFIEE' as const,
    },
  ];
  for (const a of annees) {
    await prisma.anneeAcademique.upsert({ where: { id: a.id }, update: a, create: a });
  }
  const ANNEE_2024 = 'seed-annee-2024';
  const ANNEE_2025 = 'seed-annee-2025'; // année courante

  // ── 2ᵉ RP (responsable du Labo, démo filtrage AC) + AC rattaché au RP1 ──
  await prisma.user.upsert({
    where: { id: 'seed-rp2' },
    update: {
      email: 'cheikh.diop@planit.test',
      fullName: 'M. Cheikh Diop',
      role: 'RESPONSABLE_PROGRAMME',
      passwordHash,
    },
    create: {
      id: 'seed-rp2',
      email: 'cheikh.diop@planit.test',
      fullName: 'M. Cheikh Diop',
      role: 'RESPONSABLE_PROGRAMME',
      passwordHash,
    },
  });

  await prisma.user.upsert({
    where: { id: 'seed-ac' },
    update: {
      email: 'awa.toure@planit.test',
      fullName: 'Mme Awa Touré',
      role: 'ASSISTANT_PROGRAMME',
      managerRpId: 'seed-rp', // Aminata Diallo (RP1)
      passwordHash,
    },
    create: {
      id: 'seed-ac',
      email: 'awa.toure@planit.test',
      fullName: 'Mme Awa Touré',
      role: 'ASSISTANT_PROGRAMME',
      managerRpId: 'seed-rp',
      passwordHash,
    },
  });

  // ── Étudiants supplémentaires (~6 au total avec seed-student) ──────────
  // `classeId` (transition) = classe courante 2025-2026 ; null si non inscrit
  // cette année. La source de vérité reste `Inscription` (ADR-0011).
  const students = [
    {
      id: 'seed-student-ndoye',
      email: 'awa.ndoye@planit.test',
      fullName: 'Awa Ndoye',
      matricule: 'ISM-2024-0002',
      classeId: 'seed-classe-gl3a',
    },
    {
      id: 'seed-student-fall',
      email: 'moussa.fall@planit.test',
      fullName: 'Moussa Fall',
      matricule: 'ISM-2024-0003',
      classeId: null, // non inscrit cette année (démo « email existant »)
    },
    {
      id: 'seed-student-diop',
      email: 'bineta.diop@planit.test',
      fullName: 'Bineta Diop',
      matricule: 'ISM-2024-0004',
      classeId: null,
    },
    {
      id: 'seed-student-sarr',
      email: 'cheikh.sarr@planit.test',
      fullName: 'Cheikh Sarr',
      matricule: 'ISM-2024-0005',
      classeId: null,
    },
    {
      id: 'seed-student-dd',
      email: 'khadija.ndiaye@planit.test',
      fullName: 'Khadija Ndiaye',
      matricule: 'ISM-2024-0006',
      classeId: 'seed-classe-gl3a', // double-diplôme : GL3-A (non-DD) + GLM1-A (DD)
    },
  ];
  for (const s of students) {
    await prisma.user.upsert({
      where: { id: s.id },
      update: {
        email: s.email,
        fullName: s.fullName,
        role: 'ETUDIANT',
        matricule: s.matricule,
        classeId: s.classeId,
        passwordHash,
      },
      create: {
        id: s.id,
        email: s.email,
        fullName: s.fullName,
        role: 'ETUDIANT',
        matricule: s.matricule,
        classeId: s.classeId,
        passwordHash,
      },
    });
  }

  // ── Maquettes + versions + modules (V3-D2/D3) ─────────────────────────
  // GLRS L3 : versions 2024 + 2025 (immutabilité ; SEC absent → ajoutable en
  //           « composer » sans toucher 2024). GL3-A/B suivent la version 2025.
  // GLRS L2 : versions 2024 + 2025 (historique d'inscription + GL2-A 2025).
  // GLRS L1 : version 2024 SEULEMENT → bouton « Renouveler » visible (démo).
  // GL  M1  : version 2025 (formation MASTER double-diplôme).
  const maquettes = [
    {
      id: 'seed-maq-glrs-l3',
      nom: 'Maquette GLRS L3',
      filiereId: filiereGlrsId,
      niveau: 'L3' as const,
    },
    {
      id: 'seed-maq-glrs-l2',
      nom: 'Maquette GLRS L2',
      filiereId: filiereGlrsId,
      niveau: 'L2' as const,
    },
    {
      id: 'seed-maq-glrs-l1',
      nom: 'Maquette GLRS L1',
      filiereId: filiereGlrsId,
      niveau: 'L1' as const,
    },
    { id: 'seed-maq-gl-m1', nom: 'Maquette GL M1', filiereId: filiereGlId, niveau: 'M1' as const },
  ];
  for (const m of maquettes) {
    await prisma.maquette.upsert({ where: { id: m.id }, update: m, create: m });
  }

  const versions = [
    { id: 'seed-maqv-glrs-l3-2024', maquetteId: 'seed-maq-glrs-l3', anneeAcademiqueId: ANNEE_2024 },
    { id: 'seed-maqv-glrs-l3-2025', maquetteId: 'seed-maq-glrs-l3', anneeAcademiqueId: ANNEE_2025 },
    { id: 'seed-maqv-glrs-l2-2024', maquetteId: 'seed-maq-glrs-l2', anneeAcademiqueId: ANNEE_2024 },
    { id: 'seed-maqv-glrs-l2-2025', maquetteId: 'seed-maq-glrs-l2', anneeAcademiqueId: ANNEE_2025 },
    { id: 'seed-maqv-glrs-l1-2024', maquetteId: 'seed-maq-glrs-l1', anneeAcademiqueId: ANNEE_2024 },
    { id: 'seed-maqv-gl-m1-2025', maquetteId: 'seed-maq-gl-m1', anneeAcademiqueId: ANNEE_2025 },
  ];
  for (const v of versions) {
    await prisma.maquetteVersion.upsert({ where: { id: v.id }, update: v, create: v });
  }

  // GLRS L3 : 5 modules (SEC volontairement absent — ajoutable en composer).
  const glrsL3Modules: MaquetteModuleSeed[] = [
    { moduleId: 'seed-module-algo', semestre: 1, cm: 20, td: 10, tp: 6, tpe: 14 },
    { moduleId: 'seed-module-dstr', semestre: 1, cm: 16, td: 8, tp: 8, tpe: 10 },
    { moduleId: 'seed-module-bdd', semestre: 1, cm: 18, td: 6, tp: 12, tpe: 12 },
    { moduleId: 'seed-module-sys', semestre: 2, cm: 20, td: 0, tp: 16, tpe: 12 },
    { moduleId: 'seed-module-net', semestre: 2, cm: 16, td: 8, tp: 8, tpe: 10 },
  ];
  // GLRS L2 : 3 modules. GL M1 : 2 modules.
  const glrsL2Modules: MaquetteModuleSeed[] = [
    { moduleId: 'seed-module-algo', semestre: 1, cm: 24, td: 12, tp: 8, tpe: 16 },
    { moduleId: 'seed-module-dstr', semestre: 1, cm: 18, td: 10, tp: 8, tpe: 12 },
    { moduleId: 'seed-module-bdd', semestre: 2, cm: 20, td: 8, tp: 12, tpe: 14 },
  ];
  const glM1Modules: MaquetteModuleSeed[] = [
    { moduleId: 'seed-module-sec', semestre: 1, cm: 22, td: 6, tp: 14, tpe: 18 },
    { moduleId: 'seed-module-net', semestre: 1, cm: 18, td: 8, tp: 10, tpe: 12 },
  ];

  const versionModules: Array<{ versionId: string; mods: MaquetteModuleSeed[] }> = [
    { versionId: 'seed-maqv-glrs-l3-2024', mods: glrsL3Modules },
    { versionId: 'seed-maqv-glrs-l3-2025', mods: glrsL3Modules },
    { versionId: 'seed-maqv-glrs-l2-2024', mods: glrsL2Modules },
    { versionId: 'seed-maqv-glrs-l2-2025', mods: glrsL2Modules },
    { versionId: 'seed-maqv-glrs-l1-2024', mods: glrsL2Modules },
    { versionId: 'seed-maqv-gl-m1-2025', mods: glM1Modules },
  ];
  for (const { versionId, mods } of versionModules) {
    for (const mm of mods) {
      const id = `seed-mm-${versionId}-${mm.moduleId}`;
      const data = {
        maquetteVersionId: versionId,
        moduleId: mm.moduleId,
        semestre: mm.semestre,
        heuresCM: mm.cm,
        heuresTD: mm.td,
        heuresTP: mm.tp,
        heuresTPE: mm.tpe,
      };
      await prisma.maquetteModule.upsert({ where: { id }, update: data, create: { id, ...data } });
    }
  }

  // ── Formations (V3-D4 — instances annuelles d'une filière) ────────────
  const formations = [
    {
      id: 'seed-form-glrs-l3',
      code: 'GLRS-L3-2025',
      niveau: 'L3' as const,
      filiereId: filiereGlrsId,
      anneeAcademiqueId: ANNEE_2025,
      maquetteVersionId: 'seed-maqv-glrs-l3-2025',
      isDoubleDiplome: false,
    },
    {
      id: 'seed-form-glrs-l2-2025',
      code: 'GLRS-L2-2025',
      niveau: 'L2' as const,
      filiereId: filiereGlrsId,
      anneeAcademiqueId: ANNEE_2025,
      maquetteVersionId: 'seed-maqv-glrs-l2-2025',
      isDoubleDiplome: false,
    },
    {
      id: 'seed-form-glrs-l2-2024',
      code: 'GLRS-L2-2024',
      niveau: 'L2' as const,
      filiereId: filiereGlrsId,
      anneeAcademiqueId: ANNEE_2024,
      maquetteVersionId: 'seed-maqv-glrs-l2-2024',
      isDoubleDiplome: false,
    },
    {
      id: 'seed-form-gl-m1',
      code: 'GL-M1-2025',
      niveau: 'M1' as const,
      filiereId: filiereGlId,
      anneeAcademiqueId: ANNEE_2025,
      maquetteVersionId: 'seed-maqv-gl-m1-2025',
      isDoubleDiplome: true, // formation MASTER double-diplôme
    },
  ];
  for (const f of formations) {
    await prisma.formation.upsert({ where: { id: f.id }, update: f, create: f });
  }

  // ── Classes : rattachement formation + capaciteMax (refonte V3-D5) ────
  // Met à jour les classes V02 existantes + ajoute la classe historique 2024
  // (pour l'historique d'Ibrahima) et la classe MASTER GL double-diplôme.
  const classeUpdates = [
    { id: 'seed-classe-gl3a', formationId: 'seed-form-glrs-l3', capaciteMax: 30 },
    { id: 'seed-classe-gl3b', formationId: 'seed-form-glrs-l3', capaciteMax: 30 },
    { id: 'seed-classe-gl2a', formationId: 'seed-form-glrs-l2-2025', capaciteMax: 35 },
  ];
  for (const c of classeUpdates) {
    await prisma.classe.update({
      where: { id: c.id },
      data: { formationId: c.formationId, capaciteMax: c.capaciteMax },
    });
  }

  const newClasses = [
    {
      id: 'seed-classe-gl2a-2024',
      code: 'GL2A-2024',
      name: 'Génie Logiciel 2ème année A (2024-2025)',
      filiereId: filiereGlrsId,
      formationId: 'seed-form-glrs-l2-2024',
      capaciteMax: 35,
    },
    {
      id: 'seed-classe-glm1a',
      code: 'GLM1-A',
      name: 'Master Génie Logiciel 1 — A',
      filiereId: filiereGlId,
      formationId: 'seed-form-gl-m1',
      capaciteMax: 25,
    },
  ];
  for (const c of newClasses) {
    await prisma.classe.upsert({ where: { id: c.id }, update: c, create: c });
  }

  // ── Salles : RP responsable (V3-D10 — Labo au RP2 pour le filtrage AC) ─
  const salleResponsables: Array<{ id: string; rpResponsableId: string }> = [
    { id: 'seed-salle-amphi', rpResponsableId: 'seed-rp' },
    { id: 'seed-salle-201', rpResponsableId: 'seed-rp' },
    { id: 'seed-salle-202', rpResponsableId: 'seed-rp' },
    { id: 'seed-salle-labo', rpResponsableId: 'seed-rp2' }, // hors périmètre AC
  ];
  for (const s of salleResponsables) {
    await prisma.salle.update({
      where: { id: s.id },
      data: { rpResponsableId: s.rpResponsableId },
    });
  }

  // ── AC ↔ classes assignées (V3-D9) : Awa Touré assignée à GL3-A ───────
  await prisma.assistantClasse.upsert({
    where: { acId_classeId: { acId: 'seed-ac', classeId: 'seed-classe-gl3a' } },
    update: {},
    create: { acId: 'seed-ac', classeId: 'seed-classe-gl3a' },
  });

  // ── Inscriptions (V3-D7 — règle double-diplôme garantie en base) ──────
  // isDoubleDiplome dénormalisé depuis la formation de la classe.
  const inscriptions = [
    // Ibrahima Sow — historique : GL2-A (2024-2025) puis GL3-A (2025-2026)
    {
      id: 'seed-insc-ibrahima-2024',
      etudiantId: 'seed-student',
      classeId: 'seed-classe-gl2a-2024',
      anneeAcademiqueId: ANNEE_2024,
      isDoubleDiplome: false,
    },
    {
      id: 'seed-insc-ibrahima-2025',
      etudiantId: 'seed-student',
      classeId: 'seed-classe-gl3a',
      anneeAcademiqueId: ANNEE_2025,
      isDoubleDiplome: false,
    },
    // Awa Ndoye — GL3-A (2025-2026)
    {
      id: 'seed-insc-ndoye-2025',
      etudiantId: 'seed-student-ndoye',
      classeId: 'seed-classe-gl3a',
      anneeAcademiqueId: ANNEE_2025,
      isDoubleDiplome: false,
    },
    // Khadija Ndiaye — double-diplôme : GL3-A (non-DD) + GLM1-A (DD), même année
    {
      id: 'seed-insc-dd-glrs',
      etudiantId: 'seed-student-dd',
      classeId: 'seed-classe-gl3a',
      anneeAcademiqueId: ANNEE_2025,
      isDoubleDiplome: false,
    },
    {
      id: 'seed-insc-dd-master',
      etudiantId: 'seed-student-dd',
      classeId: 'seed-classe-glm1a',
      anneeAcademiqueId: ANNEE_2025,
      isDoubleDiplome: true,
    },
  ];
  for (const i of inscriptions) {
    await prisma.inscription.upsert({ where: { id: i.id }, update: i, create: i });
  }

  // ── Suivi des modules (V3-D8) : 1 par module de la version suivie ─────
  // GL3-A et GL3-B suivent la version GLRS L3 2025 (5 modules). estTermine =
  // ALGO terminé pour GL3-A (démo « >95 % terminé »), reste en cours.
  const suiviClasses = ['seed-classe-gl3a', 'seed-classe-gl3b'];
  for (const classeId of suiviClasses) {
    for (const mm of glrsL3Modules) {
      const estTermine = classeId === 'seed-classe-gl3a' && mm.moduleId === 'seed-module-algo';
      await prisma.suiviModule.upsert({
        where: { classeId_moduleId: { classeId, moduleId: mm.moduleId } },
        update: { estTermine, termineAt: estTermine ? new Date() : null },
        create: {
          classeId,
          moduleId: mm.moduleId,
          estTermine,
          termineAt: estTermine ? new Date() : null,
        },
      });
    }
  }
}
