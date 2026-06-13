'use client';

import type { EnseignantDto } from '@planit/contracts';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Drawer } from '@/components/ui/drawer';
import { useIsRp } from '@/hooks/use-role';

interface EnseignantDetailDrawerProps {
  readonly enseignant: EnseignantDto | null;
  readonly onClose: () => void;
  readonly onEdit: (enseignant: EnseignantDto) => void;
}

/**
 * V05 LOT 4.2 — V5-D11 : drawer de vue d'un enseignant calqué sur
 * `etudiant-detail-drawer.tsx`. Ouvert depuis la liste Enseignants
 * (Direction et RP). Bouton « Modifier » rendu uniquement pour le RP.
 */
export function EnseignantDetailDrawer({
  enseignant,
  onClose,
  onEdit,
}: EnseignantDetailDrawerProps) {
  const isRp = useIsRp();

  return (
    <Drawer
      isOpen={enseignant !== null}
      onClose={onClose}
      title={enseignant?.nomComplet ?? 'Fiche enseignant'}
      width="md"
    >
      {enseignant ? (
        <DetailContent enseignant={enseignant} isRp={isRp} onEdit={() => onEdit(enseignant)} />
      ) : null}
    </Drawer>
  );
}

function DetailContent({
  enseignant,
  isRp,
  onEdit,
}: {
  enseignant: EnseignantDto;
  isRp: boolean;
  onEdit: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      {/* En-tête : avatar + identité */}
      <div className="flex items-center gap-4 border-b border-border-soft pb-4">
        <Avatar name={enseignant.nomComplet} size={56} />
        <div className="flex min-w-0 flex-col gap-1">
          <div className="truncate font-display text-base font-semibold text-text">
            {enseignant.nomComplet}
          </div>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-text-sec">
            <a
              href={`mailto:${enseignant.emailInstitutionnel}`}
              className="text-primary hover:underline"
            >
              {enseignant.emailInstitutionnel}
            </a>
            {enseignant.whatsapp !== null && enseignant.whatsapp.length > 0 ? (
              <span className="text-text-muted">{enseignant.whatsapp}</span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Statut + spécialité */}
      <section className="grid grid-cols-[80px_1fr] gap-x-3 gap-y-3 text-[13px]">
        <dt className="text-text-muted">Statut</dt>
        <dd>
          <span
            className={
              enseignant.statut === 'PERMANENT'
                ? 'inline-flex items-center rounded-md border border-ok/20 bg-ok-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ok'
                : 'inline-flex items-center rounded-md border border-border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted'
            }
          >
            {enseignant.statut === 'PERMANENT' ? 'Permanent' : 'Vacataire'}
          </span>
        </dd>

        <dt className="text-text-muted">Spécialité</dt>
        <dd className="text-text">{enseignant.specialite}</dd>
      </section>

      {/* Bouton Modifier — RP only (V5-D11) */}
      {isRp ? (
        <div className="border-t border-border-soft pt-4">
          <Button variant="primary" size="sm" onClick={onEdit}>
            Modifier la fiche
          </Button>
        </div>
      ) : null}
    </div>
  );
}
