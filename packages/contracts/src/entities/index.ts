import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────
// V02 — Entités introduites par la Vague 02 (cf. LOT 5 V02)
// ─────────────────────────────────────────────────────────────────────
// Enseignants, UE, Module enrichi, Filière, Settings.
// CRUD complet exposé par le backend en LOT 2 et consommé par les pages
// RP du LOT 5.

const cuid = z.string().min(1);

// ── Enums ────────────────────────────────────────────────────────────

export const enseignantStatutSchema = z.enum(['PERMANENT', 'VACATAIRE']);
export type EnseignantStatut = z.infer<typeof enseignantStatutSchema>;

export const filiereGradeSchema = z.enum(['LICENCE', 'MASTER', 'DOCTORAT']);
export type FiliereGrade = z.infer<typeof filiereGradeSchema>;

// Hex color, e.g. "#3B82F6". 3 or 6 hex digits. Used by UE and Module.
const hexColor = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Couleur hex attendue, ex. #3B82F6');

// ── Enseignant ──────────────────────────────────────────────────────

export const enseignantSchema = z.object({
  id: cuid,
  userId: cuid,
  nomComplet: z.string().min(1).max(120),
  emailInstitutionnel: z.string().email(),
  whatsapp: z.string().max(30).nullable(),
  statut: enseignantStatutSchema,
  specialite: z.string().min(1).max(120),
});

export const createEnseignantSchema = enseignantSchema.omit({ id: true });
export const updateEnseignantSchema = createEnseignantSchema.partial();

export type EnseignantDto = z.infer<typeof enseignantSchema>;
export type CreateEnseignantDto = z.infer<typeof createEnseignantSchema>;
export type UpdateEnseignantDto = z.infer<typeof updateEnseignantSchema>;

// ── UE ──────────────────────────────────────────────────────────────

export const moduleV2Schema = z.object({
  id: cuid,
  code: z.string().min(1).max(20),
  libelle: z.string().min(1).max(120),
  color: hexColor,
  ueId: cuid,
});

export const ueSchema = z.object({
  id: cuid,
  code: z.string().min(1).max(20),
  libelle: z.string().min(1).max(120),
  color: hexColor,
  modules: z.array(moduleV2Schema),
});

export const createUeSchema = ueSchema.omit({ id: true, modules: true });
export const updateUeSchema = createUeSchema.partial();

export type UEDto = z.infer<typeof ueSchema>;
export type CreateUEDto = z.infer<typeof createUeSchema>;
export type UpdateUEDto = z.infer<typeof updateUeSchema>;

// ── Module (V02 — enriched) ─────────────────────────────────────────

export const createModuleSchema = moduleV2Schema.omit({ id: true, ueId: true });
export const updateModuleSchema = createModuleSchema.partial();

export type ModuleV2Dto = z.infer<typeof moduleV2Schema>;
export type CreateModuleDto = z.infer<typeof createModuleSchema>;
export type UpdateModuleDto = z.infer<typeof updateModuleSchema>;

// ── Filière ─────────────────────────────────────────────────────────

export const filiereSchema = z.object({
  id: cuid,
  sigle: z.string().min(1).max(20),
  libelle: z.string().min(1).max(120),
  isDoubleDiplome: z.boolean(),
  grade: filiereGradeSchema,
});

export const createFiliereSchema = filiereSchema.omit({ id: true });
export const updateFiliereSchema = createFiliereSchema.partial();

export type FiliereDto = z.infer<typeof filiereSchema>;
export type CreateFiliereDto = z.infer<typeof createFiliereSchema>;
export type UpdateFiliereDto = z.infer<typeof updateFiliereSchema>;

// ── Settings (singleton — cf. V2-D10) ───────────────────────────────

export const settingsSchema = z.object({
  dayStartHour: z.number().int().min(0).max(23),
  dayEndHour: z.number().int().min(1).max(24),
});

// Update accepts a partial — RP can change only the hour they care about.
export const updateSettingsSchema = settingsSchema.partial();

export type SettingsDto = z.infer<typeof settingsSchema>;
export type UpdateSettingsDto = z.infer<typeof updateSettingsSchema>;
