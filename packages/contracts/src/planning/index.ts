import { z } from 'zod';

export const sessionTypeSchema = z.enum(['CM', 'TD', 'TP', 'EXAM', 'RATTRAP', 'DEVOIR', 'EVENT']);

export const sessionStatusSchema = z.enum(['PROVISOIRE', 'VALIDE', 'PUBLIE']);

export type SessionType = z.infer<typeof sessionTypeSchema>;
export type SessionStatus = z.infer<typeof sessionStatusSchema>;

// ── Embedded references (denormalized in API responses) ─────────────
export const classeRefSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
});

export const moduleRefSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  // Couleur réelle du module (hex) — héritée par les cartes de séance de cours.
  color: z.string(),
});

export const salleRefSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const teacherRefSchema = z.object({
  id: z.string(),
  fullName: z.string(),
});

// ── Session response shape (what GET endpoints return) ──────────────
export const sessionSchema = z.object({
  id: z.string(),
  type: sessionTypeSchema,
  status: sessionStatusSchema,
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  isPublished: z.boolean(),
  lastModifiedAt: z.string().datetime(),
  lastPublishedAt: z.string().datetime().nullable(),
  classe: classeRefSchema,
  module: moduleRefSchema,
  // Nullable depuis 2026-06-10 : la BD autorise salleId NULL depuis V02 LOT 2
  // (séance V2/EVENEMENT sans salle) — le DTO de lecture reflète la réalité.
  // L'ancien contrat non-null faisait jeter le mapper V1 → 500 sur toute la
  // semaine dès qu'une séance V2 sans salle existait (vues étudiant/enseignant).
  salle: salleRefSchema.nullable(),
  teacher: teacherRefSchema,
});

// ── Create / update payloads ────────────────────────────────────────
export const createSessionSchema = z.object({
  type: sessionTypeSchema,
  classeId: z.string().min(1),
  moduleId: z.string().min(1),
  salleId: z.string().min(1),
  teacherId: z.string().min(1),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
});

export const updateSessionSchema = createSessionSchema.partial();

// ── Week planning query parameters ──────────────────────────────────
export const weekPlanningQuerySchema = z.object({
  weekStart: z.string().date(),
  classeId: z.string().min(1).optional(),
  teacherId: z.string().min(1).optional(),
  studentId: z.string().min(1).optional(),
  // Pagination — par défaut on ramène 100 séances max (largement suffisant
  // pour une semaine humaine ; protection contre les requêtes pathologiques).
  take: z.coerce.number().int().min(1).max(500).default(100),
  skip: z.coerce.number().int().min(0).default(0),
});

// ── Publish query parameters (POST /sessions/publish) ───────────────
export const publishQuerySchema = z.object({
  classeId: z.string().min(1).optional(),
});

// ── Week planning statistics (RP planning header counters) ──────────
export const sessionStatsSchema = z.object({
  total: z.number().int().nonnegative(),
  published: z.number().int().nonnegative(),
  pending: z.number().int().nonnegative(),
  byType: z.record(sessionTypeSchema, z.number().int().nonnegative()),
});

export type ClasseRef = z.infer<typeof classeRefSchema>;
export type ModuleRef = z.infer<typeof moduleRefSchema>;
export type SalleRef = z.infer<typeof salleRefSchema>;
export type TeacherRef = z.infer<typeof teacherRefSchema>;
export type SessionDto = z.infer<typeof sessionSchema>;
export type CreateSessionDto = z.infer<typeof createSessionSchema>;
export type UpdateSessionDto = z.infer<typeof updateSessionSchema>;
export type WeekPlanningQueryDto = z.infer<typeof weekPlanningQuerySchema>;
export type PublishQueryDto = z.infer<typeof publishQuerySchema>;
export type SessionStatsDto = z.infer<typeof sessionStatsSchema>;
