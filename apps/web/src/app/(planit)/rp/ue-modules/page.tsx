// "use client" — état local : accordéon, modals, interactions
'use client';

import { useState } from 'react';
import { type UEDto, type ModuleV2Dto } from '@planit/contracts';
import { ChevronDownIcon } from '@planit/ui';
import { Shell } from '@/components/layout/shell';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast-provider';
import { useUesQuery } from '@/lib/queries';
import { useDeleteUeMutation, useDeleteModuleMutation } from '@/lib/mutations';
import { UeModal } from '@/components/rp/ue-modules/ue-modal';
import { ModuleModal } from '@/components/rp/ue-modules/module-modal';
import { cn } from '@/lib/utils';

type UeModalState =
  | { open: false }
  | { open: true; mode: 'create' }
  | { open: true; mode: 'edit'; initial: UEDto };

type ModuleModalState =
  | { open: false }
  | { open: true; mode: 'create'; ueId: string }
  | { open: true; mode: 'edit'; ueId: string; initial: ModuleV2Dto };

export default function UeModulesPage() {
  const toast = useToast();

  const { data: ues, isLoading, isError } = useUesQuery();
  const deleteUeMutation = useDeleteUeMutation();
  const deleteModuleMutation = useDeleteModuleMutation();

  const [openUeIds, setOpenUeIds] = useState<Set<string>>(new Set());
  const [ueModal, setUeModal] = useState<UeModalState>({ open: false });
  const [moduleModal, setModuleModal] = useState<ModuleModalState>({ open: false });

  function toggleUe(id: string) {
    setOpenUeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleDeleteUe(ue: UEDto) {
    const confirmed = window.confirm(`Supprimer l'UE "${ue.libelle}" et tous ses modules ?`);
    if (!confirmed) return;
    try {
      await deleteUeMutation.mutateAsync(ue.id);
      toast.show('UE supprimée.', { variant: 'success' });
    } catch {
      toast.show("Impossible de supprimer l'UE.", { variant: 'error' });
    }
  }

  async function handleDeleteModule(mod: ModuleV2Dto) {
    const confirmed = window.confirm(`Supprimer le module "${mod.libelle}" ?`);
    if (!confirmed) return;
    try {
      await deleteModuleMutation.mutateAsync(mod.id);
      toast.show('Module supprimé.', { variant: 'success' });
    } catch {
      toast.show('Impossible de supprimer le module.', { variant: 'error' });
    }
  }

  return (
    <Shell
      title="UE & Modules"
      breadcrumb={[{ label: 'Espace RP' }, { label: 'UE & Modules' }]}
      activeNavId="modules"
    >
      {/* Toolbar */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-text">UE & Modules</h2>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setUeModal({ open: true, mode: 'create' })}
        >
          + Nouvelle UE
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <p className="text-sm text-text-muted">Chargement...</p>
      ) : isError ? (
        <p className="text-sm text-err">Impossible de charger les UE.</p>
      ) : !ues || ues.length === 0 ? (
        <p className="text-sm text-text-muted">Aucune UE créée.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {ues.map((ue) => {
            const isOpen = openUeIds.has(ue.id);
            return (
              <div
                key={ue.id}
                className="overflow-hidden rounded-xl border border-border-soft bg-surface shadow-sm"
              >
                {/* UE header */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <div
                    className="h-3.5 w-3.5 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: ue.color }}
                    aria-hidden="true"
                  />
                  <span className="font-semibold text-text">{ue.code}</span>
                  <span className="text-text-muted">·</span>
                  <span className="flex-1 text-sm text-text-muted">{ue.libelle}</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setUeModal({ open: true, mode: 'edit', initial: ue })}
                    >
                      Éditer
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setModuleModal({ open: true, mode: 'create', ueId: ue.id })}
                    >
                      + Module
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDeleteUe(ue)}
                      disabled={deleteUeMutation.isPending}
                    >
                      Supprimer
                    </Button>
                    <button
                      type="button"
                      onClick={() => toggleUe(ue.id)}
                      aria-expanded={isOpen}
                      aria-label={isOpen ? 'Réduire' : 'Développer'}
                      className="rounded p-1 text-text-muted hover:text-text"
                    >
                      <span
                        style={{
                          display: 'inline-flex',
                          transition: 'transform .2s ease',
                          transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                        }}
                      >
                        <ChevronDownIcon size={16} color="currentColor" />
                      </span>
                    </button>
                  </div>
                </div>

                {/* Modules list */}
                {isOpen && (
                  <div className="border-t border-border-soft bg-bg px-4 py-2">
                    {ue.modules.length === 0 ? (
                      <p className="py-2 text-sm text-text-muted">Aucun module dans cette UE.</p>
                    ) : (
                      <ul className="flex flex-col gap-1">
                        {ue.modules.map((mod) => (
                          <li
                            key={mod.id}
                            className={cn(
                              'flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-surface',
                            )}
                          >
                            <div
                              className="h-3 w-3 flex-shrink-0 rounded-full"
                              style={{ backgroundColor: mod.color }}
                              aria-hidden="true"
                            />
                            <span className="text-sm font-medium text-text">{mod.code}</span>
                            <span className="text-text-muted">·</span>
                            <span className="flex-1 text-sm text-text-muted">{mod.libelle}</span>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setModuleModal({
                                    open: true,
                                    mode: 'edit',
                                    ueId: ue.id,
                                    initial: mod,
                                  })
                                }
                              >
                                Éditer
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleDeleteModule(mod)}
                                disabled={deleteModuleMutation.isPending}
                              >
                                Supprimer
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* UE Modal */}
      <UeModal
        isOpen={ueModal.open}
        onClose={() => setUeModal({ open: false })}
        mode={ueModal.open ? ueModal.mode : 'create'}
        initial={ueModal.open && ueModal.mode === 'edit' ? ueModal.initial : undefined}
      />

      {/* Module Modal */}
      <ModuleModal
        isOpen={moduleModal.open}
        onClose={() => setModuleModal({ open: false })}
        mode={moduleModal.open ? moduleModal.mode : 'create'}
        ueId={moduleModal.open ? moduleModal.ueId : ''}
        initial={moduleModal.open && moduleModal.mode === 'edit' ? moduleModal.initial : undefined}
      />
    </Shell>
  );
}
