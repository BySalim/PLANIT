import { PrismaClient } from '@prisma/client';
import type { SessionStatus, SessionType } from '@prisma/client';

const prisma = new PrismaClient();

// PLANIT runs on Africa/Dakar time, which is UTC+0 with no DST.
// The seed therefore builds session timestamps directly in UTC: the UTC
// wall-clock equals the Dakar wall-clock. Dates are anchored to the CURRENT
// week so the planning view always shows the seed sessions ("semaine courante").

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

interface SeanceSeed {
  id: string;
  type: SessionType;
  status: SessionStatus;
  isPublished: boolean;
  dayOffset: number;
  startHour: number;
  endHour: number;
  moduleId: string;
  salleId: string;
  teacherId: string;
}

async function main(): Promise<void> {
  console.log('Seeding database (vague-01)…');

  const monday = mondayOfCurrentWeek();

  // ── Classe ────────────────────────────────────────────────────────
  const classe = await prisma.classe.upsert({
    where: { id: 'seed-classe-gl3a' },
    update: { code: 'GL3-A', name: 'Génie Logiciel 3ème année A' },
    create: { id: 'seed-classe-gl3a', code: 'GL3-A', name: 'Génie Logiciel 3ème année A' },
  });

  // ── Acteurs (vague-01 : RP, 3 enseignants, 1 étudiant — pas d'auth) ─
  const rp = {
    id: 'seed-rp',
    email: 'aminata.diallo@ism.edu.sn',
    fullName: 'Mme Aminata Diallo',
    role: 'RESPONSABLE_PROGRAMME' as const,
  };
  const teachers = [
    { id: 'seed-teacher-algo', email: 'oumar.ndiaye@ism.edu.sn', fullName: 'M. Oumar Ndiaye' },
    { id: 'seed-teacher-bdd', email: 'fatou.sall@ism.edu.sn', fullName: 'Mme Fatou Sall' },
    { id: 'seed-teacher-net', email: 'mamadou.ba@ism.edu.sn', fullName: 'M. Mamadou Ba' },
  ];
  const student = {
    id: 'seed-student',
    email: 'ibrahima.sow@ism.edu.sn',
    fullName: 'Ibrahima Sow',
  };

  await prisma.user.upsert({
    where: { id: rp.id },
    update: { email: rp.email, fullName: rp.fullName, role: rp.role },
    create: { id: rp.id, email: rp.email, fullName: rp.fullName, role: rp.role },
  });

  for (const t of teachers) {
    await prisma.user.upsert({
      where: { id: t.id },
      update: { email: t.email, fullName: t.fullName, role: 'ENSEIGNANT' },
      create: { id: t.id, email: t.email, fullName: t.fullName, role: 'ENSEIGNANT' },
    });
  }

  await prisma.user.upsert({
    where: { id: student.id },
    update: {
      email: student.email,
      fullName: student.fullName,
      role: 'ETUDIANT',
      classeId: classe.id,
    },
    create: {
      id: student.id,
      email: student.email,
      fullName: student.fullName,
      role: 'ETUDIANT',
      classeId: classe.id,
    },
  });

  // ── Modules ───────────────────────────────────────────────────────
  const modules = [
    { id: 'seed-module-algo', code: 'ALGO', name: 'Algorithmique Avancée' },
    { id: 'seed-module-bdd', code: 'BDD', name: 'Bases de Données' },
    { id: 'seed-module-net', code: 'NET', name: 'Réseaux Informatiques' },
  ];
  for (const m of modules) {
    await prisma.module.upsert({
      where: { id: m.id },
      update: { code: m.code, name: m.name },
      create: m,
    });
  }

  // ── Salles ────────────────────────────────────────────────────────
  const salles = [
    { id: 'seed-salle-amphi', name: 'Amphi A', type: 'Amphithéâtre', capacity: 120 },
    { id: 'seed-salle-201', name: 'Salle 201', type: 'Salle de cours', capacity: 30 },
    { id: 'seed-salle-labo', name: 'Labo Informatique', type: 'Laboratoire', capacity: 30 },
  ];
  for (const s of salles) {
    await prisma.salle.upsert({
      where: { id: s.id },
      update: { name: s.name, type: s.type, capacity: s.capacity },
      create: s,
    });
  }

  // ── Séances (semaine courante) ────────────────────────────────────
  const seances: SeanceSeed[] = [
    {
      id: 'seed-seance-01',
      type: 'CM',
      status: 'PUBLIE',
      isPublished: true,
      dayOffset: 0,
      startHour: 10,
      endHour: 12,
      moduleId: 'seed-module-algo',
      salleId: 'seed-salle-amphi',
      teacherId: 'seed-teacher-algo',
    },
    {
      id: 'seed-seance-02',
      type: 'TD',
      status: 'PUBLIE',
      isPublished: true,
      dayOffset: 0,
      startHour: 14,
      endHour: 16,
      moduleId: 'seed-module-algo',
      salleId: 'seed-salle-201',
      teacherId: 'seed-teacher-algo',
    },
    {
      id: 'seed-seance-03',
      type: 'TP',
      status: 'PUBLIE',
      isPublished: true,
      dayOffset: 1,
      startHour: 10,
      endHour: 12,
      moduleId: 'seed-module-bdd',
      salleId: 'seed-salle-labo',
      teacherId: 'seed-teacher-bdd',
    },
    {
      id: 'seed-seance-04',
      type: 'CM',
      status: 'PUBLIE',
      isPublished: true,
      dayOffset: 2,
      startHour: 8,
      endHour: 10,
      moduleId: 'seed-module-net',
      salleId: 'seed-salle-amphi',
      teacherId: 'seed-teacher-net',
    },
    {
      id: 'seed-seance-05',
      type: 'CM',
      status: 'VALIDE',
      isPublished: false,
      dayOffset: 3,
      startHour: 10,
      endHour: 12,
      moduleId: 'seed-module-bdd',
      salleId: 'seed-salle-amphi',
      teacherId: 'seed-teacher-bdd',
    },
    {
      id: 'seed-seance-06',
      type: 'TD',
      status: 'PROVISOIRE',
      isPublished: false,
      dayOffset: 3,
      startHour: 14,
      endHour: 16,
      moduleId: 'seed-module-net',
      salleId: 'seed-salle-201',
      teacherId: 'seed-teacher-net',
    },
  ];

  for (const s of seances) {
    const startAt = at(monday, s.dayOffset, s.startHour);
    const endAt = at(monday, s.dayOffset, s.endHour);
    const data = {
      type: s.type,
      status: s.status,
      startAt,
      endAt,
      isPublished: s.isPublished,
      lastModifiedAt: startAt,
      lastPublishedAt: s.isPublished ? startAt : null,
      classeId: classe.id,
      moduleId: s.moduleId,
      salleId: s.salleId,
      teacherId: s.teacherId,
    };
    await prisma.seance.upsert({
      where: { id: s.id },
      update: data,
      create: { id: s.id, ...data },
    });
  }

  console.log(
    `Seed complete: 1 RP, ${teachers.length} enseignants, 1 étudiant, ` +
      `1 classe, ${modules.length} modules, ${salles.length} salles, ${seances.length} séances.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
