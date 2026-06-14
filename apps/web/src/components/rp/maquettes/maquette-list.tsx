'use client';

import { useMemo, useState } from 'react';
import type { AnneeAcademiqueDto, MaquetteDto } from '@planit/contracts';
import { useIsRp } from '@/hooks/use-role';
import { cn } from '@/lib/utils';

// ── Niveaux ordonnés ──────────────────────────────────────────────────
const NIVEAU_ORDER = ['L1', 'L2', 'L3', 'M1', 'M2'] as const;

function etatMeta(etat: string) {
  switch (etat) {
    case 'EN_COURS':
      return { bg: 'bg-ok-100', text: 'text-ok', dot: 'bg-ok', ring: 'border-ok/25' };
    case 'PLANIFIEE':
      return { bg: 'bg-warn', text: 'text-warn-text', dot: 'bg-accent', ring: 'border-accent/25' };
    default:
      return { bg: 'bg-bg', text: 'text-text-muted', dot: 'bg-text-faint', ring: 'border-border' };
  }
}

// ── Item de liste ─────────────────────────────────────────────────────

interface MaquetteItemProps {
  readonly maquette: MaquetteDto;
  readonly selected: boolean;
  readonly lastAnnee: AnneeAcademiqueDto | null;
  readonly onClick: () => void;
}

function MaquetteItem({ maquette, selected, lastAnnee, onClick }: MaquetteItemProps) {
  const meta = lastAnnee ? etatMeta(lastAnnee.etat) : null;
  // Le RP ne voit que ses maquettes → le responsable (lui-même) est redondant.
  const showResponsable = !useIsRp();

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'block w-full border-l-[3px] px-3 py-2.5 text-left font-sans transition-colors',
        selected ? 'border-l-primary bg-primary-50' : 'border-l-transparent hover:bg-bg-warm',
      )}
    >
      {/* Ligne 1 : niveau badge */}
      <div className="mb-1 flex items-center gap-2">
        <span className="rounded-full bg-bg-warm px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-text-sec">
          {maquette.niveau}
        </span>
      </div>
      {/* Ligne 2 : nom */}
      <div className="mb-1 truncate text-[13px] font-semibold text-text">{maquette.nom}</div>
      {/* Ligne 3 : filière + dernière année */}
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-[11px] text-text-muted">
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3 3 9 3 12 0v-5" />
          </svg>
          {maquette.filiere?.sigle ?? ''}
          {/* V05 LOT 4.3 — Responsable (V5-D5) — masqué pour le RP */}
          {showResponsable && maquette.responsable ? (
            <span
              className="ml-1 truncate"
              title={`Responsable : ${maquette.responsable.fullName}`}
            >
              · {maquette.responsable.fullName}
            </span>
          ) : null}
        </span>
        {meta !== null && lastAnnee !== null ? (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold tabular-nums',
              meta.bg,
              meta.text,
              meta.ring,
            )}
          >
            <span className={cn('size-[5px] flex-shrink-0 rounded-full', meta.dot)} />
            {lastAnnee.libelle}
          </span>
        ) : (
          <span className="text-[10.5px] italic text-text-faint">inutilisée</span>
        )}
      </div>
    </button>
  );
}

// ── Accordéon par niveau ──────────────────────────────────────────────

interface NiveauAccordionProps {
  readonly niveau: string;
  readonly maquettes: MaquetteDto[];
  readonly selectedId: string | null;
  readonly getLastAnnee: (m: MaquetteDto) => AnneeAcademiqueDto | null;
  readonly onSelect: (id: string) => void;
}

function NiveauAccordion({
  niveau,
  maquettes,
  selectedId,
  getLastAnnee,
  onSelect,
}: NiveauAccordionProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border-soft last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-bg-warm"
      >
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-primary-100 px-2 py-0.5 font-mono text-[11px] font-bold tracking-wide text-primary">
            {niveau}
          </span>
          <span className="text-[12px] text-text-muted">
            {maquettes.length} maquette{maquettes.length > 1 ? 's' : ''}
          </span>
        </div>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className={cn('text-text-faint transition-transform', open ? 'rotate-0' : '-rotate-90')}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-border-soft">
          {maquettes.map((m) => (
            <MaquetteItem
              key={m.id}
              maquette={m}
              selected={m.id === selectedId}
              lastAnnee={getLastAnnee(m)}
              onClick={() => onSelect(m.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Panneau gauche ────────────────────────────────────────────────────

export interface MaquetteListProps {
  readonly maquettes: readonly MaquetteDto[];
  readonly annees: readonly AnneeAcademiqueDto[];
  readonly selectedId: string | null;
  readonly isLoading: boolean;
  readonly onSelect: (id: string) => void;
}

export function MaquetteList({
  maquettes,
  annees,
  selectedId,
  isLoading,
  onSelect,
}: MaquetteListProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return maquettes.filter(
      (m) =>
        q === '' ||
        m.nom.toLowerCase().includes(q) ||
        (m.filiere?.sigle.toLowerCase().includes(q) ?? false),
    );
  }, [maquettes, search]);

  // Grouper par niveau
  const grouped = useMemo(() => {
    const map = new Map<string, MaquetteDto[]>();
    for (const m of filtered) {
      const arr = map.get(m.niveau) ?? [];
      arr.push(m);
      map.set(m.niveau, arr);
    }
    return NIVEAU_ORDER.filter((n) => map.has(n)).map((n) => ({
      niveau: n,
      items: map.get(n) ?? [],
    }));
  }, [filtered]);

  // Dernière année utilisée par une maquette (via les versions — simplification : on utilise
  // les annees disponibles. Pour les versions, on s'appuie sur ce que le backend envoie dans
  // la liste lite : ici on ne l'a pas, donc on renvoie null pour l'instant, le détail
  // chargera les vraies années).
  function getLastAnnee(_m: MaquetteDto): AnneeAcademiqueDto | null {
    return null; // Chargé dans MaquettePanel via useMaquetteVersionsQuery
  }

  return (
    <aside className="flex h-full w-80 flex-shrink-0 flex-col border-r border-border bg-surface">
      {/* Header */}
      <div className="flex flex-col gap-2.5 border-b border-border-soft px-3.5 pb-3 pt-3.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
            {filtered.length} maquette{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
        <input
          type="search"
          placeholder="Rechercher…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-border bg-bg px-3 py-1.5 text-[13px] text-text placeholder:text-text-faint focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
        />
      </div>

      {/* Liste */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-px p-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-bg" />
            ))}
          </div>
        ) : grouped.length === 0 ? (
          <div className="px-4 py-10 text-center text-[12.5px] text-text-muted">
            {search !== '' ? 'Aucun résultat.' : 'Aucune maquette.'}
          </div>
        ) : (
          grouped.map(({ niveau, items }) => (
            <NiveauAccordion
              key={niveau}
              niveau={niveau}
              maquettes={items}
              selectedId={selectedId}
              getLastAnnee={getLastAnnee}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </aside>
  );
}
