import { useQuery } from '@tanstack/react-query';
import {
  type SessionDto,
  type SessionStatsDto,
  sessionSchema,
  sessionStatsSchema,
} from '@planit/contracts';
import { apiGet } from './api';
import { toWeekStartParam } from './week';

export const planningKeys = {
  all: ['planning'] as const,
  sessions: (weekStart: string) => [...planningKeys.all, 'sessions', weekStart] as const,
  stats: (weekStart: string) => [...planningKeys.all, 'stats', weekStart] as const,
  session: (id: string) => [...planningKeys.all, 'session', id] as const,
};

const sessionListSchema = sessionSchema.array();

export function useWeekSessionsQuery(weekStart: Date) {
  const weekStartParam = toWeekStartParam(weekStart);
  return useQuery<SessionDto[]>({
    queryKey: planningKeys.sessions(weekStartParam),
    queryFn: () => apiGet(`/api/sessions?weekStart=${weekStartParam}`, sessionListSchema),
  });
}

export function useWeekStatsQuery(weekStart: Date) {
  const weekStartParam = toWeekStartParam(weekStart);
  return useQuery<SessionStatsDto>({
    queryKey: planningKeys.stats(weekStartParam),
    queryFn: () => apiGet(`/api/sessions/stats?weekStart=${weekStartParam}`, sessionStatsSchema),
  });
}

export function useSessionDetailQuery(sessionId: string | null) {
  return useQuery<SessionDto>({
    queryKey: planningKeys.session(sessionId ?? ''),
    queryFn: () => apiGet(`/api/sessions/${sessionId}`, sessionSchema),
    enabled: sessionId !== null,
  });
}
