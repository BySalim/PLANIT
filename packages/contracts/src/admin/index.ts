import { z } from 'zod';
import { roleSchema, userStatutSchema } from '../auth';

// ─────────────────────────────────────────────────────────────────────
// V05 — Admin système + multi-tenance (ADR-0019 / ADR-0020)
// ─────────────────────────────────────────────────────────────────────
// Contracts framework-free (consommés backend ET web). Schémas miroir de
// Prisma (Ecole, AuditLog) tenus en sync manuellement.

const cuid = z.string().min(1);
// Dates sérialisées en ISO string (JSON) côté API.
const isoDate = z.string();

// ── École ─────────────────────────────────────────────────────────────

export const ecoleStatutSchema = z.enum(['ACTIVE', 'ARCHIVEE']);
export type EcoleStatut = z.infer<typeof ecoleStatutSchema>;

export const ecoleSchema = z.object({
  id: cuid,
  nom: z.string().min(1).max(160),
  statut: ecoleStatutSchema,
  archivedAt: isoDate.nullable(),
});

export const createEcoleSchema = z.object({
  nom: z.string().min(1).max(160),
});

export const updateEcoleSchema = createEcoleSchema.partial();

export type EcoleDto = z.infer<typeof ecoleSchema>;
export type CreateEcoleDto = z.infer<typeof createEcoleSchema>;
export type UpdateEcoleDto = z.infer<typeof updateEcoleSchema>;

// ── Utilisateur (vue Admin cross-école) ──────────────────────────────
// Référence légère à l'école pour l'affichage (null pour ADMIN/SUPER_ADMIN).

export const ecoleRefSchema = z.object({ id: cuid, nom: z.string() });
export type EcoleRefDto = z.infer<typeof ecoleRefSchema>;

export const userAdminSchema = z.object({
  id: cuid,
  email: z.string().email(),
  fullName: z.string().min(1),
  role: roleSchema,
  statut: userStatutSchema,
  ecoleId: cuid.nullable(),
  ecole: ecoleRefSchema.nullable(),
  matricule: z.string().nullable(),
  createdAt: isoDate,
});

// Création d'un compte par l'Admin (tout rôle). `ecoleId` requis sauf pour
// ADMIN/SUPER_ADMIN — invariant validé côté service (cross-field), pas Zod.
export const createUserAdminSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).max(120),
  role: roleSchema,
  password: z.string().min(12).max(72),
  ecoleId: cuid.nullable().optional(),
  matricule: z.string().max(40).optional(),
});

export const updateUserAdminSchema = z
  .object({
    fullName: z.string().min(1).max(120),
    role: roleSchema,
    ecoleId: cuid.nullable(),
  })
  .partial();

export type UserAdminDto = z.infer<typeof userAdminSchema>;
export type CreateUserAdminDto = z.infer<typeof createUserAdminSchema>;
export type UpdateUserAdminDto = z.infer<typeof updateUserAdminSchema>;

// Réponse au reset de mot de passe : mot de passe temporaire affiché une
// fois (pas de canal d'envoi avant V06, ADR-0020 §7).
export const resetPasswordResultSchema = z.object({
  temporaryPassword: z.string(),
});
export type ResetPasswordResultDto = z.infer<typeof resetPasswordResultSchema>;

// ── Journal d'audit (V5-D8) ──────────────────────────────────────────

export const auditActorSchema = z.object({ id: cuid, fullName: z.string() });

export const auditLogSchema = z.object({
  id: cuid,
  actorId: cuid,
  actor: auditActorSchema.nullable(),
  action: z.string(),
  targetType: z.string(),
  targetId: z.string().nullable(),
  ecoleId: cuid.nullable(),
  meta: z.unknown().nullable(),
  createdAt: isoDate,
});

export type AuditLogDto = z.infer<typeof auditLogSchema>;
