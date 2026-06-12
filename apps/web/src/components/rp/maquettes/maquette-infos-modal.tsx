'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { AnneeAcademiqueDto, MaquetteDto, MaquetteVersionDto } from '@planit/contracts';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { AnneeChip } from './annees-widget';

// ── Helpers ──────────────────────────────────────────────────────────

function formatDateFR(iso: string) {
  try {
    return format(new Date(iso), 'PPP', { locale: fr });
  } catch {
    return iso;
  }
}

function relativeFR(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return null;
  const days = Math.floor(ms / 86_400_000);
  if (days < 0) return 'à venir';
  if (days === 0) return "aujourd'hui";
  if (days === 1) return 'hier';
  if (days < 30) return `il y a ${days} jours`;
  const months = Math.floor(days / 30);
  if (months < 12) return `il y a ${months} mois`;
  return `il y a ${Math.floor(days / 365)} an${Math.floor(days / 365) > 1 ? 's' : ''}`;
}

// ── Modal informations d'une maquette (lecture seule — ADR-0018) ──────
// Filière, niveau ET nom sont dérivés/figés : la maquette n'est ni créée ni
// renommée directement (pilotée par la formation). Modale purement informative.

export interface MaquetteInfosModalProps {
  readonly open: boolean;
  readonly maquette: MaquetteDto;
  readonly versions: readonly MaquetteVersionDto[];
  readonly annees: readonly AnneeAcademiqueDto[];
  readonly onClose: () => void;
}

export function MaquetteInfosModal({
  open,
  maquette,
  versions,
  annees,
  onClose,
}: MaquetteInfosModalProps) {
  // Années liées (via les versions)
  const anneeIds = new Set(versions.map((v) => v.anneeAcademiqueId));
  const linkedAnnees = annees.filter((a) => anneeIds.has(a.id));

  function MetaCol({
    eyebrow,
    primary,
    secondary,
  }: {
    eyebrow: string;
    primary: string;
    secondary?: string | null;
  }) {
    return (
      <div className="min-w-0">
        <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wider text-text-muted">
          {eyebrow}
        </p>
        <p className="text-[15px] font-semibold tabular-nums text-text">{primary}</p>
        {secondary !== undefined && secondary !== null && (
          <p className="mt-0.5 text-[11.5px] text-text-muted">{secondary}</p>
        )}
      </div>
    );
  }

  return (
    <Modal isOpen={open} onClose={onClose} title="Informations de la maquette" size="lg">
      <div className="flex flex-col gap-5">
        {/* Nom dérivé */}
        <div>
          <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-text-muted">
            Nom (généré automatiquement)
          </p>
          <p className="font-display text-[18px] font-semibold text-text">{maquette.nom}</p>
        </div>

        {/* Métadonnées */}
        <div className="grid grid-cols-3 gap-6 rounded-xl border border-border bg-bg p-5">
          <MetaCol
            eyebrow="Date de création"
            primary={formatDateFR(maquette.createdAt)}
            secondary={relativeFR(maquette.createdAt)}
          />
          <MetaCol
            eyebrow="Dernière modification"
            primary={formatDateFR(maquette.updatedAt)}
            secondary={relativeFR(maquette.updatedAt)}
          />
          <div className="min-w-0">
            <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wider text-text-muted">
              {"Années d'utilisation"}
              {linkedAnnees.length > 0 && (
                <span className="ml-1.5 font-bold tabular-nums text-text-faint">
                  · {linkedAnnees.length}
                </span>
              )}
            </p>
            {linkedAnnees.length === 0 ? (
              <span className="text-[12.5px] italic text-text-faint">
                Aucune formation rattachée.
              </span>
            ) : (
              <div className="flex flex-col gap-1.5">
                {linkedAnnees.map((a) => (
                  <AnneeChip key={a.id} annee={a} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Champs figés (info) */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="rounded-lg border border-border bg-bg px-3 py-2">
            <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-text-faint">
              Filière
            </p>
            <p className="text-[13px] font-semibold text-text">
              {maquette.filiere ? `${maquette.filiere.sigle} — ${maquette.filiere.libelle}` : '—'}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-bg px-3 py-2">
            <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-text-faint">
              Niveau
            </p>
            <p className="text-[13px] font-semibold text-text">{maquette.niveau}</p>
          </div>
          <p className="self-end text-[11.5px] text-text-muted">
            Filière, niveau et nom dérivés de la formation — non modifiables (ADR-0018)
          </p>
        </div>

        {/* Action */}
        <div className="flex justify-end gap-2 border-t border-border-soft pt-4">
          <Button variant="primary" size="sm" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </Modal>
  );
}
