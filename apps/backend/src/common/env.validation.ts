import { z } from 'zod';

/**
 * Validation d'environnement **fail-fast** (V04 LOT 1.5, ADR-0013 §8).
 *
 * Objectif : qu'un backend mal configuré **refuse de démarrer** avec un message
 * clair, plutôt que de booter puis échouer à la première requête (auth muette,
 * 500 opaques). Appelée tout en haut de `bootstrap()` — donc **jamais** pendant
 * les tests (qui montent l'app via `Test.createTestingModule`, pas via `main.ts`).
 *
 * Seules les variables **réellement requises** sont obligatoires ; le reste a un
 * défaut applicatif documenté (cf. `apps/backend/.env.example`).
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Requises — sans elles l'app ne peut pas fonctionner.
  DATABASE_URL: z.string().url('DATABASE_URL doit être une URL PostgreSQL valide (postgresql://…)'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET doit faire au moins 32 caractères'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET doit faire au moins 32 caractères'),

  // Optionnelles — un défaut est appliqué côté code si absentes.
  PORT: z.coerce.number().int().positive().default(3001),
  FRONTEND_URL: z.string().url().optional(),
  JWT_ACCESS_TTL: z.coerce.number().int().positive().optional(),
  JWT_REFRESH_TTL: z.coerce.number().int().positive().optional(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),
  REDIS_URL: z.string().url().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

/**
 * Parse et valide `process.env`. Lève une erreur agrégée et lisible si une
 * variable requise manque ou est invalide — le `catch` de `bootstrap()` la
 * transforme en `exit(1)`.
 */
export function validateEnv(): AppEnv {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  • ${issue.path.join('.') || '(racine)'} : ${issue.message}`)
      .join('\n');
    throw new Error(`Configuration d'environnement invalide :\n${details}`);
  }
  return parsed.data;
}
