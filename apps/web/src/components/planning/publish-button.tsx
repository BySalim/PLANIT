'use client';

import type { SessionV2Dto } from '@planit/contracts';
import { usePublishSessionsV2Mutation } from '@/lib/mutations-v2';
import { cn } from '@/lib/utils';

interface PublishButtonProps {
  sessions: readonly SessionV2Dto[];
  /** Hook après succès publish (utilisé pour vider la pile undo V2-D11). */
  onPublished?: (() => void) | undefined;
}

/**
 * Bouton "Publier les modifications" — LOT 3 R.7.
 *
 * - Libellé renommé : « Publier la semaine » → « Publier les modifications ».
 * - Compteur basé sur `hasUnpublishedChanges` (backend autoritatif, ADR-0008).
 * - Désactivé tant qu'aucune séance n'a de modifs en attente.
 * - Consomme POST /api/v2/sessions/publish.
 */
export function PublishButton({ sessions, onPublished }: PublishButtonProps) {
  const mutation = usePublishSessionsV2Mutation();
  const pendingCount = sessions.filter((s) => s.hasUnpublishedChanges).length;
  const disabled = pendingCount === 0 || mutation.isPending;

  const label = mutation.isPending
    ? 'Publication…'
    : pendingCount === 0
      ? 'Tout est publié'
      : `Publier les modifications (${pendingCount})`;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() =>
        mutation.mutate(undefined, {
          onSuccess: () => onPublished?.(),
        })
      }
      aria-disabled={disabled}
      className={cn(
        'inline-flex h-8 flex-shrink-0 items-center gap-1.5 rounded-lg px-3.5 text-[12.5px] font-bold text-white transition-all',
        'disabled:cursor-not-allowed disabled:opacity-50',
        disabled ? 'bg-text-faint' : 'bg-brand-gradient hover:brightness-110 active:brightness-95',
      )}
      style={
        disabled
          ? undefined
          : {
              boxShadow: '0 2px 8px -2px rgba(232, 98, 10, 0.6)',
            }
      }
    >
      <span aria-hidden>📡</span>
      <span>{label}</span>
    </button>
  );
}
