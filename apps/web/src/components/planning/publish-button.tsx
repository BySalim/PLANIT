'use client';

import type { SessionDto } from '@planit/contracts';
import { Button } from '@/components/ui/button';
import { usePublishSessionsMutation } from '@/lib/mutations';

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
      : `Publier les modifications (${pendingCount})`;

  return (
    <Button
      variant="primary"
      size="md"
      disabled={disabled}
      onClick={() => mutation.mutate(undefined)}
      aria-disabled={disabled}
    >
      {label}
    </Button>
  );
}
