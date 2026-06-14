import { z } from 'zod';
import { classeRefSchema, moduleRefSchema, salleRefSchema } from './index';

// ─────────────────────────────────────────────────────────────────────
// V02 — Refonte Séance (cf. ADR-0008 + V2-D4/D5/D6/D7/D8/D9)
// ─────────────────────────────────────────────────────────────────────
// Coexists with the V01 schemas in this directory ; V01 will be dropped
// in LOT 2 once the SeanceService is refactored.

export const sessionTypeV2Schema = z.enum(['COURS', 'EVALUATION', 'EVENEMENT']);

export const sessionSousTypeSchema = z.enum(['CM', 'TD', 'TP', 'EXAMEN', 'RATTRAPAGE', 'DEVOIR']);

export type SessionTypeV2 = z.infer<typeof sessionTypeV2Schema>;
export type SessionSousType = z.infer<typeof sessionSousTypeSchema>;

// Sub-type categories — kept here so backend validators can reject mismatched
// (type, sousType) pairs without duplicating the rule.
export const COURS_SOUS_TYPES: readonly SessionSousType[] = ['CM', 'TD', 'TP'] as const;
export const EVALUATION_SOUS_TYPES: readonly SessionSousType[] = [
  'EXAMEN',
  'RATTRAPAGE',
  'DEVOIR',
] as const;

// ── Embedded enseignant reference (V02 — points to Enseignant.id) ────
export const enseignantRefSchema = z.object({
  id: z.string(),
  nomComplet: z.string(),
});

export type EnseignantRef = z.infer<typeof enseignantRefSchema>;

// ── Session V2 response shape ────────────────────────────────────────
export const sessionV2Schema = z.object({
  id: z.string(),
  libelle: z.string(),
  type: sessionTypeV2Schema,
  sousType: sessionSousTypeSchema.nullable(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  intervenantNom: z.string().nullable(),
  description: z.string().nullable(),

  // Smart dirty (cf. ADR-0008) — backend authoritative.
  hasUnpublishedChanges: z.boolean(),
  isPublished: z.boolean(),
  lastModifiedAt: z.string().datetime(),
  lastPublishedAt: z.string().datetime().nullable(),

  // Relations.
  module: moduleRefSchema.nullable(),
  enseignant: enseignantRefSchema.nullable(),
  salle: salleRefSchema.nullable(),
  // V05 LOT 6 (ADR-0022 §4) : une séance masquée (vue Salle, séance d'un autre
  // RP) n'expose aucune classe → tableau potentiellement vide.
  classes: z.array(classeRefSchema),

  // V05 LOT 6 — RP créateur (ADR-0022). `masked = true` ⇒ séance d'un autre RP
  // vue dans le référentiel Salle : seuls le créneau + `ownerRpName` sont
  // réels, tous les détails (module/enseignant/classes/libellé/description) sont
  // neutralisés CÔTÉ SERVEUR (jamais transmis). `ownerRpName` null hors masquage.
  ownerRpId: z.string().nullable(),
  ownerRpName: z.string().nullable(),
  masked: z.boolean(),
});

export type SessionV2Dto = z.infer<typeof sessionV2Schema>;

// ── Create payload (discriminated union sur `type`) ──────────────────
// COURS / EVALUATION → moduleId + enseignantId requis, sousType obligatoire
// pour respecter la palette définie en V2-D4. EVENEMENT → moduleId/enseignantId
// interdits, intervenantNom + description optionnels (et seuls champs métier).

const isoDatetime = z.string().datetime();
const cuid = z.string().min(1);

const baseCreateFields = {
  libelle: z.string().min(1).max(200),
  startAt: isoDatetime,
  endAt: isoDatetime,
  classeIds: z.array(cuid).min(1),
  salleId: cuid.nullable().optional(),
};

export const createCoursSessionSchema = z.object({
  type: z.literal('COURS'),
  sousType: z.enum(['CM', 'TD', 'TP']).optional(),
  moduleId: cuid,
  enseignantId: cuid,
  intervenantNom: z.null().optional(),
  description: z.null().optional(),
  ...baseCreateFields,
});

export const createEvaluationSessionSchema = z.object({
  type: z.literal('EVALUATION'),
  sousType: z.enum(['EXAMEN', 'RATTRAPAGE', 'DEVOIR']),
  moduleId: cuid,
  enseignantId: cuid,
  intervenantNom: z.null().optional(),
  description: z.null().optional(),
  ...baseCreateFields,
});

export const createEvenementSessionSchema = z.object({
  type: z.literal('EVENEMENT'),
  sousType: z.null().optional(),
  moduleId: z.null().optional(),
  enseignantId: z.null().optional(),
  intervenantNom: z.string().min(1).max(120).nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  ...baseCreateFields,
});

export const createSessionV2Schema = z.discriminatedUnion('type', [
  createCoursSessionSchema,
  createEvaluationSessionSchema,
  createEvenementSessionSchema,
]);

export type CreateSessionV2Dto = z.infer<typeof createSessionV2Schema>;

// ── Update payload — same as create but `type` is **immutable** (V2-D8) ─
// We omit `type` from the input. All other fields are optional.

const updateBase = z.object({
  libelle: z.string().min(1).max(200).optional(),
  startAt: isoDatetime.optional(),
  endAt: isoDatetime.optional(),
  sousType: sessionSousTypeSchema.nullable().optional(),
  moduleId: cuid.nullable().optional(),
  enseignantId: cuid.nullable().optional(),
  intervenantNom: z.string().min(1).max(120).nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  salleId: cuid.nullable().optional(),
  classeIds: z.array(cuid).min(1).optional(),
});

export const updateSessionV2Schema = updateBase;

export type UpdateSessionV2Dto = z.infer<typeof updateSessionV2Schema>;
