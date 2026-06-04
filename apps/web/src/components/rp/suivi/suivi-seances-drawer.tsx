'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { SessionV2Dto } from '@planit/contracts';
import { Drawer } from '@/components/ui/drawer';
import { useSuiviSeancesQuery } from '@/lib/queries-v3';

interface SuiviSeancesDrawerProps {
  readonly suiviId: string | null;
  readonly moduleLibelle?: string | undefined;
  readonly onClose: () => void;
}

/**
 * E.5 — Liste des séances COURS d'un module suivi (drawer latéral droit).
 *
 * Le backend filtre déjà sur type=COURS et applique le scope AC. Lecture
 * seule ; pas de navigation vers la fiche séance V3 (hors scope LOT 5).
 */
export function SuiviSeancesDrawer({ suiviId, moduleLibelle, onClose }: SuiviSeancesDrawerProps) {
  const query = useSuiviSeancesQuery(suiviId);
  const seances = query.data ?? [];
  // Ordre chronologique inverse : plus récent en haut (calque planning RP).
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
        <p className="text-sm text-text-muted">Chargement…</p>
      ) : query.error ? (
        <p
          role="alert"
          className="rounded-lg border border-err bg-err-100 px-3 py-2 text-sm text-err"
        >
          Impossible de charger les séances.
        </p>
      ) : sorted.length === 0 ? (
        <div className="rounded-lg border border-border-soft bg-bg px-4 py-6 text-center text-sm text-text-muted">
          Aucune séance n&apos;a encore eu lieu pour ce module.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            {sorted.length} séance{sorted.length > 1 ? 's' : ''}
          </div>
          <ul className="flex flex-col gap-2">
            {sorted.map((s) => (
              <SeanceItem key={s.id} session={s} />
            ))}
          </ul>
        </div>
      )}
    </Drawer>
  );
}

function SeanceItem({ session }: { session: SessionV2Dto }) {
  const start = new Date(session.startAt);
  const end = new Date(session.endAt);
  const dateLabel = format(start, 'EEE d MMM yyyy', { locale: fr });
  const timeLabel = `${format(start, 'HH:mm')} → ${format(end, 'HH:mm')}`;
  const teacherLabel = session.enseignant?.nomComplet ?? session.intervenantNom ?? '—';
  const salleLabel = session.salle?.name ?? 'Salle non assignée';

  return (
    <li className="rounded-lg border border-border-soft bg-surface p-3 shadow-sm">
      <div className="mb-1 flex items-start justify-between gap-2">
        <span className="truncate text-[13px] font-semibold text-text">{session.libelle}</span>
        {session.isPublished ? (
          <span className="inline-flex flex-shrink-0 items-center rounded-full bg-ok-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ok">
            Publiée
          </span>
        ) : (
          <span className="inline-flex flex-shrink-0 items-center rounded-full bg-warn px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-warn-text">
            Brouillon
          </span>
        )}
      </div>
      <div className="text-[12px] capitalize text-text-sec">
        {dateLabel} · <span className="tabular-nums">{timeLabel}</span>
      </div>
      <div className="mt-1 text-[12px] text-text-muted">
        {salleLabel} · {teacherLabel}
      </div>
    </li>
  );
}
