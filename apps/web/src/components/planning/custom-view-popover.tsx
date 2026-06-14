'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type { ByEntityColumn } from './planning-grid-by-entity';

interface CustomViewPopoverProps {
  /** Toutes les références disponibles pour la dimension courante. */
  allCols: readonly ByEntityColumn[];
  onClose: () => void;
  /** Valide la création : nom + ids ordonnés des références sélectionnées. */
  onCreate: (name: string, refIds: string[]) => void;
}

/**
 * V05 LOT 7.1 (réf. PLANIT-IA `CustomViewPopover`) — création d'un groupe de vue
 * custom : nom + recherche dans les références disponibles + liste des
 * sélectionnées **réordonnable par glisser-déposer** (l'ordre = ordre des
 * colonnes dans la vue by-X).
 */
export function CustomViewPopover({ allCols, onClose, onCreate }: CustomViewPopoverProps) {
  const [name, setName] = useState('Ma vue');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const byId = useMemo(() => new Map(allCols.map((c) => [c.id, c])), [allCols]);

  const q = query.trim().toLowerCase();
  const available = allCols.filter(
    (c) =>
      !selected.includes(c.id) &&
      (q === '' || c.label.toLowerCase().includes(q) || (c.sub ?? '').toLowerCase().includes(q)),
  );

  function add(id: string) {
    setSelected((prev) => [...prev, id]);
  }
  function remove(id: string) {
    setSelected((prev) => prev.filter((x) => x !== id));
  }

  // Réordonnancement par drag des éléments sélectionnés.
  function onDrop(targetId: string) {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      setOverId(null);
      return;
    }
    setSelected((prev) => {
      const next = prev.filter((x) => x !== dragId);
      const ti = next.indexOf(targetId);
      next.splice(ti === -1 ? next.length : ti, 0, dragId);
      return next;
    });
    setDragId(null);
    setOverId(null);
  }

  const canCreate = selected.length > 0 && name.trim().length > 0;

  return (
    <div className="absolute right-0 top-[calc(100%+6px)] z-50 flex max-h-[460px] w-[340px] flex-col overflow-hidden rounded-xl border border-border-soft bg-surface shadow-xl">
      {/* En-tête : nom + fermer */}
      <div className="flex items-center gap-2 border-b border-border-soft px-3 py-2.5">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom de la vue"
          aria-label="Nom de la vue"
          className="flex-1 bg-transparent text-[13.5px] font-semibold text-text outline-none placeholder:text-text-muted"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="rounded p-1 text-text-muted transition-colors hover:bg-bg"
        >
          ✕
        </button>
      </div>

      {/* Recherche */}
      <div className="border-b border-border-soft bg-bg p-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher une référence…"
          className="h-8 w-full rounded-lg border border-border bg-surface px-2.5 text-[12.5px] text-text placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Sélectionnés (réordonnables) */}
        {selected.length > 0 ? (
          <div>
            <div className="flex items-center justify-between px-3 pb-1 pt-2">
              <span className="text-[9.5px] font-bold uppercase tracking-wider text-primary">
                En tête · {selected.length}
              </span>
              <span className="text-[9px] text-text-muted">glisser pour réordonner</span>
            </div>
            {selected.map((id) => {
              const c = byId.get(id);
              if (!c) return null;
              return (
                <div
                  key={id}
                  draggable
                  onDragStart={() => setDragId(id)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setOverId(id);
                  }}
                  onDrop={() => onDrop(id)}
                  onDragEnd={() => {
                    setDragId(null);
                    setOverId(null);
                  }}
                  className={cn(
                    'flex cursor-grab items-center gap-2 px-3 py-1.5 active:cursor-grabbing',
                    overId === id && dragId !== id && 'bg-primary-50',
                  )}
                >
                  <span className="text-text-muted" aria-hidden>
                    ⠿
                  </span>
                  {c.badge ? (
                    <span className="rounded bg-bg-warm px-1 text-[9px] font-extrabold text-text-sec">
                      {c.badge}
                    </span>
                  ) : null}
                  <span className="flex-1 truncate text-[12.5px] font-medium text-text">
                    {c.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(id)}
                    aria-label={`Retirer ${c.label}`}
                    className="rounded px-1 text-text-muted transition-colors hover:bg-bg hover:text-err"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        ) : null}

        {/* Disponibles */}
        <div>
          <div className="px-3 pb-1 pt-2 text-[9.5px] font-bold uppercase tracking-wider text-text-muted">
            Disponibles
          </div>
          {available.length === 0 ? (
            <p className="px-3 py-3 text-center text-[12px] text-text-muted">Aucune référence.</p>
          ) : (
            available.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => add(c.id)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-bg"
              >
                <span className="text-primary" aria-hidden>
                  +
                </span>
                {c.badge ? (
                  <span className="rounded bg-bg-warm px-1 text-[9px] font-extrabold text-text-sec">
                    {c.badge}
                  </span>
                ) : null}
                <span className="flex-1 truncate text-[12.5px] text-text">{c.label}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Pied : créer */}
      <div className="border-t border-border-soft p-2">
        <button
          type="button"
          disabled={!canCreate}
          onClick={() => onCreate(name.trim(), selected)}
          className={cn(
            'h-8 w-full rounded-lg text-[12.5px] font-semibold transition-colors',
            canCreate
              ? 'bg-primary text-white hover:brightness-110'
              : 'cursor-not-allowed bg-bg text-text-muted',
          )}
        >
          Créer la vue
        </button>
      </div>
    </div>
  );
}
