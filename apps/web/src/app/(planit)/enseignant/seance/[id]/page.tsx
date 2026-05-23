'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronLeftIcon } from '@planit/ui';
import { MobileShell } from '@/components/enseignant/mobile-shell';
import { SessionDetailView } from '@/components/enseignant/session-detail-view';
import { useCurrentTeacher } from '@/hooks/use-current-teacher';
import { useRealtimeSessions } from '@/hooks/use-realtime-sessions';
import { useSessionDetailQuery } from '@/lib/queries';

// eslint-disable-next-line no-restricted-syntax
export default function EnseignantSeanceDetailPage() {
  const teacher = useCurrentTeacher();
  useRealtimeSessions(teacher.id);

  const params = useParams<{ id: string }>();
  const sessionId = params.id;

  const { data, isLoading, isError, refetch } = useSessionDetailQuery(sessionId);

  return (
    <MobileShell>
      <div className="flex flex-col gap-4 px-4 py-4">
        <div className="flex items-center gap-2">
          <Link
            href="/enseignant/planning"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border-soft bg-surface px-3 text-sm font-medium text-text-sec transition-colors hover:border-primary hover:text-primary"
            aria-label="Retour au planning"
          >
            <ChevronLeftIcon size={14} color="currentColor" />
            Retour au planning
          </Link>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-border bg-surface px-6 py-10 text-center text-sm text-text-sec">
            Chargement de la séance…
          </div>
        ) : isError ? (
          <div
            role="alert"
            className="flex flex-col items-center gap-3 rounded-2xl border border-err bg-err-100 px-6 py-10 text-center text-sm text-err"
          >
            <p>Impossible de charger les détails de cette séance.</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-lg border border-err bg-surface px-3 py-1.5 text-xs font-semibold text-err hover:bg-err-100"
            >
              Réessayer
            </button>
          </div>
        ) : data !== undefined ? (
          <SessionDetailView session={data} />
        ) : (
          <div className="rounded-2xl border border-border bg-surface px-6 py-10 text-center text-sm text-text-sec">
            Séance introuvable.
          </div>
        )}
      </div>
    </MobileShell>
  );
}
