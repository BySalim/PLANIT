'use client';

import { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { useUesQuery } from '@/lib/queries-v2';

export interface ModulePickerModalProps {
  readonly isOpen: boolean;
  /** Modules déjà présents dans la version (exclus de la liste). */
  readonly presentModuleIds: ReadonlySet<string>;
  readonly isAdding: boolean;
  readonly onClose: () => void;
  readonly onSelect: (moduleId: string) => void;
}

/**
 * Sélecteur de module pour composer un semestre (ADR-0018). Liste le référentiel
 * groupé **par UE** (`GET /ues?withModules=true`), exclut les modules déjà dans
 * la version. À la sélection, le module est ajouté à **0 h** ; son UE apparaît
 * automatiquement dans la maquette (on n'ajoute jamais l'UE séparément).
 */
export function ModulePickerModal({
  isOpen,
  presentModuleIds,
  isAdding,
  onClose,
  onSelect,
}: ModulePickerModalProps) {
  const uesQuery = useUesQuery();
  const [search, setSearch] = useState('');

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (uesQuery.data ?? [])
      .map((ue) => ({
        ue,
        modules: (ue.modules ?? []).filter(
          (m) =>
            !presentModuleIds.has(m.id) &&
            (q === '' || m.libelle.toLowerCase().includes(q) || m.code.toLowerCase().includes(q)),
        ),
      }))
      .filter((g) => g.modules.length > 0);
  }, [uesQuery.data, presentModuleIds, search]);

  const total = groups.reduce((acc, g) => acc + g.modules.length, 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ajouter un module" size="md">
      <div className="flex flex-col gap-3">
        <p className="text-[12.5px] text-text-muted">
          Choisissez un module du référentiel. Il sera ajouté à <strong>0&nbsp;h</strong> ; son UE
          apparaîtra automatiquement dans la maquette.
        </p>
        <input
          type="search"
          placeholder="Rechercher un module…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13px] text-text placeholder:text-text-faint focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />

        <div className="max-h-[52vh] min-h-[120px] overflow-y-auto rounded-xl border border-border-soft">
          {uesQuery.isLoading ? (
            <div className="space-y-2 p-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-9 animate-pulse rounded-lg bg-bg" />
              ))}
            </div>
          ) : total === 0 ? (
            <p className="px-4 py-10 text-center text-[12.5px] text-text-muted">
              {search !== ''
                ? 'Aucun module ne correspond.'
                : 'Tous les modules du référentiel sont déjà dans cette version.'}
            </p>
          ) : (
            groups.map(({ ue, modules }) => (
              <div key={ue.id} className="border-b border-border-soft last:border-b-0">
                <div className="flex items-center gap-2 bg-bg px-3 py-1.5">
                  <span
                    className="rounded px-1.5 py-0.5 font-mono text-[10.5px] font-bold"
                    style={{ background: `${ue.color}22`, color: ue.color }}
                  >
                    {ue.code}
                  </span>
                  <span className="truncate text-[12px] font-semibold text-text-sec">
                    {ue.libelle}
                  </span>
                </div>
                {modules.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    disabled={isAdding}
                    onClick={() => onSelect(m.id)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-primary-50 disabled:cursor-wait disabled:opacity-60"
                  >
                    <span
                      className="rounded px-1.5 py-0.5 font-mono text-[10.5px] font-semibold"
                      style={{ background: `${m.color}22`, color: m.color }}
                    >
                      {m.code}
                    </span>
                    <span className="truncate text-[13px] text-text">{m.libelle}</span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
