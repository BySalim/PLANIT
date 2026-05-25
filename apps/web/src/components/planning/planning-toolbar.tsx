'use client';

import { ChevronDownIcon, DownloadIcon, LayersIcon, PlusIcon } from '@planit/ui';
import { cn } from '@/lib/utils';
import { ViewModeTabs, type ViewMode } from './view-mode-tabs';
import { WeekNavigator } from './week-navigator';

interface PlanningToolbarProps {
  weekStart: Date;
  onWeekChange: (date: Date) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onCreateSession: () => void;
  selectedClassLabel?: string | undefined;
}

function ToolbarSeparator() {
  return <div className="h-6 w-px flex-shrink-0 bg-border-soft" aria-hidden />;
}

// V2: undo/redo affichés disabled — annuler/refaire arrive en Vague 02 (TD-019).
function UndoRedoButton({ direction }: { direction: 'undo' | 'redo' }) {
  const path =
    direction === 'undo'
      ? 'M3 7v6h6M21 17a9 9 0 0 0-15-6.7L3 13'
      : 'M21 7v6h-6M3 17a9 9 0 0 1 15-6.7L21 13';
  return (
    <button
      type="button"
      disabled
      title={direction === 'undo' ? 'Annuler (V2)' : 'Refaire (V2)'}
      aria-label={direction === 'undo' ? 'Annuler' : 'Refaire'}
      className="inline-flex h-8 w-8 flex-shrink-0 cursor-not-allowed items-center justify-center rounded-lg border border-border-soft bg-surface text-text-faint"
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

function ExportButton() {
  return (
    <button
      type="button"
      disabled
      title="Exporter (V2)"
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
}: PlanningToolbarProps) {
  return (
    <div className="flex h-[52px] flex-shrink-0 items-center gap-2 overflow-x-auto border-b border-border-soft bg-surface px-3">
      {/* Left : undo/redo + week nav + class selector */}
      <div className="flex flex-shrink-0 items-center gap-1">
        <UndoRedoButton direction="undo" />
        <UndoRedoButton direction="redo" />
      </div>
      <ToolbarSeparator />
      <WeekNavigator weekStart={weekStart} onChange={onWeekChange} />
      <ToolbarSeparator />
      <ClassSelector label={selectedClassLabel} />

      {/* Spacer pushes the right cluster to the edge */}
      <div className="min-w-2 flex-1" />

      {/* Right : view modes + export + new session */}
      <ViewModeTabs active={viewMode} onChange={onViewModeChange} />
      <ExportButton />
      <ToolbarSeparator />
      <NewSessionButton onClick={onCreateSession} />
    </div>
  );
}
