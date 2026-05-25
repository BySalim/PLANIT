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
  sessionsByTeacher: (weekStart: string, teacherId: string) =>
    [...planningKeys.all, 'sessions', weekStart, 'teacher', teacherId] as const,
  sessionsByStudent: (weekStart: string, studentId: string) =>
    [...planningKeys.all, 'sessions', weekStart, 'student', studentId] as const,
  stats: (weekStart: string) => [...planningKeys.all, 'stats', weekStart] as const,
  session: (id: string) => [...planningKeys.all, 'session', id] as const,
};

const sessionListSchema = sessionSchema.array();

export function useWeekSessionsQuery(
  weekStart: Date,
  options?: { teacherId?: string; studentId?: string },
) {
  const weekStartParam = toWeekStartParam(weekStart);
  const teacherId = options?.teacherId;
  const studentId = options?.studentId;
  const params = new URLSearchParams({ weekStart: weekStartParam });

  let queryKey: readonly string[];
  if (studentId !== undefined) {
    params.set('studentId', studentId);
    queryKey = planningKeys.sessionsByStudent(weekStartParam, studentId);
  } else if (teacherId !== undefined) {
    params.set('teacherId', teacherId);
    queryKey = planningKeys.sessionsByTeacher(weekStartParam, teacherId);
  } else {
    queryKey = planningKeys.sessions(weekStartParam);
  }

  return useQuery<SessionDto[]>({
    queryKey,
    queryFn: () => apiGet(`/sessions?${params.toString()}`, sessionListSchema),
  });
}

export function useWeekStatsQuery(weekStart: Date) {
  const weekStartParam = toWeekStartParam(weekStart);
  return useQuery<SessionStatsDto>({
    queryKey: planningKeys.stats(weekStartParam),
    queryFn: () => apiGet(`/sessions/stats?weekStart=${weekStartParam}`, sessionStatsSchema),
  });
}

export function useSessionDetailQuery(sessionId: string | null) {
  return useQuery<SessionDto>({
    queryKey: planningKeys.session(sessionId ?? ''),
    queryFn: () => apiGet(`/sessions/${sessionId}`, sessionSchema),
    enabled: sessionId !== null,
  });
}
