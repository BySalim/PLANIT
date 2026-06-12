import { hash } from '@node-rs/argon2';
import { PrismaClient } from '@prisma/client';

/**
 * Bootstrap PROD one-off — crée les comptes **réels** initiaux (1 RP + 1 AC +
 * 1 enseignant + 1 étudiant) sur une base de production VIDE (V04 LOT 8.5,
 * ADR-0017). AUCUNE donnée de démo (prod sans seed, V4-D11). Idempotent :
 * upsert par email → re-jouer le script RÉINITIALISE les mots de passe aux
 * valeurs de l'environnement (chemin de reset « gros grain » ; pour un seul
 * compte → `reset-password.ts`).
 *
 * Exécution PROD (box Hetzner, image runtime → JS compilé, pas de ts-node) :
 *   docker compose --env-file /opt/planit/.env.prod -f infra/docker-compose.prod.yml \
 *     run --rm --env-file /opt/planit/bootstrap.env backend \
 *     node dist/scripts/bootstrap-prod.js
 *
 * Les identifiants sont lus de l'ENVIRONNEMENT (jamais commités ; `bootstrap.env`
 * gitignored, supprimé après usage). Cf. docs/runbooks/go-live-prod.md.
 */

// argon2id — profil OWASP RFC 9106 (cf. ADR-0007 §1, aligné sur la seed).
const ARGON2_OPTS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

// Mots de passe par défaut connus → refusés en prod (V4-D16 : pas de mdp défaut en ligne).
const WEAK_PASSWORDS = new Set(['test1234!', 'changeme', 'password', 'planit', 'admin', 'azerty']);

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') {
    throw new Error(`Variable d'environnement requise manquante : ${name}`);
  }
  return value.trim();
}

function optionalEnv(name: string): string | null {
  const value = process.env[name];
  return value === undefined || value.trim() === '' ? null : value.trim();
}

function assertStrongPassword(label: string, password: string): void {
  if (password.length < 12) {
    throw new Error(`${label} : mot de passe trop court (≥ 12 caractères requis en prod).`);
  }
  if (WEAK_PASSWORDS.has(password.toLowerCase())) {
    throw new Error(`${label} : mot de passe trop faible (valeur par défaut interdite, V4-D16).`);
  }
}

function readEnseignantStatut(): 'PERMANENT' | 'VACATAIRE' {
  const raw = optionalEnv('BOOTSTRAP_ENS_STATUT') ?? 'PERMANENT';
  if (raw !== 'PERMANENT' && raw !== 'VACATAIRE') {
    throw new Error(`BOOTSTRAP_ENS_STATUT invalide : ${raw} (attendu PERMANENT | VACATAIRE).`);
  }
  return raw;
}

