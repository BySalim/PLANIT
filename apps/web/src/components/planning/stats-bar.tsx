'use client';

import { ClockIcon, DownloadIcon } from '@planit/ui';
import type { SessionDto } from '@planit/contracts';
import { PublishButton } from './publish-button';

interface PlanningFooterProps {
  sessions: SessionDto[];
  isLoading?: boolean;
  isError?: boolean;
}

function EyeIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function PlanningFooter({
  sessions,
  isLoading = false,
  isError = false,
}: PlanningFooterProps) {
  // Compute counters from local sessions (synced with grid display).
  const total = sessions.length;
  const published = sessions.filter((s) => s.status === 'PUBLIE').length;
  const validated = sessions.filter((s) => s.status === 'VALIDE').length;
  const provisoires = sessions.filter((s) => s.status === 'PROVISOIRE').length;

  return (
    <footer
      className="flex flex-wrap items-center justify-between gap-3 border-t border-border-soft bg-surface px-4 py-2.5"
      style={{ opacity: isLoading ? 0.7 : 1 }}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-text-sec">
        {isError ? (
          <span className="text-text-muted">
            Backend indisponible. Démarre Docker puis recharge.
          </span>
        ) : (
          <>
            <span>
              <strong className="font-semibold text-text">{total}</strong> séances
            </span>
            <span className="text-text-faint">·</span>
            <span>
              <strong className="font-semibold" style={{ color: '#15803D' }}>
                {published}
              </strong>{' '}
              publiées
            </span>
            <span className="text-text-faint">·</span>
            <span>
              <strong className="font-semibold" style={{ color: '#1E40AF' }}>
                {validated}
              </strong>{' '}
              validées
            </span>
            <span className="text-text-faint">·</span>
            <span>
              <strong className="font-semibold" style={{ color: '#92400E' }}>
                {provisoires}
              </strong>{' '}
              provisoires
            </span>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="hidden text-[11.5px] text-text-muted md:inline">
          Auto-publication vendredi 22:00
        </span>
        {/* V2: Historique / Exporter / Aperçu étudiant — visibles mais disabled */}
        <button
          type="button"
          disabled
          title="Disponible Vague 02"
          className="inline-flex h-9 cursor-not-allowed items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-[12px] font-semibold text-text-muted"
        >
          <ClockIcon size={13} color="currentColor" />
          <span>Historique</span>
        </button>
        <button
          type="button"
          disabled
          title="Disponible Vague 02"
          className="inline-flex h-9 cursor-not-allowed items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-[12px] font-semibold text-text-muted"
        >
          <DownloadIcon size={13} color="currentColor" />
          <span>Exporter</span>
        </button>
        <button
          type="button"
          disabled
          title="Disponible Vague 02"
          className="inline-flex h-9 cursor-not-allowed items-center gap-1.5 rounded-lg border border-primary-200 bg-surface px-3 text-[12px] font-semibold text-primary"
        >
          <EyeIcon />
          <span>Aperçu étudiant</span>
        </button>
        <PublishButton sessions={sessions} />
      </div>
    </footer>
  );
}
