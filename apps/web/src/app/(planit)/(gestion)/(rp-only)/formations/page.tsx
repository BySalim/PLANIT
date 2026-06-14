'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRightIcon } from '@planit/ui';
import { Shell } from '@/components/layout/shell';
import { Button } from '@/components/ui/button';
import { useIsDirection, useIsRp } from '@/hooks/use-role';
import { useFilieresQuery } from '@/lib/queries';
import { useAnneesQuery, useFormationsQuery } from '@/lib/queries-v3';
import { FormationModal } from '@/components/rp/formations/formation-modal';
import { FormationsTableSkeleton } from '@/components/rp/formations/formations-table-skeleton';
import { ResponsableCell } from '@/components/shared/responsable-cell';

function NiveauBadge({ niveau }: { niveau: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-bg-warm px-2 py-0.5 text-[11px] font-bold text-text-sec">
      {niveau}
    </span>
  );
}

function SigleBadge({ sigle }: { sigle: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-primary-100 px-2 py-0.5 text-[11px] font-semibold text-primary">
      {sigle}
    </span>
  );
}

// Colonne « Responsable » masquée pour le RP (il ne voit que ses propres
// créations → redondant) ; affichée pour la Direction (offre école-large).
const cols = (showResponsable: boolean): string =>
  `grid grid-cols-[150px_70px_1fr_120px${showResponsable ? '_180px' : ''}_auto] items-center gap-3`;

// ── Page ──────────────────────────────────────────────────────────────
export default function FormationsPage() {
  const router = useRouter();
  // V05 LOT 6 — Direction en lecture seule sur l'offre de formation (ADR-0020 §7).
  const readOnly = useIsDirection();
  // Le RP ne voit que ses formations → la colonne « Responsable » est redondante.
  const showResponsable = !useIsRp();
  const COLS = cols(showResponsable);

  const [filiereFilter, setFiliereFilter] = useState('');
  const [anneeFilter, setAnneeFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const filieresQuery = useFilieresQuery();
  const anneesQuery = useAnneesQuery();

  // Mémoïsé : `?? []` crée une nouvelle ref à chaque rendu (deps useMemo).
  const annees = useMemo(() => anneesQuery.data ?? [], [anneesQuery.data]);
  const currentYearId = useMemo(
    () => annees.find((a) => a.etat === 'EN_COURS')?.id ?? null,
    [annees],
  );

  // Défaut = année courante, une fois les années chargées.
  useEffect(() => {
    if (anneeFilter === '' && currentYearId !== null) setAnneeFilter(currentYearId);
  }, [anneeFilter, currentYearId]);

  const {
    data: formations,
    isLoading,
    isError,
  } = useFormationsQuery({
    anneeId: anneeFilter === '' ? undefined : anneeFilter,
    filiereId: filiereFilter === '' ? undefined : filiereFilter,
  });

  const filieres = filieresQuery.data ?? [];

  return (
    <Shell
      title="Formations"
      breadcrumb={[{ label: 'Offre de formation' }, { label: 'Formations' }]}
      activeNavId="formations"
      surface
    >
      {/* Toolbar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filiereFilter}
            onChange={(e) => setFiliereFilter(e.target.value)}
            className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Filtrer par filière"
          >
            <option value="">Toutes les filières</option>
            {filieres.map((f) => (
              <option key={f.id} value={f.id}>
                {f.sigle}
              </option>
            ))}
          </select>
          <select
            value={anneeFilter}
            onChange={(e) => setAnneeFilter(e.target.value)}
            className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Filtrer par année"
          >
            <option value="">Toutes les années</option>
            {annees.map((a) => (
              <option key={a.id} value={a.id}>
                {a.libelle}
                {a.etat === 'EN_COURS' ? ' (en cours)' : ''}
              </option>
            ))}
          </select>
        </div>
        {readOnly ? null : (
          <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
            + Nouvelle formation
          </Button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <FormationsTableSkeleton />
      ) : isError ? (
        <div className="flex items-center justify-center py-16 text-sm text-err">
          Impossible de charger les formations.
        </div>
      ) : !formations || formations.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <p className="text-sm text-text-muted">Aucune formation pour ce filtre.</p>
          {readOnly ? null : (
            <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
              Créer une formation
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border-soft bg-surface shadow-sm">
          {/* En-tête colonnes */}
          <div className={`${COLS} border-b border-border-soft bg-bg px-5 py-2.5`}>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Code
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Niveau
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Filière
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Année
            </span>
            {showResponsable ? (
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                Responsable
              </span>
            ) : null}
            <span className="w-[290px]" />
          </div>

          {/* Lignes */}
          {formations.map((f, idx) => (
            <div
              key={f.id}
              className={`${COLS} px-5 py-3.5 transition-colors hover:bg-bg ${
                idx < formations.length - 1 ? 'border-b border-border-soft' : ''
              }`}
            >
              <span className="font-mono text-[12px] font-semibold text-primary">{f.code}</span>
              <div>
                <NiveauBadge niveau={f.niveau} />
              </div>
              <div className="flex items-center gap-2">
                {f.filiere ? <SigleBadge sigle={f.filiere.sigle} /> : null}
                <span className="truncate text-sm text-text-sec">{f.filiere?.libelle ?? '—'}</span>
              </div>
              <span className="text-[13px] tabular-nums text-text-sec">
                {f.anneeLibelle ?? '—'}
              </span>

              {/* Responsable (V05 LOT 4.3) — masqué pour le RP */}
              {showResponsable ? <ResponsableCell responsable={f.responsable ?? null} /> : null}

              {/* Actions */}
              <div className="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      f.filiere
                        ? `/classes?filiere=${encodeURIComponent(f.filiere.sigle)}`
                        : '/classes',
                    )
                  }
                  className="flex h-8 items-center gap-1 rounded-lg border border-border px-3 text-[12px] font-medium text-text-sec transition-colors hover:bg-bg"
                >
                  Classes
                  <ChevronRightIcon size={12} color="currentColor" />
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/maquettes')}
                  className="flex h-8 items-center gap-1 rounded-lg border border-border px-3 text-[12px] font-medium text-text-sec transition-colors hover:bg-bg"
                >
                  Maquette
                  <ChevronRightIcon size={12} color="currentColor" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <FormationModal isOpen={createOpen} onClose={() => setCreateOpen(false)} />
    </Shell>
  );
}
