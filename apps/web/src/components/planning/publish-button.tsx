'use client';

import type { SessionDto } from '@planit/contracts';
import { usePublishSessionsMutation } from '@/lib/mutations';
import { cn } from '@/lib/utils';

interface PublishButtonProps {
  sessions: SessionDto[];
}

export function PublishButton({ sessions }: PublishButtonProps) {
  const mutation = usePublishSessionsMutation();
  const pendingCount = sessions.filter((s) => !s.isPublished).length;
  const disabled = pendingCount === 0 || mutation.isPending;

  const label = mutation.isPending
    ? 'Publication…'
    : pendingCount === 0
      ? 'Tout est publié'
      : `Publier la semaine${pendingCount > 0 ? ` (${pendingCount})` : ''}`;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => mutation.mutate(undefined)}
      aria-disabled={disabled}
      className={cn(
        'inline-flex h-8 flex-shrink-0 items-center gap-1.5 rounded-lg px-3.5 text-[12.5px] font-bold text-white transition-all',
        'disabled:cursor-not-allowed disabled:opacity-50',
        !disabled && 'hover:brightness-110 active:brightness-95',
      )}
      style={
        disabled
          ? { background: '#9CA3AF' }
          : {
              background: 'linear-gradient(135deg, #6B2D0E 0%, #E8620A 100%)',
              boxShadow: '0 2px 8px -2px rgba(232, 98, 10, 0.6)',
            }
      }
    >
      <span aria-hidden>📡</span>
      <span>{label}</span>
    </button>
  );
}
