'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { SessionV2Dto } from '@planit/contracts';
import { MapPinIcon } from '@planit/ui';
import { Drawer } from '@/components/ui/drawer';
import { useSuiviSeancesQuery } from '@/lib/queries-v3';

interface SuiviSeancesDrawerProps {
  readonly suiviId: string | null;
  readonly moduleLibelle?: string | undefined;
  readonly moduleColor?: string | undefined;
  readonly onClose: () => void;
}

/**
 * E.5 — Timeline chronologique des séances COURS d'un module suivi (drawer droit).
 *
 * Plus récente en haut (l'API trie déjà `startAt desc` ; tri défensif conservé).
 * Lecture seule. Lazy load via skeleton (pas de texte « Chargement… »).
 */
export function SuiviSeancesDrawer({
  suiviId,
  moduleLibelle,
  moduleColor,
  onClose,
}: SuiviSeancesDrawerProps) {
  const query = useSuiviSeancesQuery(suiviId);
  const seances = query.data ?? [];
  const sorted = [...seances].sort(
    (a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime(),
  );

  return (
    <Drawer
      isOpen={suiviId !== null}
      onClose={onClose}
      title={moduleLibelle ? `Séances — ${moduleLibelle}` : 'Séances du module'}
      width="md"
    >
      {query.isLoading ? (
        <SeancesTimelineSkeleton />
      ) : query.error ? (
        <p
          role="alert"
          className="rounded-lg border border-err bg-err-100 px-3 py-2 text-sm text-err"
        >
          Impossible de charger les séances.
        </p>
      ) : sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-soft bg-bg px-4 py-12 text-center text-sm text-text-muted">
          Aucune séance n&apos;a encore eu lieu pour ce module.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            {sorted.length} séance{sorted.length > 1 ? 's' : ''}
          </div>
          <ol className="flex flex-col">
            {sorted.map((s, i) => (
              <TimelineItem
                key={s.id}
                session={s}
                color={moduleColor}
                isLast={i === sorted.length - 1}
              />
            ))}
          </ol>
        </div>
      )}
    </Drawer>
  );
}

function TimelineItem({
  session,
  color,
  isLast,
}: {
  session: SessionV2Dto;
  color?: string | undefined;
  isLast: boolean;
}) {
  const start = new Date(session.startAt);
  const end = new Date(session.endAt);
  const dateLabel = format(start, 'EEE d MMM yyyy', { locale: fr });
  const timeLabel = `${format(start, 'HH:mm')} → ${format(end, 'HH:mm')}`;
  const teacher = session.enseignant?.nomComplet ?? session.intervenantNom ?? null;
  const salle = session.salle?.name ?? null;

  return (
    <li className="flex gap-3">
      {/* Rail : pastille (couleur du module) + ligne verticale de liaison */}
      <div className="flex flex-col items-center">
        <span
          className="mt-1.5 size-2.5 flex-shrink-0 rounded-full bg-text-muted ring-4 ring-surface"
          style={color ? { background: color } : undefined}
          aria-hidden
        />
        {!isLast ? <span className="w-px flex-1 bg-border-soft" aria-hidden /> : null}
      </div>

      {/* Contenu */}
      <div className={isLast ? 'pb-0' : 'pb-5'}>
        <div className="text-[13px] font-semibold capitalize text-text">
          {dateLabel}
          <span className="ml-2 font-normal tabular-nums text-text-sec">{timeLabel}</span>
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[12px] text-text-muted">
          <MapPinIcon size={11} color="currentColor" />
          <span className={salle ? undefined : 'italic'}>{salle ?? 'Salle non assignée'}</span>
          {teacher ? (
            <>
              <span aria-hidden>·</span>
              <span>{teacher}</span>
            </>
          ) : null}
        </div>
      </div>
    </li>
  );
}

/** Skeleton timeline pendant le lazy load (aucun texte « Chargement »). */
function SeancesTimelineSkeleton() {
  return (
    <div
      className="flex flex-col gap-4"
      role="status"
      aria-busy="true"
      aria-label="Chargement des séances"
    >
      <div className="h-3 w-20 animate-pulse rounded bg-border-soft" />
      <ol className="flex flex-col">
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className="mt-1.5 size-2.5 flex-shrink-0 animate-pulse rounded-full bg-border-soft" />
              {i < 3 ? <span className="w-px flex-1 bg-border-soft" /> : null}
            </div>
            <div className="flex-1 pb-5">
              <div className="h-3.5 w-44 animate-pulse rounded bg-border-soft" />
              <div className="mt-2 h-3 w-32 animate-pulse rounded bg-border-soft" />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
