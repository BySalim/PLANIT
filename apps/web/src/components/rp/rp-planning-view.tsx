'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { addDays } from 'date-fns';
import type { CreateSessionV2Dto, SessionV2Dto } from '@planit/contracts';
import { Shell } from '@/components/layout/shell';
import { CreateSessionModal } from '@/components/planning/create-session-modal';
import { PlanningFooter } from '@/components/planning/stats-bar';
import { PlanningGrid } from '@/components/planning/planning-grid';
import {
  PlanningGridByEntity,
  type ByEntityColumn,
} from '@/components/planning/planning-grid-by-entity';
import { PlanningGridSkeleton } from '@/components/planning/planning-grid-skeleton';
import { PlanningToolbar } from '@/components/planning/planning-toolbar';
import type { ReferentielDim } from '@/components/planning/referentiel-combobox';
import { SessionDetailDrawer } from '@/components/planning/session-detail-drawer';
import { ViewScopeToggle, type ViewScope } from '@/components/planning/view-scope-toggle';
import type { ViewMode } from '@/components/planning/view-mode-tabs';
import { useIsAc, useIsDirection } from '@/hooks/use-role';
import { useGlobalShortcut } from '@/lib/keyboard';
import { useCreateSessionV2Mutation, useDeleteSessionV2Mutation } from '@/lib/mutations-v2';
import {
  useV2WeekSessionsQuery,
  useClassesQuery,
  useSallesQuery,
  useEnseignantsQuery,
} from '@/lib/queries-v2';
import { usePlanningUndoStack } from '@/lib/undo-stack';
import { getCurrentWeekStart } from '@/lib/week';
import { exportPlanning, type ExportFormat } from '@/lib/export';
import { useFlash } from '@planit/ui';

const DEMO_CONFLICTS = 3;
const DEMO_PENDING_DEMANDS = 5;
const DEMO_UNREAD_NOTIFS = 3;

interface CreateInit {
  readonly date: Date;
  readonly startTime: string;
  readonly endTime: string;
  // V05 LOT 7 — préremplissage depuis les vues by-X.
  readonly classeIds?: readonly string[];
  readonly salleId?: string;
  readonly enseignantId?: string;
}

/** Index du jour courant (Lun=0 … Dim=6) pour le défaut des vues by-X. */
function todayDayIndex(): number {
  const js = new Date().getDay();
  return js === 0 ? 6 : js - 1;
}

/**
 * Vue planning RP/AC/Direction. RP : onglets Classique (un référentiel, semaine)
 * et Classe/Salle/Enseignant (vues mono-jour multi-colonnes éditables, réf.
 * PLANIT-IA). AC/Direction : lecture seule (semaine scopée serveur).
 */
