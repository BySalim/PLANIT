'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type {
  AnneeAcademiqueDto,
  CreateMaquetteDto,
  FiliereRef,
  MaquetteDto,
  MaquetteVersionDto,
} from '@planit/contracts';
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

const NIVEAUX = ['L1', 'L2', 'L3', 'M1', 'M2'] as const;

// ── Modal édition d'une maquette existante ────────────────────────────

export interface MaquetteInfosModalProps {
  readonly open: boolean;
  readonly maquette: MaquetteDto;
  readonly versions: readonly MaquetteVersionDto[];
  readonly annees: readonly AnneeAcademiqueDto[];
  readonly isSaving: boolean;
  readonly onClose: () => void;
  readonly onSave: (nom: string) => void;
}

export function MaquetteInfosModal({
  open,
  maquette,
  versions,
  annees,
  isSaving,
  onClose,
  onSave,
}: MaquetteInfosModalProps) {
  const [nom, setNom] = useState(maquette.nom);

  useEffect(() => {
    setNom(maquette.nom);
  }, [maquette.nom]);

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
        <div className="flex gap-3">
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
            Filière et niveau non modifiables (ADR-0010)
          </p>
        </div>

        {/* Nom éditable */}
        <div>
          <label
            htmlFor="maquette-nom"
            className="mb-1.5 block text-[13px] font-semibold text-text"
          >
            Nom de la maquette
          </label>
          <input
            id="maquette-nom"
            type="text"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            maxLength={120}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13px] text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 border-t border-border-soft pt-4">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={isSaving || nom.trim() === '' || nom === maquette.nom}
            onClick={() => onSave(nom.trim())}
          >
            {isSaving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Modal création d'une nouvelle maquette ────────────────────────────

export interface CreateMaquetteModalProps {
  readonly open: boolean;
  readonly filieres: readonly FiliereRef[];
  readonly isCreating: boolean;
  readonly onClose: () => void;
  readonly onCreate: (dto: CreateMaquetteDto) => void;
}

export function CreateMaquetteModal({
  open,
  filieres,
  isCreating,
  onClose,
  onCreate,
}: CreateMaquetteModalProps) {
  const [nom, setNom] = useState('');
  const [filiereId, setFiliereId] = useState('');
  const [niveau, setNiveau] = useState<(typeof NIVEAUX)[number] | null>(null);

  useEffect(() => {
    if (!open) {
      setNom('');
      setFiliereId('');
      setNiveau(null);
    }
  }, [open]);

  const canSubmit = nom.trim() !== '' && filiereId !== '' && niveau !== null && !isCreating;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || niveau === null) return;
    onCreate({ nom: nom.trim(), filiereId, niveau });
  }

  return (
    <Modal isOpen={open} onClose={onClose} title="Nouvelle maquette" size="md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-[12.5px] text-text-muted">
          {
            "Une maquette définit le plan pédagogique d'un niveau dans une filière. Filière et niveau sont figés après création."
          }
        </p>

        <div>
          <label htmlFor="new-nom" className="mb-1.5 block text-[13px] font-semibold text-text">
            Nom <span className="text-err">*</span>
          </label>
          <input
            id="new-nom"
            type="text"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="ex. Maquette L3 Informatique"
            maxLength={120}
            required
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13px] text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label htmlFor="new-filiere" className="mb-1.5 block text-[13px] font-semibold text-text">
            Filière <span className="text-err">*</span>
          </label>
          <select
            id="new-filiere"
            value={filiereId}
            onChange={(e) => setFiliereId(e.target.value)}
            required
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13px] text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Choisir une filière…</option>
            {filieres.map((f) => (
              <option key={f.id} value={f.id}>
                {f.sigle} — {f.libelle}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="new-niveau" className="mb-1.5 block text-[13px] font-semibold text-text">
            Niveau <span className="text-err">*</span>
          </label>
          <select
            id="new-niveau"
            value={niveau ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              setNiveau(v === '' ? null : (v as (typeof NIVEAUX)[number]));
            }}
            required
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13px] text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Choisir un niveau…</option>
            {NIVEAUX.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2 border-t border-border-soft pt-4">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={!canSubmit}>
            {isCreating ? 'Création…' : 'Créer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
