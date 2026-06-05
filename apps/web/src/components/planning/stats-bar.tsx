'use client';

import { ClockIcon } from '@planit/ui';
import type { SessionV2Dto } from '@planit/contracts';
import { PublishButton } from './publish-button';

interface PlanningFooterProps {
  sessions: readonly SessionV2Dto[];
  isLoading?: boolean;
  isError?: boolean;
  /** Délégué à PublishButton — vide la pile undo (V2-D11). */
  onPublished?: (() => void) | undefined;
  /**
   * LOT 6 G.3 — mode lecture seule (AC). Masque PublishButton et le bouton
   * Historique (placeholder V03). Les compteurs (sessions / publiées / en
   * attente) restent affichés — c'est de la lecture.
   */
  readOnly?: boolean | undefined;
}

/**
 * Footer planning RP — LOT 3 R.7.
 *
 * Changements V02 :
 * - Boutons "Aperçu étudiant" et "Exporter" **supprimés** (hors scope V02,
 *   pas de retour planifié pour ces deux fonctionnalités).
 * - Bouton "Historique" conservé en dernière position (placeholder V03+).
 * - Compteurs alignés sur le modèle V2 : `isPublished` + `hasUnpublishedChanges`
 *   (plus de PROVISOIRE / VALIDE / PUBLIE).
 * - "Publier la semaine" renommé en "Publier les modifications" via
 *   <PublishButton> V2.
 */
export function PlanningFooter({
  sessions,
  isLoading = false,
  isError = false,
  onPublished,
  readOnly = false,
}: PlanningFooterProps) {
  const total = sessions.length;
  const pending = sessions.filter((s) => s.hasUnpublishedChanges).length;
  const published = total - pending;

  return (
    <footer
      className="flex flex-shrink-0 items-center justify-between gap-3 overflow-x-auto border-t border-border-soft bg-surface px-4 py-2"
      style={{ opacity: isLoading ? 0.7 : 1 }}
    >
      <div className="flex flex-shrink-0 items-center gap-x-2 text-[11.5px] text-text-sec">
        {isError ? (
          <span className="text-text-muted">
            Backend indisponible. Démarre Docker puis recharge.
          </span>
        ) : (
          <>
            <span>
              <strong className="font-semibold text-text">{total}</strong> séances
            </span>
            <span className="text-text-faint">·</span>
            <span>
              <strong className="font-semibold text-ok">{published}</strong> publiées
            </span>
            <span className="text-text-faint">·</span>
            <span>
              <strong className="font-semibold text-warn-text">{pending}</strong> en attente
            </span>
          </>
        )}
      </div>

      {/* R.7 — ordre : [Publier les modifications, Historique]. En lecture seule
          (AC), tout le cluster droit est masqué (pas de publication ni
          historique pour l'AC en V03). */}
      {readOnly ? null : (
        <div className="flex flex-shrink-0 items-center gap-2">
          <span className="hidden text-[11.5px] text-text-muted lg:inline">
            Auto-publication vendredi 22:00
          </span>
          <PublishButton sessions={sessions} onPublished={onPublished} />
          <button
            type="button"
            disabled
            title="Disponible V03"
            className="inline-flex h-8 flex-shrink-0 cursor-not-allowed items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-[12px] font-semibold text-text-muted"
          >
            <ClockIcon size={13} color="currentColor" />
            <span>Historique</span>
          </button>
        </div>
      )}
    </footer>
  );
}
