'use client';

import type { InscriptionHistoryItemDto } from '@planit/contracts';
import { Drawer } from '@/components/ui/drawer';
import { useEtudiantDetailQuery } from '@/lib/queries-v3';

interface EtudiantDetailDrawerProps {
  readonly etudiantId: string | null;
  readonly onClose: () => void;
}

// ── Helpers avatar — calqués sur etudiants/page.tsx (TD-V03-AVATAR-EXTRACT)
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

const AVATAR_PALETTES = [
  { bg: 'rgba(107,45,14,0.13)', fg: '#6B2D0E' },
  { bg: 'rgba(232,98,10,0.13)', fg: '#C44E07' },
  { bg: 'rgba(22,163,74,0.13)', fg: '#15803D' },
  { bg: 'rgba(37,99,235,0.13)', fg: '#1D4ED8' },
  { bg: 'rgba(124,58,237,0.13)', fg: '#6D28D9' },
  { bg: 'rgba(8,145,178,0.13)', fg: '#0E7490' },
] as const;

function getAvatarStyle(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length]!;
}

/**
 * E.3 — Fiche étudiant en drawer latéral droit.
 *
 * Lecture seule (V3-D6) : pas d'édition fiche, pas de désinscription
 * (gérée depuis page Classes LOT 4). Affiche identité + historique
 * chronologique inverse des inscriptions.
 */
export function EtudiantDetailDrawer({ etudiantId, onClose }: EtudiantDetailDrawerProps) {
  const detailQuery = useEtudiantDetailQuery(etudiantId);
  const etudiant = detailQuery.data;

  return (
    <Drawer
      isOpen={etudiantId !== null}
      onClose={onClose}
      title={etudiant?.nomComplet ?? 'Fiche étudiant'}
      width="md"
    >
      {detailQuery.isLoading ? (
        <p className="text-sm text-text-muted">Chargement…</p>
      ) : detailQuery.error ? (
        <p
          role="alert"
          className="rounded-lg border border-err bg-err-100 px-3 py-2 text-sm text-err"
        >
          Impossible de charger la fiche étudiant.
        </p>
      ) : etudiant ? (
        <DetailContent etudiant={etudiant} />
      ) : null}
    </Drawer>
  );
}

function DetailContent({
  etudiant,
}: {
  etudiant: {
    id: string;
    nomComplet: string;
    email: string;
    matricule: string | null;
    inscriptions: InscriptionHistoryItemDto[];
  };
}) {
  const palette = getAvatarStyle(etudiant.nomComplet);
  const initials = getInitials(etudiant.nomComplet);

  return (
    <div className="flex flex-col gap-5">
      {/* En-tête : avatar + identité */}
      <div className="flex items-center gap-4 border-b border-border-soft pb-4">
        <div
          className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full text-base font-bold"
          style={{ background: palette.bg, color: palette.fg }}
          aria-hidden
        >
          {initials}
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="truncate font-display text-base font-semibold text-text">
            {etudiant.nomComplet}
          </div>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-text-sec">
            <span className="font-mono text-[12px]">{etudiant.matricule ?? 'Sans matricule'}</span>
            <a href={`mailto:${etudiant.email}`} className="text-primary hover:underline">
              {etudiant.email}
            </a>
          </div>
        </div>
      </div>

      {/* Historique inscriptions */}
      <section className="flex flex-col gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          Historique des inscriptions
          {etudiant.inscriptions.length > 0 ? ` (${etudiant.inscriptions.length})` : null}
        </h3>

        {etudiant.inscriptions.length === 0 ? (
          <p className="rounded-lg border border-border-soft bg-bg px-3 py-3 text-sm text-text-muted">
            Aucune inscription enregistrée.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {etudiant.inscriptions.map((insc, idx) => (
              <InscriptionItem key={insc.id} item={insc} isCurrent={idx === 0} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/**
 * Une ligne d'inscription. Le backend renvoie déjà l'ordre chronologique
 * inverse (1ʳᵉ = année courante si l'étudiant est inscrit cette année) ;
 * on marque la 1ʳᵉ entrée avec un chip « EN COURS » pour faciliter la
 * lecture (à confirmer si Oumar expose `anneeStatut` dans le DTO).
 */
function InscriptionItem({
  item,
  isCurrent,
}: {
  item: InscriptionHistoryItemDto;
  isCurrent: boolean;
}) {
  return (
    <li className="rounded-lg border border-border-soft bg-surface p-3 shadow-sm">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[12.5px] font-semibold text-text">{item.anneeLibelle}</span>
        <div className="flex flex-shrink-0 gap-1">
          {isCurrent ? (
            <span className="inline-flex items-center rounded-full bg-ok-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ok">
              En cours
            </span>
          ) : null}
          {item.isDoubleDiplome ? (
            <span className="inline-flex items-center rounded-full bg-accent-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-800">
              Double-diplôme
            </span>
          ) : null}
        </div>
      </div>
      <dl className="grid grid-cols-[80px_1fr] gap-x-3 gap-y-1 text-[12.5px]">
        <dt className="text-text-muted">Classe</dt>
        <dd className="text-text">
          <span className="font-mono text-[12px]">{item.classeCode}</span>
          <span className="ml-1.5 text-text-sec">— {item.classeName}</span>
        </dd>
        {item.filiereSigle !== null ? (
          <>
            <dt className="text-text-muted">Filière</dt>
            <dd className="font-mono text-[12px] text-text-sec">{item.filiereSigle}</dd>
          </>
        ) : null}
      </dl>
    </li>
  );
}
