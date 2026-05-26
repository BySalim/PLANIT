// "use client" — état local : pagination, filtre, modal, interactions table
'use client';

import { useState } from 'react';
import { type EnseignantDto } from '@planit/contracts';
import { Shell } from '@/components/layout/shell';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast-provider';
import { useEnseignantsQuery } from '@/lib/queries';
import { useDeleteEnseignantMutation } from '@/lib/mutations';
import { EnseignantModal } from '@/components/rp/enseignants/enseignant-modal';

export default function EnseignantsPage() {
  const toast = useToast();

  const [page, setPage] = useState(1);
  const [statut, setStatut] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EnseignantDto | undefined>(undefined);

  const { data, isLoading, isError } = useEnseignantsQuery(
    page,
    statut.length > 0 ? statut : undefined,
  );
  const deleteMutation = useDeleteEnseignantMutation();

  const PAGE_SIZE = 50;
  const total = data?.total ?? 0;
  const hasPrev = page > 1;
  const hasNext = total > page * PAGE_SIZE;

  function openCreate() {
    setEditTarget(undefined);
    setModalOpen(true);
  }

  function openEdit(enseignant: EnseignantDto) {
    setEditTarget(enseignant);
    setModalOpen(true);
  }

  async function handleDelete(enseignant: EnseignantDto) {
    const confirmed = window.confirm('Supprimer cet enseignant ?');
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync(enseignant.id);
      toast.show('Enseignant supprimé.', { variant: 'success' });
    } catch {
      toast.show("Impossible de supprimer l'enseignant.", { variant: 'error' });
    }
  }

  return (
    <Shell
      title="Enseignants"
      breadcrumb={[{ label: 'Espace RP' }, { label: 'Enseignants' }]}
      activeNavId="teachers"
    >
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-text">Enseignants</h2>
          {total > 0 ? (
            <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {total}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <Select
            className="h-9 w-44 text-sm"
            value={statut}
            onChange={(e) => {
              setStatut(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tous les statuts</option>
            <option value="PERMANENT">Permanent</option>
            <option value="VACATAIRE">Vacataire</option>
          </Select>
          <Button variant="primary" size="sm" onClick={openCreate}>
            + Ajouter
          </Button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="text-sm text-text-muted">Chargement...</p>
      ) : isError ? (
        <p className="text-sm text-err">Impossible de charger les enseignants.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-border-soft bg-surface shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Nom complet
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Statut
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Spécialité
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                    WhatsApp
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {(data?.items.length ?? 0) === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-text-muted">
                      Aucun enseignant trouvé.
                    </td>
                  </tr>
                ) : (
                  (data?.items ?? []).map((enseignant: EnseignantDto) => (
                    <tr
                      key={enseignant.id}
                      className="border-b border-border-soft last:border-b-0 hover:bg-bg"
                    >
                      <td className="px-4 py-3 font-medium text-text">{enseignant.nomComplet}</td>
                      <td className="px-4 py-3 text-text-muted">
                        {enseignant.emailInstitutionnel}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            enseignant.statut === 'PERMANENT'
                              ? 'rounded-full bg-ok-100 px-2 py-0.5 text-xs font-semibold text-ok'
                              : 'rounded-full bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary'
                          }
                        >
                          {enseignant.statut === 'PERMANENT' ? 'Permanent' : 'Vacataire'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-muted">{enseignant.specialite}</td>
                      <td className="px-4 py-3 text-text-muted">{enseignant.whatsapp ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(enseignant)}>
                            Modifier
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDelete(enseignant)}
                            disabled={deleteMutation.isPending}
                          >
                            Supprimer
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {(hasPrev || hasNext) && (
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => p - 1)}
                disabled={!hasPrev}
              >
                Précédent
              </Button>
              <span className="text-sm text-text-muted">Page {page}</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasNext}
              >
                Suivant
              </Button>
            </div>
          )}
        </>
      )}

      <EnseignantModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        mode={editTarget !== undefined ? 'edit' : 'create'}
        initial={editTarget}
      />
    </Shell>
  );
}
