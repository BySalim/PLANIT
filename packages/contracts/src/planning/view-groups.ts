import { z } from 'zod';

// V05 LOT 7.1 — groupes de vue planning (presets custom pour les vues by-X).
// La dimension correspond à un onglet by-X (Classe / Salle / Prof). Côté API on
// expose les valeurs en minuscules (alignées sur `ReferentielDim` du front) ; le
// backend les mappe sur l'enum Prisma `PlanningViewKind`.
export const planningViewKindSchema = z.enum(['classe', 'salle', 'prof']);
export type PlanningViewKind = z.infer<typeof planningViewKindSchema>;

// Un groupe de vue = sous-ensemble ordonné de références (ids) = colonnes d'une
// vue by-X. Privé à son créateur (scope serveur sur `userId`).
export const planningViewGroupDtoSchema = z.object({
  id: z.string(),
  view: planningViewKindSchema,
  name: z.string(),
  refIds: z.array(z.string()),
});
export type PlanningViewGroupDto = z.infer<typeof planningViewGroupDtoSchema>;

export const planningViewGroupListSchema = planningViewGroupDtoSchema.array();

export const createPlanningViewGroupSchema = z.object({
  view: planningViewKindSchema,
  name: z.string().trim().min(1).max(60),
  refIds: z.array(z.string().min(1)).min(1),
});
export type CreatePlanningViewGroupDto = z.infer<typeof createPlanningViewGroupSchema>;

// Édition : renommer et/ou réordonner les références (au moins un champ).
export const updatePlanningViewGroupSchema = z
  .object({
    name: z.string().trim().min(1).max(60).optional(),
    refIds: z.array(z.string().min(1)).min(1).optional(),
  })
  .refine((d) => d.name !== undefined || d.refIds !== undefined, {
    message: 'Au moins un champ à mettre à jour',
  });
export type UpdatePlanningViewGroupDto = z.infer<typeof updatePlanningViewGroupSchema>;

// Liste filtrée par dimension de vue (un onglet by-X à la fois).
export const planningViewGroupQuerySchema = z.object({
  view: planningViewKindSchema,
});
export type PlanningViewGroupQueryDto = z.infer<typeof planningViewGroupQuerySchema>;
