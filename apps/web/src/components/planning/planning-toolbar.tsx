'use client';

import { ChevronDownIcon, DownloadIcon, PlusIcon } from '@planit/ui';
import { cn } from '@/lib/utils';
import { ExportMenu, type ExportFormat } from '@/components/ui/export-menu';
import { DaySelect } from './day-select';
import { ReferentielCombobox, type ReferentielDim } from './referentiel-combobox';
import { ViewModeTabs, type ViewMode } from './view-mode-tabs';
import { WeekNavigator } from './week-navigator';

interface PlanningToolbarProps {
  weekStart: Date;
  onWeekChange: (date: Date) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onCreateSession: () => void;
  // V05 LOT 7 — vue Classique : référentiel (dimension + valeur) via combobox.
  classicDim: ReferentielDim;
  classicId: string;
  onClassicChange: (dim: ReferentielDim, id: string) => void;
  // V05 LOT 7 — vues by-X (classe/salle/prof) : jour affiché.
  activeDay: number;
  onDayChange: (day: number) => void;
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
  classicDim,
  classicId,
  onClassicChange,
  activeDay,
  onDayChange,
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
      {/* Left : undo/redo + week nav + sélecteur de référentiel (RP) */}
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
      {/* V05 LOT 7 — onglets référentiel + sélecteur contextuel (RP).
          Classique → combobox (classe/salle/prof) ; by-X → sélecteur de jour. */}
      {readOnly ? null : (
        <>
          <ToolbarSeparator />
          <ViewModeTabs active={viewMode} onChange={onViewModeChange} />
          {viewMode === 'classique' ? (
            <ReferentielCombobox dim={classicDim} value={classicId} onChange={onClassicChange} />
          ) : (
            <DaySelect weekStart={weekStart} activeDay={activeDay} onChange={onDayChange} />
          )}
        </>
      )}

      {/* Spacer pushes the right cluster to the edge */}
      <div className="min-w-2 flex-1" />

      {/* Right : export + (new session si RP) */}
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
