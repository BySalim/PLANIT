'use client';

import { addDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DaySelectProps {
  weekStart: Date;
  activeDay: number; // 0 = lundi … 6 = dimanche
  onChange: (day: number) => void;
}

/**
 * V05 LOT 7 — sélecteur de jour des vues multi-colonnes (Classe/Salle/Prof).
 * Réf. PLANIT-IA `DaySelect` : une vue by-X montre un seul jour, N colonnes.
 */
export function DaySelect({ weekStart, activeDay, onChange }: DaySelectProps) {
  return (
    <select
      value={activeDay}
      onChange={(e) => onChange(Number(e.target.value))}
      aria-label="Jour affiché"
      className="h-8 flex-shrink-0 rounded-lg border border-border bg-surface px-2.5 text-[12.5px] font-semibold text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {Array.from({ length: 7 }, (_, i) => {
        const d = addDays(weekStart, i);
        const label = format(d, 'EEEE d MMM', { locale: fr });
        return (
          <option key={i} value={i}>
            {label.charAt(0).toUpperCase() + label.slice(1)}
          </option>
        );
      })}
    </select>
  );
}
