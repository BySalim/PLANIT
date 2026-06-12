import { z } from 'zod';

// ── Role enum (mirror of Prisma `Role` — kept in sync manually) ──────
// We don't import @prisma/client here: contracts must stay framework-free
// so the web (which can't run Prisma client) can consume them.
export const roleSchema = z.enum([
  'SUPER_ADMIN',
  'ADMIN',
  'DIRECTION', // V05 — pilotage scopé à une école (ADR-0020)
  'RESPONSABLE_PROGRAMME',
  'ASSISTANT_PROGRAMME',
  'ENSEIGNANT',
  'ETUDIANT',
  'RESPONSABLE_CLASSE',
  'PARTENAIRE',
]);

export type Role = z.infer<typeof roleSchema>;

// ── V05 — cycle de vie d'un compte (V5-D7 / ADR-0020) ───────────────
export const userStatutSchema = z.enum(['EN_ATTENTE', 'ACTIF', 'SUSPENDU']);
export type UserStatut = z.infer<typeof userStatutSchema>;

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
  // V05 — école de rattachement (null pour ADMIN/SUPER_ADMIN, ADR-0019).
  ecoleId: z.string().nullable(),
});

export type LoginDto = z.infer<typeof loginSchema>;
export type RegisterDto = z.infer<typeof registerSchema>;
export type AuthMeDto = z.infer<typeof authMeSchema>;
