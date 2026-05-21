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
  salle: salleRefSchema,
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
});

export type ClasseRef = z.infer<typeof classeRefSchema>;
export type ModuleRef = z.infer<typeof moduleRefSchema>;
export type SalleRef = z.infer<typeof salleRefSchema>;
export type TeacherRef = z.infer<typeof teacherRefSchema>;
export type SessionDto = z.infer<typeof sessionSchema>;
export type CreateSessionDto = z.infer<typeof createSessionSchema>;
export type UpdateSessionDto = z.infer<typeof updateSessionSchema>;
export type WeekPlanningQueryDto = z.infer<typeof weekPlanningQuerySchema>;
