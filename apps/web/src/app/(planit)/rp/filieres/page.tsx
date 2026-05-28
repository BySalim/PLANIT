'use client';

import { useState } from 'react';
import { type FiliereDto } from '@planit/contracts';
import { ChevronRightIcon } from '@planit/ui';
import { Shell } from '@/components/layout/shell';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast-provider';
import { useFilieresQuery } from '@/lib/queries';
import { useDeleteFiliereMutation } from '@/lib/mutations';
import { FiliereModal } from '@/components/rp/filieres/filiere-modal';

// ── Icônes inline ─────────────────────────────────────────────────────
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

function TrashIcon() {
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
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

// ── Couleur déterministe du sigle (hash → palette) ────────────────────
const SIGLE_PALETTES = [
  { bg: 'rgba(232,98,10,0.12)', fg: '#C44E07' }, // orange
  { bg: 'rgba(124,58,237,0.12)', fg: '#6D28D9' }, // violet
  { bg: 'rgba(220,38,38,0.12)', fg: '#B91C1C' }, // red
  { bg: 'rgba(37,99,235,0.12)', fg: '#1D4ED8' }, // blue
  { bg: 'rgba(8,145,178,0.12)', fg: '#0E7490' }, // cyan
  { bg: 'rgba(22,163,74,0.12)', fg: '#15803D' }, // green
] as const;

function getSigleStyle(sigle: string) {
  let hash = 0;
  for (let i = 0; i < sigle.length; i++) {
    hash = sigle.charCodeAt(i) + ((hash << 5) - hash);
  }
  return SIGLE_PALETTES[Math.abs(hash) % SIGLE_PALETTES.length]!;
}

// ── Badge sigle coloré ────────────────────────────────────────────────
function SigleBadge({ sigle }: { sigle: string }) {
  const { bg, fg } = getSigleStyle(sigle);
  return (
    <span
      className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-bold tracking-wide"
      style={{ backgroundColor: bg, color: fg }}
    >
      {sigle}
    </span>
  );
}

// ── Badge grade ───────────────────────────────────────────────────────
const GRADE_STYLES: Record<string, { bg: string; fg: string; label: string }> = {
  LICENCE: { bg: 'rgba(37,99,235,0.10)', fg: '#1D4ED8', label: 'Licence' },
  MASTER: { bg: 'rgba(124,58,237,0.10)', fg: '#6D28D9', label: 'Master' },
  DOCTORAT: { bg: 'rgba(220,38,38,0.10)', fg: '#B91C1C', label: 'Doctorat' },
};

function GradeBadge({ grade }: { grade: string }) {
  const style = GRADE_STYLES[grade];
  if (!style) return <span className="text-sm text-text-muted">{grade}</span>;
  return (
    <span
      className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide"
      style={{ backgroundColor: style.bg, color: style.fg }}
    >
      {style.label}
    </span>
  );
}

// ── Types modal ───────────────────────────────────────────────────────
type ModalState =
  | { open: false }
  | { open: true; mode: 'create' }
  | { open: true; mode: 'edit'; initial: FiliereDto };

// ── Page ─────────────────────────────────────────────────────────────
export default function FilieresPage() {
  const toast = useToast();

  const { data: filieres, isLoading, isError } = useFilieresQuery();
  const deleteMutation = useDeleteFiliereMutation();

  const [modal, setModal] = useState<ModalState>({ open: false });

  async function handleDelete(filiere: FiliereDto) {
    const confirmed = window.confirm(`Supprimer la filière "${filiere.libelle}" ?`);
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync(filiere.id);
      toast.show('Filière supprimée.', { variant: 'success' });
    } catch {
      toast.show('Impossible de supprimer la filière.', { variant: 'error' });
    }
  }

  return (
    <Shell
      title="Filières"
      breadcrumb={[{ label: 'Offre de formation' }, { label: 'Filières' }]}
      activeNavId="filieres"
      surface
    >
      {/* Toolbar */}
      <div className="mb-5 flex items-center justify-between">
        <div>{/* filtre à venir */}</div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setModal({ open: true, mode: 'create' })}
        >
          + Nouvelle filière
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-sm text-text-muted">
          Chargement…
        </div>
      ) : isError ? (
        <div className="flex items-center justify-center py-16 text-sm text-err">
          Impossible de charger les filières.
        </div>
      ) : !filieres || filieres.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <p className="text-sm text-text-muted">Aucune filière créée.</p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setModal({ open: true, mode: 'create' })}
          >
            Créer une filière
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border-soft bg-surface shadow-sm">
          {/* En-tête colonnes */}
          <div className="grid grid-cols-[80px_1fr_140px_auto] items-center border-b border-border-soft bg-bg px-5 py-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Sigle
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Libellé
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Grade
            </span>
            <span className="w-[200px]" />
          </div>

          {/* Lignes */}
          {filieres.map((filiere, idx) => (
            <div
              key={filiere.id}
              className={`grid grid-cols-[80px_1fr_140px_auto] items-center gap-3 px-5 py-3.5 transition-colors hover:bg-bg ${
                idx < filieres.length - 1 ? 'border-b border-border-soft' : ''
              }`}
            >
              {/* Sigle */}
              <div>
                <SigleBadge sigle={filiere.sigle} />
              </div>

              {/* Libellé + double diplôme éventuel */}
              <div className="flex items-center gap-2">
                <span className="font-semibold text-text">{filiere.libelle}</span>
                {filiere.isDoubleDiplome && (
                  <span className="rounded-full border border-primary-100 bg-primary-100 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    Double diplôme
                  </span>
                )}
              </div>

              {/* Grade */}
              <div>
                <GradeBadge grade={filiere.grade} />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-1">
                {/* Formations (placeholder — V03) */}
                <button
                  type="button"
                  disabled
                  title="Formations (bientôt disponible)"
                  className="flex h-8 cursor-not-allowed items-center gap-1 rounded-lg border border-border px-3 text-[12px] font-medium text-text-muted opacity-60"
                >
                  Formations
                  <ChevronRightIcon size={12} color="currentColor" />
                </button>

                {/* Éditer */}
                <button
                  type="button"
                  title="Modifier la filière"
                  onClick={() => setModal({ open: true, mode: 'edit', initial: filiere })}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-bg hover:text-text"
                >
                  <PencilIcon />
                </button>

                {/* Supprimer */}
                <button
                  type="button"
                  title="Supprimer la filière"
                  onClick={() => void handleDelete(filiere)}
                  disabled={deleteMutation.isPending}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-err-100 hover:text-err disabled:opacity-50"
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <FiliereModal
        isOpen={modal.open}
        onClose={() => setModal({ open: false })}
        mode={modal.open ? modal.mode : 'create'}
        initial={modal.open && modal.mode === 'edit' ? modal.initial : undefined}
      />
    </Shell>
  );
}
