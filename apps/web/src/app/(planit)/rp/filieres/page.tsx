// "use client" — état local : modal, interactions liste
'use client';

import { useState } from 'react';
import { type FiliereDto } from '@planit/contracts';
import { Shell } from '@/components/layout/shell';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast-provider';
import { useFilieresQuery } from '@/lib/queries';
import { useDeleteFiliereMutation } from '@/lib/mutations';
import { FiliereModal } from '@/components/rp/filieres/filiere-modal';

type ModalState =
  | { open: false }
  | { open: true; mode: 'create' }
  | { open: true; mode: 'edit'; initial: FiliereDto };

const GRADE_LABELS: Record<string, string> = {
  LICENCE: 'Licence',
  MASTER: 'Master',
  DOCTORAT: 'Doctorat',
};

const GRADE_COLORS: Record<string, string> = {
  LICENCE: 'bg-primary-100 text-primary',
  MASTER: 'bg-ok-100 text-ok',
  DOCTORAT: 'bg-err-100 text-err',
};

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
      breadcrumb={[{ label: 'Espace RP' }, { label: 'Filières' }]}
      activeNavId="filieres"
    >
      {/* Toolbar */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-text">Filières</h2>
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
        <p className="text-sm text-text-muted">Chargement...</p>
      ) : isError ? (
        <p className="text-sm text-err">Impossible de charger les filières.</p>
      ) : !filieres || filieres.length === 0 ? (
        <p className="text-sm text-text-muted">Aucune filière créée.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border-soft bg-surface shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Sigle
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Libellé
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Grade
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Double diplôme
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filieres.map((filiere) => (
                <tr
                  key={filiere.id}
                  className="border-b border-border-soft last:border-b-0 hover:bg-bg"
                >
                  <td className="px-4 py-3 font-bold text-text">{filiere.sigle}</td>
                  <td className="px-4 py-3 text-text">{filiere.libelle}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${GRADE_COLORS[filiere.grade] ?? 'bg-bg text-text-muted'}`}
                    >
                      {GRADE_LABELS[filiere.grade] ?? filiere.grade}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {filiere.isDoubleDiplome ? (
                      <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary">
                        Double diplôme
                      </span>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setModal({ open: true, mode: 'edit', initial: filiere })}
                      >
                        Modifier
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(filiere)}
                        disabled={deleteMutation.isPending}
                      >
                        Supprimer
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
