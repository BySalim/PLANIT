'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDownIcon } from '@planit/ui';
import { useClassesQuery, useEnseignantsQuery, useSallesQuery } from '@/lib/queries-v2';
import { cn } from '@/lib/utils';

export type ReferentielDim = 'classe' | 'salle' | 'prof';

interface ReferentielComboboxProps {
  dim: ReferentielDim;
  value: string;
  onChange: (dim: ReferentielDim, id: string) => void;
}

interface Option {
  id: string;
  label: string;
  sub?: string;
}

const DIM_LABEL: Record<ReferentielDim, string> = {
  classe: 'Classe',
  salle: 'Salle',
  prof: 'Enseignant',
};

/**
 * V05 LOT 7 (réf. PLANIT-IA EntityCombobox) — sélecteur de référentiel de la vue
 * « Classique ». Bouton « {dimension} : {valeur} » + popover avec sous-onglets
 * Classe / Salle / Enseignant, recherche et liste. Le choix d'un élément remonte
 * `(dimension, id)` au parent (qui pilote la requête planning).
 */
export function ReferentielCombobox({ dim, value, onChange }: ReferentielComboboxProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<ReferentielDim>(dim);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  const classesQuery = useClassesQuery();
  const sallesQuery = useSallesQuery();
  const enseignantsQuery = useEnseignantsQuery();

  // À l'ouverture, l'onglet actif part de la dimension courante.
  useEffect(() => {
    if (open) {
      setTab(dim);
      setQuery('');
    }
  }, [open, dim]);

  // Fermeture au clic extérieur.
  useEffect(() => {
    if (!open) return undefined;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const optionsByDim = useMemo<Record<ReferentielDim, Option[]>>(
    () => ({
      classe: (classesQuery.data ?? []).map((c) => ({ id: c.id, label: c.code, sub: c.name })),
      salle: (sallesQuery.data ?? []).map((s) => ({ id: s.id, label: s.name })),
      prof: (enseignantsQuery.data ?? []).map((t) => ({
        id: t.id,
        label: t.nomComplet,
        ...(t.specialite ? { sub: t.specialite } : {}),
      })),
    }),
    [classesQuery.data, sallesQuery.data, enseignantsQuery.data],
  );

  // Libellé du bouton = sélection courante (dimension + valeur du parent).
  const current = optionsByDim[dim].find((o) => o.id === value);
  const buttonValue = current?.label ?? 'Choisir…';

  const q = query.trim().toLowerCase();
  const visible = optionsByDim[tab].filter(
    (o) => q === '' || o.label.toLowerCase().includes(q) || (o.sub ?? '').toLowerCase().includes(q),
  );

  function pick(id: string) {
    onChange(tab, id);
    setOpen(false);
    setQuery('');
  }

  return (
    <div ref={rootRef} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'inline-flex h-8 min-w-[180px] items-center gap-2 rounded-lg border px-2.5 text-[12.5px] font-semibold transition-colors',
          open ? 'border-primary bg-primary-50 text-primary' : 'border-border bg-surface text-text',
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
          {DIM_LABEL[dim]}
        </span>
        <span className="flex-1 text-left">{buttonValue}</span>
        <ChevronDownIcon size={12} color="currentColor" />
      </button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+6px)] z-50 flex max-h-[420px] w-[320px] flex-col overflow-hidden rounded-xl border border-border-soft bg-surface shadow-xl">
          {/* Sous-onglets dimension */}
          <div className="flex gap-1 border-b border-border-soft bg-bg p-1.5">
            {(['classe', 'salle', 'prof'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTab(t);
                  setQuery('');
                }}
                className={cn(
                  'flex-1 rounded-md px-2 py-1 text-[11.5px] font-semibold transition-colors',
                  tab === t ? 'bg-surface text-primary shadow-sm' : 'text-text-sec hover:text-text',
                )}
              >
                {DIM_LABEL[t]}
              </button>
            ))}
          </div>
          {/* Recherche */}
          <div className="border-b border-border-soft p-2">
            <input
              type="search"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher…"
              className="h-8 w-full rounded-lg border border-border bg-bg px-2.5 text-[12.5px] text-text placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
          {/* Liste */}
          <div className="flex-1 overflow-y-auto py-1" role="listbox">
            {visible.length === 0 ? (
              <p className="px-3 py-6 text-center text-[12.5px] text-text-muted">Aucun résultat.</p>
            ) : (
              visible.map((o) => {
                const isActive = tab === dim && o.id === value;
                return (
                  <button
                    key={o.id}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => pick(o.id)}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-bg',
                      isActive && 'bg-primary-50',
                    )}
                  >
                    <span className="text-[13px] font-semibold text-text">{o.label}</span>
                    {o.sub ? (
                      <span className="truncate text-[11.5px] text-text-muted">{o.sub}</span>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
