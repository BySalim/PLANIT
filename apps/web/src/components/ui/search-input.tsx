'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  /** Valeur initiale (premier rendu). */
  readonly defaultValue?: string;
  /** Appelé avec la nouvelle valeur après le délai de debounce. */
  readonly onSearch: (value: string) => void;
  /** Placeholder visible quand vide. */
  readonly placeholder?: string;
  /** Délai de debounce en ms. Défaut 250 ms (UX fluide sans spam serveur). */
  readonly debounceMs?: number;
  readonly className?: string;
  readonly ariaLabel?: string;
}

/**
 * Champ de recherche débouncé pour pages liste (Étudiants E.2, Suivi E.4).
 *
 * Le composant garde l'état local (frappe immédiate) puis propage la valeur
 * via `onSearch` après `debounceMs` ms sans nouvelle frappe. Évite un fetch
 * par caractère tapé tout en gardant un input réactif.
 */
export function SearchInput({
  defaultValue = '',
  onSearch,
  placeholder = 'Rechercher…',
  debounceMs = 250,
  className,
  ariaLabel,
}: SearchInputProps) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    const t = setTimeout(() => onSearch(value), debounceMs);
    return () => clearTimeout(t);
    // `onSearch` est volontairement hors-deps : le parent ne stabilise
    // pas toujours la callback, mais c'est la valeur qui doit déclencher
    // le debounce — pas un changement d'identité de la fonction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, debounceMs]);

  return (
    <div className={cn('relative', className)}>
      <span
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
      >
        <svg
          width="14"
          height="14"
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
        type="search"
        aria-label={ariaLabel ?? placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm text-text shadow-sm placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      />
    </div>
  );
}
