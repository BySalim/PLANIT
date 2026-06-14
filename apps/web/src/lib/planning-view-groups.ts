import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  planningViewGroupDtoSchema,
  planningViewGroupListSchema,
  type CreatePlanningViewGroupDto,
  type PlanningViewGroupDto,
  type PlanningViewKind,
  type UpdatePlanningViewGroupDto,
} from '@planit/contracts';
import { apiDelete, apiGet, apiPost, apiPut } from './api';

// V05 LOT 7.1 — groupes de vue planning (presets custom des vues by-X),
// persistés côté backend, privés à l'utilisateur courant.
export const viewGroupKeys = {
  all: ['planning-view-groups'] as const,
  byView: (view: PlanningViewKind) => ['planning-view-groups', view] as const,
};

export function usePlanningViewGroupsQuery(view: PlanningViewKind, enabled: boolean) {
  return useQuery<PlanningViewGroupDto[]>({
    queryKey: viewGroupKeys.byView(view),
    queryFn: () => apiGet(`/planning/view-groups?view=${view}`, planningViewGroupListSchema),
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useCreateViewGroupMutation() {
  const qc = useQueryClient();
  return useMutation<PlanningViewGroupDto, Error, CreatePlanningViewGroupDto>({
    mutationFn: (body) => apiPost(`/planning/view-groups`, planningViewGroupDtoSchema, body),
    onSuccess: (created) => {
      void qc.invalidateQueries({ queryKey: viewGroupKeys.byView(created.view) });
    },
  });
}

export function useUpdateViewGroupMutation() {
  const qc = useQueryClient();
  return useMutation<PlanningViewGroupDto, Error, { id: string; body: UpdatePlanningViewGroupDto }>(
    {
      mutationFn: ({ id, body }) =>
        apiPut(`/planning/view-groups/${id}`, planningViewGroupDtoSchema, body),
      onSuccess: (updated) => {
        void qc.invalidateQueries({ queryKey: viewGroupKeys.byView(updated.view) });
      },
    },
  );
}

export function useDeleteViewGroupMutation(view: PlanningViewKind) {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string }>({
    mutationFn: ({ id }) => apiDelete(`/planning/view-groups/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: viewGroupKeys.byView(view) });
    },
  });
}
