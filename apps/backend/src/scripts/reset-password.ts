import { hash } from '@node-rs/argon2';
import { PrismaClient } from '@prisma/client';

/**
 * Reset du mot de passe d'**un** compte (V04 LOT 8.5, ADR-0017). Faute d'email
 * transactionnel au go-live (TD-003), c'est le chemin de reset au pilote. Lit
 * `RESET_EMAIL` + `RESET_PASSWORD` de l'environnement (ou argv[2] / argv[3]).
 *
 * Exécution PROD (box Hetzner, image runtime → JS compilé) :
 *   docker compose --env-file /opt/planit/.env.prod -f infra/docker-compose.prod.yml \
 *     run --rm -e RESET_EMAIL='...' -e RESET_PASSWORD='...' backend \
 *     node dist/scripts/reset-password.js
 *
 * NB : ne révoque pas les sessions actives. Pour forcer le re-login après reset,
 * enchaîner `node dist/scripts/revoke-all-sessions.js`.
 */

// argon2id — profil OWASP RFC 9106 (cf. ADR-0007 §1, aligné sur la seed).
const ARGON2_OPTS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

async function main(): Promise<void> {
  const email = (process.env['RESET_EMAIL'] ?? process.argv[2] ?? '').trim().toLowerCase();
  const password = (process.env['RESET_PASSWORD'] ?? process.argv[3] ?? '').trim();

  if (email === '' || password === '') {
    throw new Error('Usage : RESET_EMAIL=<email> RESET_PASSWORD=<mot de passe> requis (ou argv).');
  }
  if (password.length < 12) {
    throw new Error('Mot de passe trop court (≥ 12 caractères requis en prod).');
  }

  const prisma = new PrismaClient();
  try {
    const passwordHash = await hash(password, ARGON2_OPTS);
    const user = await prisma.user.update({ where: { email }, data: { passwordHash } });
    process.stdout.write(
      `\n[reset-password] OK — mot de passe réinitialisé pour ${user.email} (${user.role}).\n` +
        'Pense à révoquer les sessions si nécessaire (revoke-all-sessions.js).\n\n',
    );
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    // `update` sur un email inconnu → Prisma P2025 (record not found).
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`\n[reset-password] ÉCHEC : ${message}\n\n`);
    process.exit(1);
  });
