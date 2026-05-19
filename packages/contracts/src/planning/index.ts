import { z } from 'zod';

export const sessionTypeSchema = z.enum(['CM', 'TD', 'TP', 'EXAM', 'RATTRAP', 'DEVOIR', 'EVENT']);

export const sessionStatusSchema = z.enum(['PROVISOIRE', 'VALIDE', 'PUBLIE']);

export type SessionType = z.infer<typeof sessionTypeSchema>;
export type SessionStatus = z.infer<typeof sessionStatusSchema>;
