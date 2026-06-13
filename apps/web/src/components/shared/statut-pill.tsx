import type { SuiviStatut } from '@planit/contracts';

interface StatutPillProps {
  readonly statut: SuiviStatut;
}

/**
 * V05 LOT 4.1 — V5-D10 : pill colorée pour le statut dérivé d'un suivi
 * de module (Terminé / En cours / À planifier).
 */
export function StatutPill({ statut }: StatutPillProps) {
  if (statut === 'termine') {
    return (
      <span className="inline-flex items-center rounded-full bg-ok-100 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-ok">
        Terminé
      </span>
    );
  }
  if (statut === 'en_cours') {
    return (
      <span className="inline-flex items-center rounded-full bg-accent-100 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-accent-800">
        En cours
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-bg px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-text-muted">
      À planifier
    </span>
  );
}
