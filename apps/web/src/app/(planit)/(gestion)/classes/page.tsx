'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { type ClasseV3Dto } from '@planit/contracts';
import { ChevronRightIcon } from '@planit/ui';
import { Shell } from '@/components/layout/shell';
import { Button } from '@/components/ui/button';
import { useIsRp } from '@/hooks/use-role';
import { useFilieresQuery } from '@/lib/queries';
import { useAnneesQuery, useClassesV3Query } from '@/lib/queries-v3';
import { ClasseModal } from '@/components/rp/classes/classe-modal';
import { ClassesTableSkeleton } from '@/components/rp/classes/classes-table-skeleton';

// ── Icône inline ──────────────────────────────────────────────────────
function PencilIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function NiveauBadge({ niveau }: { niveau: string | null }) {
  if (niveau === null) return null;
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

// Barre de remplissage « Places » (inscrits / capacité).
function PlacesBar({ inscrits, capaciteMax }: { inscrits: number; capaciteMax: number }) {
  const ratio = capaciteMax > 0 ? Math.min(100, Math.round((inscrits / capaciteMax) * 100)) : 0;
  const full = capaciteMax > 0 && inscrits >= capaciteMax;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full border border-border-soft bg-bg">
        <div
          className="h-full rounded-full"
          style={{
            width: `${ratio}%`,
            backgroundColor: full ? 'var(--color-err)' : 'var(--color-accent)',
          }}
        />
      </div>
      <span className="min-w-[52px] text-right text-[12px] font-semibold tabular-nums text-text-sec">
        {inscrits}/{capaciteMax}
      </span>
    </div>
  );
}

// ── Types modal ───────────────────────────────────────────────────────
type ModalState =
  | { open: false }
  | { open: true; mode: 'create' }
  | { open: true; mode: 'edit'; initial: ClasseV3Dto };

const COLS = 'grid grid-cols-[1.7fr_120px_110px_190px_auto] items-center gap-3';

// ── Page (inner — useSearchParams nécessite un Suspense en Next 15) ────
function ClassesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRp = useIsRp();

  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');
  const [filiereFilter, setFiliereFilter] = useState(searchParams.get('filiere') ?? '');
  const [anneeFilter, setAnneeFilter] = useState('');
  const [modal, setModal] = useState<ModalState>({ open: false });

  // Debounce de la recherche (évite un fetch par frappe).
  useEffect(() => {
    const t = setTimeout(() => setQ(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const filieresQuery = useFilieresQuery();
  const anneesQuery = useAnneesQuery();
  // Mémoïsé : `?? []` crée une nouvelle ref à chaque rendu (deps useMemo).
  const annees = useMemo(() => anneesQuery.data ?? [], [anneesQuery.data]);
  const currentYearId = useMemo(
    () => annees.find((a) => a.etat === 'EN_COURS')?.id ?? null,
    [annees],
  );

  useEffect(() => {
    if (anneeFilter === '' && currentYearId !== null) setAnneeFilter(currentYearId);
  }, [anneeFilter, currentYearId]);

  const {
    data: classes,
    isLoading,
    isError,
  } = useClassesV3Query({
    anneeId: anneeFilter === '' ? undefined : anneeFilter,
    filiereSigle: filiereFilter === '' ? undefined : filiereFilter,
    q: q === '' ? undefined : q,
  });

  const filieres = filieresQuery.data ?? [];

  return (
    <Shell
      title="Classes"
      breadcrumb={[{ label: 'Référentiels' }, { label: 'Classes' }]}
      activeNavId="classes"
      surface
    >
      {/* Toolbar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Rechercher une classe…"
            aria-label="Rechercher une classe"
            className="h-9 w-56 rounded-lg border border-border bg-surface px-3 text-sm text-text placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          {/* Filtre filière réservé au RP : la liste des filières est RP-only
              (useFilieresQuery gaté isRp) et l'AC est scopé à ses classes. */}
          {isRp ? (
            <select
              value={filiereFilter}
              onChange={(e) => setFiliereFilter(e.target.value)}
              className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Filtrer par filière"
            >
              <option value="">Toutes les filières</option>
              {filieres.map((f) => (
                <option key={f.id} value={f.sigle}>
                  {f.sigle}
                </option>
              ))}
            </select>
          ) : null}
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
        {isRp ? (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setModal({ open: true, mode: 'create' })}
          >
            + Nouvelle classe
          </Button>
        ) : null}
      </div>

      {/* Content */}
      {isLoading ? (
        <ClassesTableSkeleton />
      ) : isError ? (
        <div className="flex items-center justify-center py-16 text-sm text-err">
          Impossible de charger les classes.
        </div>
      ) : !classes || classes.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <p className="text-sm text-text-muted">Aucune classe pour ce filtre.</p>
          {isRp ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setModal({ open: true, mode: 'create' })}
            >
              Créer une classe
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border-soft bg-surface shadow-sm">
          {/* En-tête colonnes */}
          <div className={`${COLS} border-b border-border-soft bg-bg px-5 py-2.5`}>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Classe
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Double diplôme
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Année
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Places
            </span>
            <span className="w-[90px]" />
          </div>

          {/* Lignes */}
          {classes.map((c, idx) => (
            <div
              key={c.id}
              className={`${COLS} px-5 py-3.5 transition-colors hover:bg-bg ${
                idx < classes.length - 1 ? 'border-b border-border-soft' : ''
              }`}
            >
              {/* Classe */}
              <div className="flex min-w-0 items-center gap-2.5">
                <NiveauBadge niveau={c.niveau} />
                {c.filiere ? <SigleBadge sigle={c.filiere.sigle} /> : null}
                <div className="min-w-0">
                  <div className="truncate text-[13.5px] font-semibold text-text">{c.name}</div>
                  <div className="font-mono text-[11px] font-semibold text-primary">{c.code}</div>
                </div>
              </div>

              {/* Double diplôme */}
              <div>
                {c.isDoubleDiplome ? (
                  <span className="rounded-full border border-primary-100 bg-primary-100 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    Double diplôme
                  </span>
                ) : (
                  <span className="text-text-faint">—</span>
                )}
              </div>

              {/* Année */}
              <span className="text-[13px] tabular-nums text-text-sec">
                {c.anneeLibelle ?? '—'}
              </span>

              {/* Places */}
              <PlacesBar inscrits={c.places.inscrits} capaciteMax={c.places.capaciteMax} />

              {/* Actions */}
              <div className="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => router.push(`/classes/${c.id}`)}
                  className="flex h-8 items-center gap-1 rounded-lg border border-border px-3 text-[12px] font-medium text-text-sec transition-colors hover:bg-bg"
                >
                  Voir
                  <ChevronRightIcon size={12} color="currentColor" />
                </button>
                {isRp ? (
                  <button
                    type="button"
                    title="Modifier la classe"
                    onClick={() => setModal({ open: true, mode: 'edit', initial: c })}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-bg hover:text-text"
                  >
                    <PencilIcon />
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modale création/édition réservée au RP : non montée pour l'AC (sinon
          son useFormationsQuery partirait inutilement). */}
      {isRp ? (
        <ClasseModal
          isOpen={modal.open}
          onClose={() => setModal({ open: false })}
          mode={modal.open ? modal.mode : 'create'}
          initial={modal.open && modal.mode === 'edit' ? modal.initial : undefined}
        />
      ) : null}
    </Shell>
  );
}

export default function ClassesPage() {
  return (
    <Suspense fallback={null}>
      <ClassesPageInner />
    </Suspense>
  );
}
