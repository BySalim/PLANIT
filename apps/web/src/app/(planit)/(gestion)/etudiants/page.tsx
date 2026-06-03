'use client';

import { useState } from 'react';
import type { EtudiantDto } from '@planit/contracts';
import { Shell } from '@/components/layout/shell';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/search-input';
import { EtudiantsTableSkeleton } from '@/components/rp/etudiants/etudiants-skeleton';
import { useEtudiantsQuery } from '@/lib/queries-v3';

// ── Helpers avatar (calqués sur enseignants page — duplication tracée
// en TD-V03-AVATAR-EXTRACT, à factoriser dans @/lib/avatar.ts en V4). ──

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

// ── Page ─────────────────────────────────────────────────────────────
// Next.js App Router requires default export for page
// eslint-disable-next-line no-restricted-syntax
export default function EtudiantsPage() {
  const [q, setQ] = useState('');
  // PR3 (E.3) wirera ce state au drawer. PR2 = liste seule.
  const [, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, isError } = useEtudiantsQuery(q);
  const items = data ?? [];

  return (
    <Shell
      title="Étudiants"
      breadcrumb={[{ label: 'Référentiels' }, { label: 'Étudiants' }]}
      activeNavId="students"
      surface
    >
      {/* Toolbar : recherche débouncée (V3-D6, pas de bouton « + Inscrire »). */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <SearchInput
          className="w-full max-w-sm"
          placeholder="Rechercher par nom, matricule ou email…"
          ariaLabel="Rechercher un étudiant"
          onSearch={setQ}
        />
        <div className="ml-auto text-xs text-text-muted">
          {!isLoading && !isError ? `${items.length} étudiant${items.length > 1 ? 's' : ''}` : null}
        </div>
      </div>

      {isLoading ? (
        <EtudiantsTableSkeleton />
      ) : isError ? (
        <div className="flex items-center justify-center py-16 text-sm text-err">
          Impossible de charger les étudiants.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border-soft bg-surface shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-soft bg-bg">
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  Étudiant
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  Matricule
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  Email
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-sm text-text-muted">
                    {q.length > 0
                      ? `Aucun étudiant ne correspond à « ${q} ».`
                      : 'Aucun étudiant inscrit.'}
                  </td>
                </tr>
              ) : (
                items.map((etudiant: EtudiantDto) => {
                  const palette = getAvatarStyle(etudiant.nomComplet);
                  const initials = getInitials(etudiant.nomComplet);
                  return (
                    <tr
                      key={etudiant.id}
                      className="border-b border-border-soft transition-colors last:border-b-0 hover:bg-bg"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
                            style={{ background: palette.bg, color: palette.fg }}
                            aria-hidden
                          >
                            {initials}
                          </div>
                          <span className="font-medium text-text">{etudiant.nomComplet}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[12.5px] text-text-sec">
                        {etudiant.matricule ?? '—'}
                      </td>
                      <td className="px-4 py-3.5 text-text-sec">
                        <span className="truncate" title={etudiant.email}>
                          {etudiant.email}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSelectedId(etudiant.id)}
                        >
                          Voir
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}
