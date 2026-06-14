'use client';

import { useState } from 'react';
import { type EcoleDto } from '@planit/contracts';
import { Shell } from '@/components/layout/shell';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast-provider';
import { AdminTableSkeleton } from '@/components/admin/admin-table-skeleton';
import { EcoleModal } from '@/components/admin/ecole-modal';
import { useEcolesQuery } from '@/lib/admin-queries';
import { useArchiveEcoleMutation } from '@/lib/admin-mutations';

// Next.js App Router requires default export for page
// eslint-disable-next-line no-restricted-syntax
export default function EcolesPage() {
  const toast = useToast();
  const { data: ecoles, isLoading, isError } = useEcolesQuery();
  const archiveMutation = useArchiveEcoleMutation();

  const [ecoleModalOpen, setEcoleModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EcoleDto | undefined>(undefined);

  function openCreate() {
    setEditTarget(undefined);
    setEcoleModalOpen(true);
  }
  function openEdit(ecole: EcoleDto) {
    setEditTarget(ecole);
    setEcoleModalOpen(true);
  }

  async function handleArchive(ecole: EcoleDto) {
    if (
      !window.confirm(
        `Archiver « ${ecole.nom} » ? L'école sortira des listes (réversible côté BD).`,
      )
    ) {
      return;
    }
    try {
      await archiveMutation.mutateAsync(ecole.id);
      toast.show('École archivée.', { variant: 'success' });
    } catch {
      toast.show("Impossible d'archiver l'école.", { variant: 'error' });
    }
  }

  const items = ecoles ?? [];

  return (
    <Shell
      title="Écoles"
      breadcrumb={[{ label: 'Système' }, { label: 'Écoles' }]}
      activeNavId="ecoles"
      surface
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-muted">
          {items.length} école{items.length > 1 ? 's' : ''} active{items.length > 1 ? 's' : ''}
        </p>
        <Button variant="primary" size="sm" onClick={openCreate}>
          + Créer une école
        </Button>
      </div>

      {isLoading ? (
        <AdminTableSkeleton />
      ) : isError ? (
        <div className="flex items-center justify-center py-16 text-sm text-err">
          Impossible de charger les écoles.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border-soft bg-surface shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-soft bg-bg">
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  École
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  Direction
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  Statut
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-sm text-text-muted">
                    Aucune école. Créez-en une pour démarrer.
                  </td>
                </tr>
              ) : (
                items.map((ecole) => (
                  <tr
                    key={ecole.id}
                    className="border-b border-border-soft transition-colors last:border-b-0 hover:bg-bg"
                  >
                    <td className="px-5 py-3.5 font-semibold text-text">{ecole.nom}</td>
                    <td className="px-4 py-3.5">
                      {ecole.direction ? (
                        <div className="flex flex-col">
                          <span className="flex items-center gap-2 font-medium text-text">
                            {ecole.direction.fullName}
                            {ecole.direction.statut === 'SUSPENDU' ? (
                              <span className="inline-flex items-center rounded-md border border-err/20 bg-err-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-err">
                                Suspendu
                              </span>
                            ) : null}
                          </span>
                          <span className="text-[12px] text-text-muted">
                            {ecole.direction.email}
                          </span>
                        </div>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center rounded-md border border-ok/20 bg-ok-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ok">
                        Active
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="secondary" size="sm" onClick={() => openEdit(ecole)}>
                          Modifier
                        </Button>
                        <button
                          type="button"
                          onClick={() => handleArchive(ecole)}
                          disabled={archiveMutation.isPending}
                          className="flex h-8 items-center rounded-lg border border-border px-3 text-[12px] font-medium text-text-muted transition-colors hover:border-err hover:text-err disabled:opacity-50"
                        >
                          Archiver
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <EcoleModal
        isOpen={ecoleModalOpen}
        onClose={() => setEcoleModalOpen(false)}
        mode={editTarget !== undefined ? 'edit' : 'create'}
        initial={editTarget}
      />
    </Shell>
  );
}
