'use client';

// Page Année académique (V05 LOT 3 — tâche 3.8).
// Pilotage du cycle de vie des années : PLANIFIEE → EN_COURS → CLOTUREE.
// État interactif (mutations, confirm) → 'use client'.

import { useState } from 'react';
import { type AnneeAcademiqueDto, type AnneeEtat } from '@planit/contracts';
import { Shell } from '@/components/layout/shell';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast-provider';
import { AnneeModal } from '@/components/direction/annee-modal';
import { useAnneesDirectionQuery } from '@/lib/direction-queries';
import { useDebuterAnneeMutation, useCloturerAnneeMutation } from '@/lib/direction-mutations';

type ModalState =
  | { open: false }
  | { open: true; mode: 'create' }
  | { open: true; mode: 'edit'; initial: AnneeAcademiqueDto };

type EtatBadgeProps = {
  etat: AnneeEtat;
};

function EtatBadge({ etat }: EtatBadgeProps) {
  if (etat === 'EN_COURS') {
    return (
      <span className="inline-flex items-center rounded-full bg-primary-100 px-2.5 py-0.5 text-[11px] font-semibold text-primary-700">
        En cours
      </span>
    );
  }
  if (etat === 'PLANIFIEE') {
    return (
      <span className="inline-flex items-center rounded-full bg-bg-warm px-2.5 py-0.5 text-[11px] font-semibold text-text-muted">
        Planifiée
      </span>
    );
  }
  if (etat === 'CLOTUREE') {
    return (
      <span className="inline-flex items-center rounded-full bg-border-soft px-2.5 py-0.5 text-[11px] font-semibold text-text-sec">
        Clôturée
      </span>
    );
  }
  // SUSPENDUE
  return (
    <span className="inline-flex items-center rounded-full bg-warn-100 px-2.5 py-0.5 text-[11px] font-semibold text-warn">
      Suspendue
    </span>
  );
}