export function RpPlanningView() {
  const flash = useFlash();
  const isAc = useIsAc();
  const isDirection = useIsDirection();
  const readOnly = isAc || isDirection;
  const [weekStart, setWeekStart] = useState<Date>(() => getCurrentWeekStart());
  const [createOpen, setCreateOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [createInit, setCreateInit] = useState<CreateInit | null>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const [detailSessionId, setDetailSessionId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('classique');
  // V05 LOT 7 — vue Classique : dimension + valeur du référentiel sélectionné.
  const [classicDim, setClassicDim] = useState<ReferentielDim>('classe');
  const [classicId, setClassicId] = useState('');
  // Vues by-X : jour affiché.
  const [activeDay, setActiveDay] = useState<number>(() => todayDayIndex());
  const [scope, setScope] = useState<ViewScope>('week');

  const handleViewModeChange = useCallback((mode: ViewMode) => setViewMode(mode), []);
  const handleClassicChange = useCallback((dim: ReferentielDim, id: string) => {
    setClassicDim(dim);
    setClassicId(id);
  }, []);

  // Référentiels (RP) : colonnes des vues by-X + options du combobox Classique.
  const classesQuery = useClassesQuery();
  const sallesQuery = useSallesQuery();
  const enseignantsQuery = useEnseignantsQuery();

  // Défaut Classique : 1ʳᵉ classe possédée dès que la liste arrive.
  useEffect(() => {
    if (classicId === '' && classicDim === 'classe' && (classesQuery.data?.length ?? 0) > 0) {
      setClassicId(classesQuery.data![0]!.id);
    }
  }, [classicId, classicDim, classesQuery.data]);

  // Filtre de requête selon la vue (cf. backend : owner/école/masquage).
  const queryOptions = useMemo(() => {
    if (viewMode === 'classique') {
      if (classicId === '') return undefined;
      if (classicDim === 'classe') return { classeId: classicId };
      if (classicDim === 'salle') return { salleId: classicId };
      return { teacherId: classicId };
    }
    if (viewMode === 'salle') return { scope: 'ecole' as const };
    return undefined; // classe / prof : ma semaine (owner), groupée côté grille
  }, [viewMode, classicDim, classicId]);

  const sessionsQuery = useV2WeekSessionsQuery(weekStart, queryOptions);
  const sessions = useMemo(() => sessionsQuery.data ?? [], [sessionsQuery.data]);

  // Colonnes des vues by-X selon la dimension de l'onglet.
  const byEntityColumns = useMemo<ByEntityColumn[]>(() => {
    if (viewMode === 'classe') {
      return (classesQuery.data ?? []).map((c) => ({
        id: c.id,
        label: c.code,
        sub: c.name,
        ...(c.niveau ? { badge: c.niveau } : {}),
      }));
    }
    if (viewMode === 'salle') {
      return (sallesQuery.data ?? []).map((s) => ({ id: s.id, label: s.name }));
    }
    if (viewMode === 'prof') {
      return (enseignantsQuery.data ?? []).map((t) => ({
        id: t.id,
        label: t.nomComplet,
        sub: t.specialite,
      }));
    }
    return [];
  }, [viewMode, classesQuery.data, sallesQuery.data, enseignantsQuery.data]);

  const handleExport = useCallback(
    async (fmt: ExportFormat) => {
      setIsExporting(true);
      flash.push('success', 'Génération en cours…');
      try {
        await exportPlanning(fmt, { sessions, weekStart }, gridContainerRef.current);
        flash.push('success', 'Export généré');
      } catch {
        flash.push('error', "Erreur lors de l'export, réessayez.");
      } finally {
        setIsExporting(false);
      }
    },
    [sessions, weekStart, flash],
  );

  const undoStack = usePlanningUndoStack();
  useGlobalShortcut('z', { ctrl: true, shift: false }, undoStack.undo);
  useGlobalShortcut('z', { ctrl: true, shift: true }, undoStack.redo);

  const { mutateAsync: createSession } = useCreateSessionV2Mutation();
  const { mutateAsync: deleteSession } = useDeleteSessionV2Mutation();

  const pushCreateUndo = (created: SessionV2Dto, original: CreateSessionV2Dto) => {
    const currentIdRef = { id: created.id };
    undoStack.push({
      label: 'Création de séance',
      undo: async () => {
        await deleteSession({ id: currentIdRef.id, silent: true });
      },
      redo: async () => {
        const recreated = await createSession(original);
        currentIdRef.id = recreated.id;
      },
    });
  };

  const handleSessionOpen = (session: SessionV2Dto) => setDetailSessionId(session.id);

  const handleCreateAtSlot = (init: CreateInit) => {
    setCreateInit(init);
    setCreateOpen(true);
  };
  const handleCloseCreate = () => {
    setCreateOpen(false);
    setCreateInit(null);
  };

  const isClassique = viewMode === 'classique';

  return (
    <Shell
      fullBleed
      title="Planning hebdomadaire"
      breadcrumb={[
        { label: readOnly ? 'Mon espace' : 'Espace RP', href: '/' },
        { label: 'Planning' },
      ]}
      activeNavId="planning"
      conflicts={readOnly ? 0 : DEMO_CONFLICTS}
      pendingDemands={readOnly ? 0 : DEMO_PENDING_DEMANDS}
      unreadNotifs={readOnly ? 0 : DEMO_UNREAD_NOTIFS}
    >
      <div className="flex h-full flex-col">
        <PlanningToolbar
          weekStart={weekStart}
          onWeekChange={setWeekStart}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          classicDim={classicDim}
          classicId={classicId}
          onClassicChange={handleClassicChange}
          activeDay={activeDay}
          onDayChange={setActiveDay}
          onCreateSession={() => setCreateOpen(true)}
          canUndo={undoStack.canUndo}
          canRedo={undoStack.canRedo}
          onUndo={undoStack.undo}
          onRedo={undoStack.redo}
          onExport={(fmt) => void handleExport(fmt)}
          isExporting={isExporting}
          readOnly={readOnly}
        />

        {isClassique ? (
          <ViewScopeToggle scope={scope} onChange={setScope} sessionCount={sessions.length} />
        ) : null}

        <div ref={gridContainerRef} className="min-h-0 flex-1">
          {sessionsQuery.isLoading ? (
            <PlanningGridSkeleton />
          ) : isClassique ? (
            <PlanningGrid
              weekStart={weekStart}
              sessions={sessions}
              isLoading={false}
              error={sessionsQuery.error}
              onSessionOpen={handleSessionOpen}
              onRetry={() => sessionsQuery.refetch()}
              readOnly={readOnly}
              {...(readOnly
                ? {}
                : { onPushUndo: undoStack.push, onCreateAtSlot: handleCreateAtSlot })}
            />
          ) : (
            <PlanningGridByEntity
              dimension={viewMode as ReferentielDim}
              day={addDays(weekStart, activeDay)}
              columns={byEntityColumns}
              sessions={sessions}
              isLoading={false}
              onSessionOpen={handleSessionOpen}
              readOnly={readOnly}
              {...(readOnly
                ? {}
                : {
                    onCreateAtSlot: (init) =>
                      handleCreateAtSlot({
                        date: init.date,
                        startTime: init.startTime,
                        endTime: init.endTime,
                        ...(init.prefill.classeId ? { classeIds: [init.prefill.classeId] } : {}),
                        ...(init.prefill.salleId ? { salleId: init.prefill.salleId } : {}),
                        ...(init.prefill.enseignantId
                          ? { enseignantId: init.prefill.enseignantId }
                          : {}),
                      }),
                  })}
            />
          )}
        </div>

        <PlanningFooter
          sessions={sessions}
          isLoading={sessionsQuery.isLoading}
          isError={sessionsQuery.isError}
          onPublished={undoStack.clear}
          readOnly={readOnly}
        />
      </div>

      {readOnly ? null : (
        <CreateSessionModal
          isOpen={createOpen}
          onClose={handleCloseCreate}
          onCreated={pushCreateUndo}
          {...(createInit
            ? {
                initialValues: {
                  date: createInit.date,
                  startTime: createInit.startTime,
                  endTime: createInit.endTime,
                  ...(createInit.classeIds ? { classeIds: createInit.classeIds } : {}),
                  ...(createInit.salleId ? { salleId: createInit.salleId } : {}),
                  ...(createInit.enseignantId ? { enseignantId: createInit.enseignantId } : {}),
                },
              }
            : {})}
        />
      )}
      <SessionDetailDrawer
        sessionId={detailSessionId}
        onClose={() => setDetailSessionId(null)}
        readOnly={readOnly}
      />
    </Shell>
  );
}
