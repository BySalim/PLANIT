'use client';

import { cn } from '@/lib/utils';

export type ViewMode = 'classique' | 'classe' | 'salle' | 'prof';

interface ViewModeTabsProps {
  active: ViewMode;
  onChange?: (mode: ViewMode) => void;
}

interface TabConfig {
  id: ViewMode;
  label: string;
  enabled: boolean;
  hint?: string;
}

// V05 LOT 6 (ADR-0022 §4) — référentiel planning : « Mon espace » (séances du RP)
// ou par Classe / Salle / Enseignant. La vue Salle montre l'occupation de l'école
// (séances des autres RP masquées).
const TABS: TabConfig[] = [
  { id: 'classique', label: 'Mon espace', enabled: true },
  { id: 'classe', label: 'Classe', enabled: true },
  { id: 'salle', label: 'Salle', enabled: true },
  { id: 'prof', label: 'Enseignant', enabled: true },
];

export function ViewModeTabs({ active, onChange }: ViewModeTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Mode de vue planning"
      className="inline-flex flex-shrink-0 items-center gap-0.5 rounded-md border border-border-soft bg-bg p-0.5"
    >
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-disabled={!tab.enabled}
            disabled={!tab.enabled}
            title={tab.hint}
            onClick={tab.enabled && onChange ? () => onChange(tab.id) : undefined}
            className={cn(
              'rounded px-2.5 py-1 text-[12px] transition-colors',
              isActive && 'bg-surface font-medium text-text shadow-sm',
              !isActive && tab.enabled && 'font-normal text-text-sec hover:text-text',
              !tab.enabled && 'cursor-not-allowed font-normal text-text-faint',
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