function formatDate(isoStr: string): string {
  return new Date(isoStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

type AnneeRowProps = {
  annee: AnneeAcademiqueDto;
  hasEnCours: boolean;
  onEdit: (annee: AnneeAcademiqueDto) => void;
};

function AnneeRow({ annee, hasEnCours, onEdit }: AnneeRowProps) {
  const toast = useToast();
  const debuterMutation = useDebuterAnneeMutation();
  const cloturerMutation = useCloturerAnneeMutation();

  async function handleDebuter() {
    const confirmed = window.confirm(
      `Débuter l'année ${annee.libelle} ? Elle passera en statut "En cours".`,
    );
    if (!confirmed) return;
    try {
      await debuterMutation.mutateAsync(annee.id);
      toast.show(`Année ${annee.libelle} débutée.`, { variant: 'success' });
    } catch {
      toast.show(`Erreur lors du démarrage de l'année.`, { variant: 'error' });
    }
  }

  async function handleCloturer() {
    const confirmed = window.confirm(
      `Clôturer l'année ${annee.libelle} ? Cette action est irréversible.`,
    );
    if (!confirmed) return;
    try {
      await cloturerMutation.mutateAsync(annee.id);
      toast.show(`Année ${annee.libelle} clôturée.`, { variant: 'success' });
    } catch {
      toast.show(`Erreur lors de la clôture de l'année.`, { variant: 'error' });
    }
  }

  const debuterDisabled = hasEnCours || debuterMutation.isPending;

  return (
    <tr className="border-b border-border-soft last:border-0">
      <td className="px-5 py-3.5">
        <span className="font-semibold text-text">{annee.libelle}</span>
      </td>
      <td className="px-5 py-3.5 text-text-muted">
        {formatDate(annee.debut)} → {formatDate(annee.fin)}
      </td>
      <td className="px-5 py-3.5">
        <EtatBadge etat={annee.etat} />
      </td>
      <td className="px-5 py-3.5">
        <div className="flex items-center justify-end gap-2">
          {/* V05 LOT 7 — édition libellé/dates (sauf année clôturée). */}
          {annee.etat !== 'CLOTUREE' ? (
            <Button variant="ghost" size="sm" onClick={() => onEdit(annee)}>
              Modifier
            </Button>
          ) : null}
          {annee.etat === 'PLANIFIEE' ? (
            <span title={hasEnCours ? 'Une année est déjà en cours' : undefined}>
              <Button
                variant="primary"
                size="sm"
                onClick={() => void handleDebuter()}
                disabled={debuterDisabled}
              >
                Débuter
              </Button>
            </span>
          ) : annee.etat === 'EN_COURS' ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void handleCloturer()}
              disabled={cloturerMutation.isPending}
            >
              Clôturer
            </Button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

// Next.js App Router requires default export for page
// eslint-disable-next-line no-restricted-syntax
export default function AnneesPage() {
  const anneesQuery = useAnneesDirectionQuery();
  const [modal, setModal] = useState<ModalState>({ open: false });

  const sorted = [...(anneesQuery.data ?? [])].sort((a, b) => {
    // EN_COURS en premier, puis PLANIFIEE, puis CLOTUREE/SUSPENDUE par date fin desc
    const order: Record<AnneeAcademiqueDto['etat'], number> = {
      EN_COURS: 0,
      PLANIFIEE: 1,
      SUSPENDUE: 2,
      CLOTUREE: 3,
    };
    const diff = order[a.etat] - order[b.etat];
    if (diff !== 0) return diff;
    return new Date(b.fin).getTime() - new Date(a.fin).getTime();
  });

  const hasEnCours = sorted.some((a) => a.etat === 'EN_COURS');

  return (
    <Shell
      title="Année académique"
      breadcrumb={[{ label: 'Mon école' }, { label: 'Année académique' }]}
      activeNavId="annees"
      surface
    >
      <div className="mb-4 flex items-center justify-end">
        <Button
          variant="primary"
          size="sm"
          onClick={() => setModal({ open: true, mode: 'create' })}
        >
          + Planifier une année
        </Button>
      </div>

      <AnneeModal
        isOpen={modal.open}
        onClose={() => setModal({ open: false })}
        mode={modal.open ? modal.mode : 'create'}
        initial={modal.open && modal.mode === 'edit' ? modal.initial : undefined}
      />

      {anneesQuery.isLoading ? (
        <div className="overflow-hidden rounded-2xl border border-border-soft bg-surface shadow-sm">
          <div className="border-b border-border-soft bg-bg px-5 py-2.5">
            <span
              className="h-4 w-32 animate-pulse rounded bg-border-soft inline-block"
              aria-hidden
            />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 border-b border-border-soft px-5 py-3.5 last:border-0"
            >
              <span className="h-3.5 w-24 animate-pulse rounded bg-border-soft" aria-hidden />
              <span className="h-3.5 w-40 animate-pulse rounded bg-border-soft" aria-hidden />
              <span className="h-5 w-16 animate-pulse rounded-full bg-border-soft" aria-hidden />
            </div>
          ))}
        </div>
      ) : anneesQuery.isError ? (
        <div className="rounded-2xl border border-err-100 bg-err-100 px-6 py-4 text-sm text-err">
          Erreur lors du chargement des années académiques.
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-2xl border border-border-soft bg-surface px-6 py-12 text-center text-sm text-text-muted">
          Aucune année académique enregistrée.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border-soft bg-surface shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-[13.5px]">
              <thead>
                <tr className="border-b border-border-soft bg-bg">
                  <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    Libellé
                  </th>
                  <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    Période
                  </th>
                  <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    Statut
                  </th>
                  <th className="px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((annee) => (
                  <AnneeRow
                    key={annee.id}
                    annee={annee}
                    hasEnCours={hasEnCours}
                    onEdit={(a) => setModal({ open: true, mode: 'edit', initial: a })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Shell>
  );
}
