'use client';

import { cn } from '@/lib/utils';

export type ViewScope = 'week' | 'day';

interface ViewScopeToggleProps {
  scope: ViewScope;
  onChange?: (scope: ViewScope) => void;
  sessionCount: number;
}

interface TabConfig {
  id: ViewScope;
  label: string;
  enabled: boolean;
}

const TABS: TabConfig[] = [
  { id: 'week', label: 'Semaine', enabled: true },
  // V1 : Jour reporté en Vague 02 (TD-017)
  { id: 'day', label: 'Jour', enabled: false },
];

export function ViewScopeToggle({ scope, onChange, sessionCount }: ViewScopeToggleProps) {
  return (
    <div className="flex h-9 flex-shrink-0 items-center justify-between border-b border-border-soft bg-surface px-3">
      <div
        role="tablist"
        aria-label="Étendue planning"
        className="inline-flex items-center gap-0.5 rounded-lg border border-border-soft bg-bg p-0.5"
      >
        {TABS.map((tab) => {
          const isActive = scope === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={!tab.enabled}
              title={tab.enabled ? undefined : 'Disponible Vague 02'}
              onClick={tab.enabled && onChange ? () => onChange(tab.id) : undefined}
              className={cn(
                'rounded-md px-3.5 py-1 text-[12.5px] font-semibold transition-colors',
                isActive && 'bg-primary text-white',
                !isActive && tab.enabled && 'text-text-sec hover:text-primary',
                !tab.enabled && 'cursor-not-allowed text-text-faint',
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <span className="text-[12.5px] font-medium text-text-muted">
        {sessionCount} séance{sessionCount > 1 ? 's' : ''}
      </span>
    </div>
  );
}
