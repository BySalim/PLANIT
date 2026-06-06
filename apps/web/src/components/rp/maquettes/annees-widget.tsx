'use client';

import { useState } from 'react';
import type { AnneeAcademiqueDto } from '@planit/contracts';
import { cn } from '@/lib/utils';

// ── Helpers ──────────────────────────────────────────────────────────

function etatMeta(etat: string) {
  switch (etat) {
    case 'EN_COURS':
      return {
        bg: 'bg-ok-100',
        text: 'text-ok',
        dot: 'bg-ok',
        label: 'En cours',
        ring: 'border-ok/30',
      };
    case 'PLANIFIEE':
      return {
        bg: 'bg-warn',
        text: 'text-warn-text',
        dot: 'bg-accent',
        label: 'Planifiée',
        ring: 'border-accent/30',
      };
    default:
      return {
        bg: 'bg-bg',
        text: 'text-text-muted',
        dot: 'bg-text-faint',
        label: 'Clôturée',
        ring: 'border-border',
      };
  }
}

function formatAnnee(a: AnneeAcademiqueDto) {
  return a.libelle;
}

// ── Composant principal ───────────────────────────────────────────────

export interface AnneesWidgetProps {
  readonly annees: readonly AnneeAcademiqueDto[];
  readonly selectedId: string | null;
  readonly currentAnnee: AnneeAcademiqueDto | null;
  readonly hasCurrentVersion: boolean;
  readonly onSelect: (id: string) => void;
  readonly onRenew: () => void;
}

export function AnneesWidget({
  annees,
  selectedId,
  currentAnnee,
  hasCurrentVersion,
  onSelect,
  onRenew,
}: AnneesWidgetProps) {
  const [open, setOpen] = useState(false);

  const selected = annees.find((a) => a.id === selectedId) ?? annees[0] ?? null;

  if (annees.length === 0) {
    return (
      <div className="min-w-0">
        <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wider text-text-muted">
          Dernières utilisations
        </p>
        <span className="text-[12.5px] italic text-text-faint">
          Aucune formation rattachée pour le moment.
        </span>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-baseline gap-2">
        <span className="text-[10.5px] font-bold uppercase tracking-wider text-text-muted">
          Dernières utilisations
        </span>
        <span className="text-[10px] font-bold tabular-nums text-text-faint">
          · {annees.length}
        </span>
      </div>

      {/* Trigger chip */}
      <div
        className="relative inline-block pb-1.5"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <div className="inline-flex items-center gap-2">
          {selected !== null && <AnneeChip annee={selected} />}
          {annees.length > 1 && (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11.5px] font-medium transition-colors',
                open
                  ? 'border-border bg-bg-warm text-text-sec'
                  : 'border-transparent text-text-muted',
              )}
            >
              +{annees.length - 1}
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className={cn('transition-transform', open ? 'rotate-0' : '-rotate-90')}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
          )}
        </div>

        {/* Popover */}
        {open && (
          <div className="absolute left-0 top-full z-50 min-w-[270px] overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
            <div className="border-b border-border-soft bg-bg-warm px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-text-muted">
              Sélectionner une année
            </div>
            {annees.map((a, i) => {
              const meta = etatMeta(a.etat);
              const isSel = selected?.id === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    onSelect(a.id);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                    i < annees.length - 1 ? 'border-b border-border-soft' : '',
                    isSel
                      ? 'border-l-[3px] border-l-primary bg-primary-50'
                      : 'border-l-[3px] border-l-transparent hover:bg-bg-warm',
                  )}
                >
                  <span className={cn('size-2 flex-shrink-0 rounded-full', meta.dot)} />
                  <span className="flex-1 text-[13px] font-semibold tabular-nums text-text">
                    {formatAnnee(a)}
                  </span>
                  <span
                    className={cn(
                      'rounded-full border px-2 py-0.5 text-[10.5px] font-semibold',
                      meta.bg,
                      meta.text,
                      meta.ring,
                    )}
                  >
                    {meta.label}
                  </span>
                  {isSel && (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      className="flex-shrink-0 text-primary"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              );
            })}

            {/* Renouveler */}
            {currentAnnee !== null && (
              <button
                type="button"
                disabled={hasCurrentVersion}
                onClick={() => {
                  if (!hasCurrentVersion) {
                    onRenew();
                    setOpen(false);
                  }
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 border-t border-border-soft px-4 py-3 text-left text-[12.5px] font-semibold transition-colors',
                  hasCurrentVersion
                    ? 'cursor-default bg-bg-warm text-text-muted'
                    : 'bg-[#FFFBEB] text-[#92400E] hover:bg-[#FEF3C7]',
                )}
              >
                {hasCurrentVersion ? (
                  <>
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    À jour pour {currentAnnee.libelle}
                  </>
                ) : (
                  <>
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <rect x="8" y="2" width="8" height="4" rx="1" />
                      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                    </svg>
                    Renouveler pour {currentAnnee.libelle}
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Chip inline (utilisé dans les items de liste aussi) ───────────────

export function AnneeChip({ annee }: { annee: AnneeAcademiqueDto }) {
  const meta = etatMeta(annee.etat);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] font-semibold',
        meta.bg,
        meta.text,
        meta.ring,
      )}
    >
      <span className={cn('size-[7px] flex-shrink-0 rounded-full', meta.dot)} />
      <span className="tabular-nums">{annee.libelle}</span>
      <span className="text-[10.5px] font-medium opacity-75">{meta.label.toLowerCase()}</span>
    </span>
  );
}
