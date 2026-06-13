'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { CreateSessionV2Dto, SessionV2Dto } from '@planit/contracts';
import { Shell } from '@/components/layout/shell';
import { CreateSessionModal } from '@/components/planning/create-session-modal';
import { PlanningFooter } from '@/components/planning/stats-bar';
import { PlanningGrid } from '@/components/planning/planning-grid';
import { PlanningGridSkeleton } from '@/components/planning/planning-grid-skeleton';
import { PlanningToolbar } from '@/components/planning/planning-toolbar';
import { SessionDetailDrawer } from '@/components/planning/session-detail-drawer';
import { ViewScopeToggle, type ViewScope } from '@/components/planning/view-scope-toggle';
import type { ViewMode } from '@/components/planning/view-mode-tabs';
import { useIsAc } from '@/hooks/use-role';
import { useGlobalShortcut } from '@/lib/keyboard';
import { useCreateSessionV2Mutation, useDeleteSessionV2Mutation } from '@/lib/mutations-v2';
import { useV2WeekSessionsQuery } from '@/lib/queries-v2';
import { usePlanningUndoStack } from '@/lib/undo-stack';
import { getCurrentWeekStart } from '@/lib/week';
import { exportPlanning, type ExportFormat } from '@/lib/export';
import { useFlash } from '@planit/ui';

// V1-D2 hardcoded demo counters (matchent les compteurs PLANIT-IA D.kpis).
// À remplacer par des hooks dédiés en Vague 02.
const DEMO_CONFLICTS = 3;
const DEMO_PENDING_DEMANDS = 5;
const DEMO_UNREAD_NOTIFS = 3;

interface CreateInit {
  readonly date: Date;
  readonly startTime: string;
  readonly endTime: string;
}

/**
 * Vue planning RP/AC — rendue par le home role-aware (`/`) quand l'acteur connecté
 * est RESPONSABLE_PROGRAMME ou ASSISTANT_PROGRAMME. (Anciennement la page `/rp`.)
 *
 * LOT 6 G.3 — Mode AC : tout en lecture seule (pas de drag/resize/create/publish/
 * undo/redo). Le breadcrumb passe à « Mon espace » au lieu de « Espace RP ».
 */
export function RpPlanningView() {
  const flash = useFlash();
  const isAc = useIsAc();
  const readOnly = isAc;
  const [weekStart, setWeekStart] = useState<Date>(() => getCurrentWeekStart());
  const [createOpen, setCreateOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  // I.1 / I.2 — pré-remplissage de la modale depuis un clic/drag sur slot vide.
  const [createInit, setCreateInit] = useState<CreateInit | null>(null);

  // LOT 7 (X.2) — ref sur le container de la grille planning (capturé en PNG/PDF).
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const [detailSessionId, setDetailSessionId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('classique');
  const [scope, setScope] = useState<ViewScope>('week');
  const sessionsQuery = useV2WeekSessionsQuery(weekStart);
  const sessions = useMemo(() => sessionsQuery.data ?? [], [sessionsQuery.data]);

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

  // I.6 — pile undo/redo locale à la page (V2-D11). Vidée au publish.
  const undoStack = usePlanningUndoStack();
  useGlobalShortcut('z', { ctrl: true, shift: false }, undoStack.undo);
  useGlobalShortcut('z', { ctrl: true, shift: true }, undoStack.redo);

  // LOT 4 V2 — mutations pour push une entrée undo après une création.
  const { mutateAsync: createSession } = useCreateSessionV2Mutation();
  const { mutateAsync: deleteSession } = useDeleteSessionV2Mutation();

  /**
   * Push une entrée undo après chaque création :
   *  - undo = supprime la séance créée (DELETE /api/v2/sessions/:id)
   *  - redo = recrée la séance avec le payload original
   * La nouvelle séance créée par redo a un id différent ; on suit le dernier
   * id connu via une ref locale (`currentIdRef`) capturée dans la closure.
   */
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

  // Double-clic sur une séance → ouverture du drawer de détail.
  const handleSessionOpen = (session: SessionV2Dto) => {
    setDetailSessionId(session.id);
  };

  // I.1 / I.2 — ouvre la modale avec la plage cliquée/glissée.
  const handleCreateAtSlot = (init: CreateInit) => {
    setCreateInit(init);
    setCreateOpen(true);
  };
  const handleCloseCreate = () => {
    setCreateOpen(false);
    setCreateInit(null);
  };

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
      {/* Pleine page : barres figées, grille scrollable au centre (calqué PLANIT-IA/rp). */}
      <div className="flex h-full flex-col">
        {/* Toolbar : undo/redo + week nav + class selector | view modes + export + new */}
        <PlanningToolbar
          weekStart={weekStart}
          onWeekChange={setWeekStart}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onCreateSession={() => setCreateOpen(true)}
          canUndo={undoStack.canUndo}
          canRedo={undoStack.canRedo}
          onUndo={undoStack.undo}
          onRedo={undoStack.redo}
          onExport={(fmt) => void handleExport(fmt)}
          isExporting={isExporting}
          readOnly={readOnly}
        />

        {/* Day/Week toggle + session counter */}
        <ViewScopeToggle scope={scope} onChange={setScope} sessionCount={sessions.length} />

        {/* Planning grid — fills remaining height, scrolls internally */}
        {/* ref LOT 7 (X.2) : capturé par exportNodeToImage/exportNodeToPdf */}
        <div ref={gridContainerRef} className="min-h-0 flex-1">
          {sessionsQuery.isLoading ? (
            <PlanningGridSkeleton />
          ) : (
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
                : {
                    onPushUndo: undoStack.push,
                    onCreateAtSlot: handleCreateAtSlot,
                  })}
            />
          )}
        </div>

        {/* Footer with stats + actions */}
        <PlanningFooter
          sessions={sessions}
          isLoading={sessionsQuery.isLoading}
          isError={sessionsQuery.isError}
          onPublished={undoStack.clear}
          readOnly={readOnly}
        />
      </div>

      {/* Modale de création : inutile en lecture seule (AC). */}
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
