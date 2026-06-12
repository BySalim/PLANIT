'use client';

import { useMemo, useState } from 'react';
import { semestreAbsolu } from '@planit/utils';
import { Modal } from '@/components/ui/modal';

export interface ModulePickerGroup {
  readonly ueId: string;
  readonly ueCode: string;
  readonly ueLibelle: string;
  readonly ueColor: string;
  readonly modules: ReadonlyArray<{
    readonly id: string;
    readonly code: string;
    readonly libelle: string;
    readonly color: string;
  }>;
}

export interface AddModuleModalProps {
  readonly open: boolean;
  readonly niveau: string;
  readonly semestre: 1 | 2 | null;
  readonly groups: readonly ModulePickerGroup[];
  readonly onAdd: (moduleId: string) => void;
  readonly onClose: () => void;
}

export function AddModuleModal({
  open,
  niveau,
  semestre,
  groups,
  onAdd,
  onClose,
}: AddModuleModalProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle === '') return groups;
    return groups
      .map((g) => ({
        ...g,
        modules: g.modules.filter(
          (m) => m.libelle.toLowerCase().includes(needle) || m.code.toLowerCase().includes(needle),
        ),
      }))
      .filter((g) => g.modules.length > 0);
  }, [groups, query]);

  const title =
    semestre !== null
      ? `Ajouter un module · Semestre ${semestreAbsolu(niveau, semestre)}`
      : 'Ajouter un module';

  return (
    <Modal isOpen={open} onClose={onClose} title={title} size="md">
      <div className="flex flex-col gap-3">
        <div className="relative">
          <span
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un module"
            aria-label="Rechercher un module"
            className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm text-text shadow-sm placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>

        <div className="-mx-1 max-h-[min(58vh,440px)] overflow-y-auto px-1">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 py-12 text-center">
              <div className="flex size-11 items-center justify-center rounded-full bg-bg-warm text-text-muted">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
              </div>
              <p className="text-[13px] font-medium text-text-muted">
                {groups.length === 0 ? 'Tous les modules sont déjà placés' : 'Aucun résultat'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filtered.map((g) => (
                <div key={g.ueId}>
                  <div className="mb-1.5 flex items-center gap-2 px-1">
                    <span
                      className="rounded px-1.5 py-0.5 font-mono text-[10.5px] font-bold"
                      style={{ background: `${g.ueColor}1F`, color: g.ueColor }}
                    >
                      {g.ueCode}
                    </span>
                    <span className="truncate text-[12px] font-semibold text-text-sec">
                      {g.ueLibelle}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {g.modules.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => onAdd(m.id)}
                        className="group flex w-full items-center gap-2.5 rounded-lg border border-border-soft bg-surface px-3 py-2 text-left transition-colors hover:border-primary hover:bg-primary-50"
                      >
                        <span
                          className="rounded px-1.5 py-0.5 font-mono text-[10.5px] font-semibold"
                          style={{ background: `${m.color}1F`, color: m.color }}
                        >
                          {m.code}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[13px] text-text">
                          {m.libelle}
                        </span>
                        <span className="text-text-faint transition-colors group-hover:text-primary">
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
