import { z } from 'zod';

// ── Role enum (mirror of Prisma `Role` — kept in sync manually) ──────
// We don't import @prisma/client here: contracts must stay framework-free
// so the web (which can't run Prisma client) can consume them.
export const roleSchema = z.enum([
  'SUPER_ADMIN',
  'ADMIN',
  'RESPONSABLE_PROGRAMME',
  'ASSISTANT_PROGRAMME',
  'ENSEIGNANT',
  'ETUDIANT',
  'RESPONSABLE_CLASSE',
  'PARTENAIRE',
]);

export type Role = z.infer<typeof roleSchema>;

// ── Login / Register (V01 — kept) ────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2).max(100),
});

// ── V02 — GET /auth/me response (cf. ADR-0007 §5, LOT 1 A.4) ─────────
// Returned by GET /auth/me. The client never reads the cookie ; it always
// calls this endpoint to know who is logged in (no document.cookie usage,
// ADR-0007 §5).
export const authMeSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: roleSchema,
  fullName: z.string(),
  matricule: z.string().nullable(),
});

export type LoginDto = z.infer<typeof loginSchema>;
export type RegisterDto = z.infer<typeof registerSchema>;
export type AuthMeDto = z.infer<typeof authMeSchema>;
