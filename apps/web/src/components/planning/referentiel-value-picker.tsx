'use client';

import { ChevronDownIcon } from '@planit/ui';
import { useClassesQuery, useEnseignantsQuery, useSallesQuery } from '@/lib/queries-v2';
import type { ViewMode } from './view-mode-tabs';

interface ReferentielValuePickerProps {
  mode: ViewMode;
  value: string;
  onChange: (id: string) => void;
}

/**
 * V05 LOT 6 (ADR-0022 §4) — sélecteur de valeur du référentiel planning, contextuel
 * au mode courant. Remplace l'ancien placeholder figé « M1 IA ». En mode « Mon
 * espace », aucune valeur n'est requise (le RP voit ses propres séances).
 */
export function ReferentielValuePicker({ mode, value, onChange }: ReferentielValuePickerProps) {
  const classesQuery = useClassesQuery();
  const sallesQuery = useSallesQuery();
  const enseignantsQuery = useEnseignantsQuery();

  if (mode === 'classique') {
    return (
      <span className="inline-flex h-8 flex-shrink-0 items-center rounded-lg border border-border-soft bg-surface px-2.5 text-[12.5px] font-semibold text-text-muted">
        Mon espace
      </span>
    );
  }

  const options =
    mode === 'classe'
      ? (classesQuery.data ?? []).map((c) => ({ id: c.id, label: c.code }))
      : mode === 'salle'
        ? (sallesQuery.data ?? []).map((s) => ({ id: s.id, label: s.name }))
        : (enseignantsQuery.data ?? []).map((e) => ({ id: e.id, label: e.nomComplet }));

  const placeholder =
    mode === 'classe'
      ? 'Choisir une classe'
      : mode === 'salle'
        ? 'Choisir une salle'
        : 'Choisir un enseignant';

  return (
    <div className="relative flex-shrink-0">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={placeholder}
        className="h-8 appearance-none rounded-lg border border-border bg-surface pl-2.5 pr-7 text-[12.5px] font-semibold text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <option value="">{placeholder}…</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-text-muted">
        <ChevronDownIcon size={12} color="currentColor" />
      </span>
    </div>
  );
}
