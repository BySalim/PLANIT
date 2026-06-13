import type { ResponsableRefDto } from '@planit/contracts';
import { Avatar } from '@/components/ui/avatar';

interface ResponsableCellProps {
  readonly responsable: ResponsableRefDto | null | undefined;
}

/**
 * V05 LOT 4.3 — V5-D5 : cellule « Responsable » réutilisable
 * (Suivi, Classes, Formations, Maquettes). Affiche avatar + nom,
 * ou « — » si `null` (filière sans RP attitré).
 */
export function ResponsableCell({ responsable }: ResponsableCellProps) {
  if (!responsable) {
    return <span className="text-text-muted">—</span>;
  }
  return (
    <div className="flex items-center gap-2">
      <Avatar name={responsable.fullName} size={22} />
      <span className="truncate text-[12.5px] text-text" title={responsable.fullName}>
        {responsable.fullName}
      </span>
    </div>
  );
}