async function main(): Promise<void> {
  // ── Lecture + validation AVANT toute écriture (fail-fast) ──────────────────
  const rp = {
    email: requireEnv('BOOTSTRAP_RP_EMAIL').toLowerCase(),
    fullName: requireEnv('BOOTSTRAP_RP_NAME'),
    password: requireEnv('BOOTSTRAP_RP_PASSWORD'),
  };
  const ac = {
    email: requireEnv('BOOTSTRAP_AC_EMAIL').toLowerCase(),
    fullName: requireEnv('BOOTSTRAP_AC_NAME'),
    password: requireEnv('BOOTSTRAP_AC_PASSWORD'),
  };
  const ens = {
    email: requireEnv('BOOTSTRAP_ENS_EMAIL').toLowerCase(),
    fullName: requireEnv('BOOTSTRAP_ENS_NAME'),
    password: requireEnv('BOOTSTRAP_ENS_PASSWORD'),
    specialite: optionalEnv('BOOTSTRAP_ENS_SPECIALITE') ?? 'Général',
    whatsapp: optionalEnv('BOOTSTRAP_ENS_WHATSAPP'),
    statut: readEnseignantStatut(),
  };
  const etu = {
    email: requireEnv('BOOTSTRAP_ETU_EMAIL').toLowerCase(),
    fullName: requireEnv('BOOTSTRAP_ETU_NAME'),
    password: requireEnv('BOOTSTRAP_ETU_PASSWORD'),
    matricule: optionalEnv('BOOTSTRAP_ETU_MATRICULE'),
  };

  assertStrongPassword('RP', rp.password);
  assertStrongPassword('AC', ac.password);
  assertStrongPassword('Enseignant', ens.password);
  assertStrongPassword('Étudiant', etu.password);

  const prisma = new PrismaClient();
  try {
    // ── École pilote (multi-tenance V05 / ADR-0019) ──────────────────────
    // Tous les comptes cœur y sont rattachés. Id stable aligné sur le backfill
    // de la migration v5 ; idempotent (find-or-create).
    const ecole = await prisma.ecole.upsert({
      where: { id: 'ecole_ism' },
      update: {},
      create: { id: 'ecole_ism', nom: "École d'Ingénieurs" },
    });

    // ── RP ───────────────────────────────────────────────────────────────
    const rpHash = await hash(rp.password, ARGON2_OPTS);
    const rpUser = await prisma.user.upsert({
      where: { email: rp.email },
      update: {
        fullName: rp.fullName,
        role: 'RESPONSABLE_PROGRAMME',
        passwordHash: rpHash,
        ecoleId: ecole.id,
      },
      create: {
        email: rp.email,
        fullName: rp.fullName,
        role: 'RESPONSABLE_PROGRAMME',
        passwordHash: rpHash,
        ecoleId: ecole.id,
      },
    });

    // ── AC (rattaché au RP via managerRpId) ──────────────────────────────
    const acHash = await hash(ac.password, ARGON2_OPTS);
    await prisma.user.upsert({
      where: { email: ac.email },
      update: {
        fullName: ac.fullName,
        role: 'ASSISTANT_PROGRAMME',
        managerRpId: rpUser.id,
        passwordHash: acHash,
        ecoleId: ecole.id,
      },
      create: {
        email: ac.email,
        fullName: ac.fullName,
        role: 'ASSISTANT_PROGRAMME',
        managerRpId: rpUser.id,
        passwordHash: acHash,
        ecoleId: ecole.id,
      },
    });

    // ── Enseignant (User + fiche Enseignant) ─────────────────────────────
    const ensHash = await hash(ens.password, ARGON2_OPTS);
    const ensUser = await prisma.user.upsert({
      where: { email: ens.email },
      update: {
        fullName: ens.fullName,
        role: 'ENSEIGNANT',
        passwordHash: ensHash,
        ecoleId: ecole.id,
      },
      create: {
        email: ens.email,
        fullName: ens.fullName,
        role: 'ENSEIGNANT',
        passwordHash: ensHash,
        ecoleId: ecole.id,
      },
    });
    await prisma.enseignant.upsert({
      where: { userId: ensUser.id },
      update: {
        nomComplet: ens.fullName,
        emailInstitutionnel: ens.email,
        whatsapp: ens.whatsapp,
        statut: ens.statut,
        specialite: ens.specialite,
        ecoleId: ecole.id,
      },
      create: {
        userId: ensUser.id,
        nomComplet: ens.fullName,
        emailInstitutionnel: ens.email,
        whatsapp: ens.whatsapp,
        statut: ens.statut,
        specialite: ens.specialite,
        ecoleId: ecole.id,
      },
    });

    // ── Étudiant (sans classe : inscrit plus tard via l'onboarding) ──────
    const etuHash = await hash(etu.password, ARGON2_OPTS);
    await prisma.user.upsert({
      where: { email: etu.email },
      update: {
        fullName: etu.fullName,
        role: 'ETUDIANT',
        matricule: etu.matricule,
        passwordHash: etuHash,
        ecoleId: ecole.id,
      },
      create: {
        email: etu.email,
        fullName: etu.fullName,
        role: 'ETUDIANT',
        matricule: etu.matricule,
        passwordHash: etuHash,
        ecoleId: ecole.id,
      },
    });

    process.stdout.write(
      '\n[bootstrap-prod] OK — 4 comptes cœur prêts (idempotent) :\n' +
        `  • RP         : ${rp.email}\n` +
        `  • AC         : ${ac.email} (managerRpId=${rpUser.id})\n` +
        `  • Enseignant : ${ens.email}\n` +
        `  • Étudiant   : ${etu.email}${etu.matricule === null ? '' : ` (matricule ${etu.matricule})`}\n` +
        '\nÉtape suivante : login RP sur https://planit.sn → créer l’année EN_COURS puis le référentiel.\n\n',
    );
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`\n[bootstrap-prod] ÉCHEC : ${message}\n\n`);
    process.exit(1);
  });
