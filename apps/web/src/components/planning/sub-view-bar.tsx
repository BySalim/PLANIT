'use client';

import { useMemo, useState } from 'react';
import type { PlanningViewGroupDto } from '@planit/contracts';
import { cn } from '@/lib/utils';
import { CustomViewPopover } from './custom-view-popover';
import type { ByEntityColumn } from './planning-grid-by-entity';

/** Sélection courante : un preset (groupe prédéfini) ou une vue custom sauvegardée. */
export type SubView = { kind: 'preset'; key: string } | { kind: 'custom'; id: string };

interface SubViewBarProps {
  /** Toutes les références de la dimension (colonnes non filtrées). */
  allCols: readonly ByEntityColumn[];
  subView: SubView | null;
  onSubView: (sv: SubView | null) => void;
  savedViews: readonly PlanningViewGroupDto[];
  onCreate: (name: string, refIds: string[]) => void;
  onDelete: (id: string) => void;
}

interface Preset {
  key: string;
  count: number;
}

/**
 * V05 LOT 7.1 (réf. PLANIT-IA `SubViewBar`) — barre de groupes de vue au-dessus
 * des grilles by-X. Chips **presets** (groupes prédéfinis dérivés des références,
 * ex. niveaux pour les classes) + **vues custom** sauvegardées + bouton « + »
 * pour composer une nouvelle vue. Sélectionner un groupe filtre/ordonne les
 * colonnes ; re-cliquer désélectionne (toutes les colonnes).
 */
export function SubViewBar({
  allCols,
  subView,
  onSubView,
  savedViews,
  onCreate,
  onDelete,
}: SubViewBarProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);

  // Presets = valeurs distinctes du champ `group` des colonnes (niveau, etc.).
  const presets = useMemo<Preset[]>(() => {
    const counts = new Map<string, number>();
    for (const c of allCols) {
      if (c.group) counts.set(c.group, (counts.get(c.group) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [allCols]);

  function togglePreset(key: string) {
    onSubView(subView?.kind === 'preset' && subView.key === key ? null : { kind: 'preset', key });
  }

  return (
    <div className="flex flex-shrink-0 items-center gap-1.5 border-b border-border-soft bg-surface px-3 py-1.5">
      <div className="scrollbar-hide flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
        {presets.map((p) => {
          const on = subView?.kind === 'preset' && subView.key === p.key;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => togglePreset(p.key)}
              className={cn(
                'inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors',
                on
                  ? 'border-primary bg-primary text-white'
                  : 'border-border-soft text-text-sec hover:border-primary hover:text-primary',
              )}
            >
              {p.key}
              <span
                className={cn(
                  'rounded-full px-1.5 text-[9.5px] font-bold',
                  on ? 'bg-white/20 text-white' : 'bg-bg text-text-muted',
                )}
              >
                {p.count}
              </span>
            </button>
          );
        })}

        {savedViews.length > 0 && presets.length > 0 ? (
          <div className="h-4 w-px flex-shrink-0 bg-border-soft" aria-hidden />
        ) : null}

        {/* Vues custom sauvegardées */}
        {savedViews.map((sv) => {
          const on = subView?.kind === 'custom' && subView.id === sv.id;
          return (
            <span key={sv.id} className="relative flex-shrink-0">
              <button
                type="button"
                onClick={() => onSubView(on ? null : { kind: 'custom', id: sv.id })}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border py-0.5 pl-2.5 pr-3 text-[11px] font-semibold transition-colors',
                  on
                    ? 'border-accent bg-accent text-white'
                    : 'border-border-soft text-text-sec hover:border-accent hover:text-accent',
                )}
              >
                {sv.name}
                <span
                  className={cn(
                    'rounded-full px-1.5 text-[9.5px] font-bold',
                    on ? 'bg-white/20 text-white' : 'bg-bg text-text-muted',
                  )}
                >
                  {sv.refIds.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (on) onSubView(null);
                  onDelete(sv.id);
                }}
                aria-label={`Supprimer la vue ${sv.name}`}
                className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-surface bg-text-muted text-[8px] text-white hover:bg-err"
              >
                ✕
              </button>
            </span>
          );
        })}
      </div>

      {/* Bouton + (nouvelle vue custom) */}
      <span className="relative flex-shrink-0">
        <button
          type="button"
          onClick={() => setPopoverOpen((o) => !o)}
          title="Créer une vue personnalisée"
          aria-label="Créer une vue personnalisée"
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded-full border border-dashed text-base leading-none transition-colors',
            popoverOpen
              ? 'border-primary text-primary'
              : 'border-border text-text-muted hover:border-primary hover:text-primary',
          )}
        >
          +
        </button>
        {popoverOpen ? (
          <CustomViewPopover
            allCols={allCols}
            onClose={() => setPopoverOpen(false)}
            onCreate={(name, refIds) => {
              onCreate(name, refIds);
              setPopoverOpen(false);
            }}
          />
        ) : null}
      </span>
    </div>
  );
}
