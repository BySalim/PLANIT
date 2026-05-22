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

// V1: only "Classique" is implemented. Other modes will land in Vague 02 (TD-011).
const TABS: TabConfig[] = [
  { id: 'classique', label: 'Classique', enabled: true },
  { id: 'classe', label: 'Classe', enabled: false, hint: 'Disponible Vague 02' },
  { id: 'salle', label: 'Salle', enabled: false, hint: 'Disponible Vague 02' },
  { id: 'prof', label: 'Prof', enabled: false, hint: 'Disponible Vague 02' },
];

export function ViewModeTabs({ active, onChange }: ViewModeTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Mode de vue planning"
      className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface p-1"
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
              'rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors',
              isActive && 'bg-primary text-white',
              !isActive && tab.enabled && 'text-text-sec hover:bg-primary-50 hover:text-primary',
              !tab.enabled && 'cursor-not-allowed text-text-faint',
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
