'use client';

import { ChevronDownIcon, DownloadIcon, LayersIcon, PlusIcon } from '@planit/ui';
import { cn } from '@/lib/utils';
import { ExportMenu, type ExportFormat } from '@/components/ui/export-menu';
import { ViewModeTabs, type ViewMode } from './view-mode-tabs';
import { WeekNavigator } from './week-navigator';

interface PlanningToolbarProps {
  weekStart: Date;
  onWeekChange: (date: Date) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onCreateSession: () => void;
  selectedClassLabel?: string | undefined;
  // I.6 — undo/redo wiring (V2-D11). Pile vidée au publish.
  canUndo?: boolean | undefined;
  canRedo?: boolean | undefined;
  onUndo?: (() => void) | undefined;
  onRedo?: (() => void) | undefined;
  // LOT 7 (X.2) — export planning
  onExport?: ((format: ExportFormat) => void) | undefined;
  isExporting?: boolean | undefined;
  /**
   * LOT 6 G.3 — mode lecture seule (acteur AC). Masque le cluster
   * undo/redo et le bouton « + Nouvelle séance ». L'export reste actif
   * (lecture autorisée pour l'AC) ainsi que la navigation hebdo + tabs.
   */
  readOnly?: boolean | undefined;
}

function ToolbarSeparator() {
  return <div className="h-6 w-px flex-shrink-0 bg-border-soft" aria-hidden />;
}

// I.6 — bouton undo/redo branché sur `usePlanningUndoStack` (V2 LOT 4).
function UndoRedoButton({
  direction,
  disabled,
  onClick,
}: {
  direction: 'undo' | 'redo';
  disabled: boolean;
  onClick: (() => void) | undefined;
}) {
  const path =
    direction === 'undo'
      ? 'M3 7v6h6M21 17a9 9 0 0 0-15-6.7L3 13'
      : 'M21 7v6h-6M3 17a9 9 0 0 1 15-6.7L21 13';
  const shortcutLabel = direction === 'undo' ? 'Ctrl+Z' : 'Ctrl+Maj+Z';
  const action = direction === 'undo' ? 'Annuler' : 'Refaire';
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={`${action} (${shortcutLabel})`}
      aria-label={action}
      className={cn(
        'inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border bg-surface transition-colors',
        disabled
          ? 'cursor-not-allowed border-border-soft text-text-faint'
          : 'border-border text-text-sec hover:border-primary hover:text-primary',
      )}
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
        <path d={path} />
      </svg>
    </button>
  );
}

function ClassSelector({ label = 'M1 IA' }: { label?: string | undefined }) {
  return (
    <button
      type="button"
      disabled
      title="Sélecteur de classe (V2)"
      aria-label="Sélectionner une classe"
      className="inline-flex h-8 flex-shrink-0 cursor-not-allowed items-center gap-1.5 rounded-lg border border-border-soft bg-surface px-2.5 text-[12.5px] font-semibold text-text"
    >
      <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
        Classe
      </span>
      <span className="text-text-muted">
        <LayersIcon size={13} color="currentColor" />
      </span>
      <span>{label}</span>
      <span className="text-text-muted">
        <ChevronDownIcon size={12} color="currentColor" />
      </span>
    </button>
  );
}

// LOT 7 (X.2) — fallback désactivé quand l'export n'est pas encore prêt
// (onExport absent / données en chargement). Le menu actif est délégué au
// composant réutilisable `ExportMenu` (portail, échappe au clipping toolbar).
function ExportDisabled() {
  return (
    <button
      type="button"
      disabled
      title="Export non disponible"
      className="inline-flex h-8 flex-shrink-0 cursor-not-allowed items-center gap-1.5 rounded-lg border border-border-soft bg-surface px-2.5 text-[12px] font-medium text-text-muted"
    >
      <DownloadIcon size={13} color="currentColor" />
      <span>Exporter</span>
      <ChevronDownIcon size={11} color="currentColor" />
    </button>
  );
}

function NewSessionButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-8 flex-shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3 text-[12.5px] font-bold text-white shadow-sm transition-all',
        'hover:brightness-110 active:brightness-95',
      )}
    >
      <PlusIcon size={14} color="currentColor" />
      {/* Label responsive : « Nouvelle séance » en large, « Séance » plus étroit. */}
      <span className="hidden xl:inline">Nouvelle séance</span>
      <span className="xl:hidden">Séance</span>
    </button>
  );
}

export function PlanningToolbar({
  weekStart,
  onWeekChange,
  viewMode,
  onViewModeChange,
  onCreateSession,
  selectedClassLabel,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onExport,
  isExporting,
  readOnly = false,
}: PlanningToolbarProps) {
  return (
    <div className="flex h-[52px] flex-shrink-0 items-center gap-2 overflow-x-auto border-b border-border-soft bg-surface px-3">
      {/* Left : undo/redo + week nav + class selector */}
      {readOnly ? null : (
        <>
          <div className="flex flex-shrink-0 items-center gap-1">
            <UndoRedoButton direction="undo" disabled={!canUndo} onClick={onUndo} />
            <UndoRedoButton direction="redo" disabled={!canRedo} onClick={onRedo} />
          </div>
          <ToolbarSeparator />
        </>
      )}
      <WeekNavigator weekStart={weekStart} onChange={onWeekChange} />
      <ToolbarSeparator />
      <ClassSelector label={selectedClassLabel} />

      {/* Spacer pushes the right cluster to the edge */}
      <div className="min-w-2 flex-1" />

      {/* Right : view modes + export + (new session si RP) */}
      <ViewModeTabs active={viewMode} onChange={onViewModeChange} />
      {onExport === undefined ? (
        <ExportDisabled />
      ) : (
        <ExportMenu onExport={onExport} isExporting={isExporting} align="right" />
      )}
      {readOnly ? null : (
        <>
          <ToolbarSeparator />
          <NewSessionButton onClick={onCreateSession} />
        </>
      )}
    </div>
  );
}
