'use client';

import { useMemo } from 'react';
import type { ClasseRef } from '@planit/contracts';
import { Select } from '@/components/ui/select';
import { useClassesQuery } from '@/lib/queries-v2';
import { cn } from '@/lib/utils';

/**
 * <ClasseChipsPicker> — LOT 3 V02 R.3
 *
 * Sélection multiple de classes par chips, alimenté par GET /api/classes.
 * Conçu pour le formulaire séance V2 (multi-classes V2-D6) mais réutilisable
 * partout où un référentiel classe est requis.
 *
 * - `value` : tableau d'IDs sélectionnés (string[])
 * - `onChange` : émis à chaque ajout/retrait
 * - `min` : nombre min de classes (défaut 1, sert au message d'erreur)
 * - `error` : message d'erreur Zod à afficher
 * - `disabled` : désactive tout (drawer read-only par exemple)
 *
 * UX : pas d'autocomplete texte (liste seed < 10 classes en V02). Un <select>
 * affiche les classes non encore sélectionnées + bouton « Ajouter », et chaque
 * chip affiche le code de classe avec un ✕ pour la retirer.
 */
export interface ClasseChipsPickerProps {
  readonly value: readonly string[];
  readonly onChange: (classeIds: string[]) => void;
  readonly min?: number;
  readonly error?: string | undefined;
  readonly disabled?: boolean | undefined;
  readonly id?: string | undefined;
}

export function ClasseChipsPicker({
  value,
  onChange,
  min = 1,
  error,
  disabled = false,
  id,
}: ClasseChipsPickerProps) {
  const query = useClassesQuery();
  const classes: readonly ClasseRef[] = useMemo(() => query.data ?? [], [query.data]);

  // Map id → classe pour afficher les chips sélectionnées dans l'ordre `value`.
  const byId = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes]);
  const selected = useMemo<readonly ClasseRef[]>(
    () => value.map((id) => byId.get(id)).filter((c): c is ClasseRef => c !== undefined),
    [value, byId],
  );
  // Options du select : classes non encore sélectionnées, alphabétique par code.
  const available = useMemo<readonly ClasseRef[]>(
    () => classes.filter((c) => !value.includes(c.id)),
    [classes, value],
  );

  const handleAdd = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    if (!newId || value.includes(newId)) return;
    onChange([...value, newId]);
    // Reset le select pour permettre de re-sélectionner si retrait.
    e.target.value = '';
  };

  const handleRemove = (classeId: string) => {
    onChange(value.filter((c) => c !== classeId));
  };

  const showMinError = value.length < min && error === undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {/* Chips déjà sélectionnées */}
      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((c) => (
            <span
              key={c.id}
              className={cn(
                'inline-flex h-7 items-center gap-1 rounded-full border border-primary-200 bg-primary-50 pl-2.5 pr-1 text-[12px] font-semibold text-primary',
                disabled && 'opacity-60',
              )}
            >
              {c.code}
              {!disabled ? (
                <button
                  type="button"
                  onClick={() => handleRemove(c.id)}
                  aria-label={`Retirer la classe ${c.code}`}
                  className="ml-0.5 inline-flex size-5 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    aria-hidden
                  >
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              ) : null}
            </span>
          ))}
        </div>
      ) : null}

      {/* Sélecteur « ajouter une classe » — seulement si reste à ajouter */}
      {available.length > 0 && !disabled ? (
        <Select
          id={id}
          value=""
          onChange={handleAdd}
          aria-label="Ajouter une classe"
          invalid={error !== undefined || showMinError}
          disabled={query.isLoading}
        >
          <option value="" disabled>
            {query.isLoading ? 'Chargement…' : '+ Ajouter une classe'}
          </option>
          {available.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} — {c.name}
            </option>
          ))}
        </Select>
      ) : null}

      {/* Aucune classe disponible et aucune sélectionnée (cas seed vide) */}
      {classes.length === 0 && !query.isLoading ? (
        <p className="text-xs text-text-muted">Aucune classe disponible.</p>
      ) : null}

      {/* Message d'erreur (priorité au prop `error` venant de Zod, sinon min) */}
      {error !== undefined ? (
        <p role="alert" className="text-xs text-err">
          {error}
        </p>
      ) : showMinError ? (
        <p role="alert" className="text-xs text-err">
          {min === 1
            ? 'Sélectionnez au moins une classe.'
            : `Sélectionnez au moins ${min} classes.`}
        </p>
      ) : null}
    </div>
  );
}
