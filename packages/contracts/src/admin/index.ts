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

// Compte Direction d'une école. Une école et sa Direction sont indissociables
// (créées ensemble, cf. ADR-0020) : `direction` est donc toujours présent en
// pratique. `nullable()` est défensif (école héritée sans Direction).
export const directionSummarySchema = z.object({
  id: cuid,
  email: z.string().email(),
  fullName: z.string(),
  statut: userStatutSchema,
});
export type DirectionSummaryDto = z.infer<typeof directionSummarySchema>;

// Champs du compte Direction saisis à la création de l'école.
export const createDirectionSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).max(120),
  password: z.string().min(12).max(72),
});
export type CreateDirectionDto = z.infer<typeof createDirectionSchema>;

export const ecoleSchema = z.object({
  id: cuid,
  nom: z.string().min(1).max(160),
  statut: ecoleStatutSchema,
  archivedAt: isoDate.nullable(),
  direction: directionSummarySchema.nullable(),
});

// Créer une école crée obligatoirement sa Direction (seul point d'entrée pour
// un compte DIRECTION). Le bloc `direction` est requis.
export const createEcoleSchema = z.object({
  nom: z.string().min(1).max(160),
  direction: createDirectionSchema,
});

// Une mise à jour ne touche que le nom : la Direction se gère via son compte.
export const updateEcoleSchema = z.object({ nom: z.string().min(1).max(160) }).partial();

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

// ── Personnel d'école (LOT 2 / V5-D2) ──────────────────────────────
// RP + AC créés par la Direction dans le périmètre de son école.
// Le role est restreint à RESPONSABLE_PROGRAMME | ASSISTANT_PROGRAMME
// (un acteur DIRECTION ne crée pas d'autres DIRECTION).

export const personnelRoleSchema = z.enum(['RESPONSABLE_PROGRAMME', 'ASSISTANT_PROGRAMME']);
export type PersonnelRole = z.infer<typeof personnelRoleSchema>;

export const personnelSchema = z.object({
  id: cuid,
  email: z.string().email(),
  fullName: z.string().min(1),
  role: personnelRoleSchema,
  statut: userStatutSchema,
  ecoleId: cuid,
  matricule: z.string().nullable(),
  createdAt: isoDate,
});

/** Création d'un RP ou AC par la Direction. */
export const createPersonnelSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).max(120),
  role: personnelRoleSchema,
  password: z.string().min(12).max(72),
  matricule: z.string().max(40).optional(),
});

/** Modification nom ou email d'un personnel (Direction). */
export const updatePersonnelSchema = z
  .object({
    fullName: z.string().min(1).max(120),
    email: z.string().email(),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Au moins un champ requis' });

export type PersonnelDto = z.infer<typeof personnelSchema>;
export type CreatePersonnelDto = z.infer<typeof createPersonnelSchema>;
export type UpdatePersonnelDto = z.infer<typeof updatePersonnelSchema>;

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
