'use client';

import { useState } from 'react';
import type { EtudiantDto } from '@planit/contracts';
import { ChevronRightIcon } from '@planit/ui';
import { Shell } from '@/components/layout/shell';
import { Avatar } from '@/components/ui/avatar';
import { RowActionButton } from '@/components/ui/row-action-button';
import { SearchInput } from '@/components/ui/search-input';
import { EtudiantDetailDrawer } from '@/components/rp/etudiants/etudiant-detail-drawer';
import { EtudiantsTableSkeleton } from '@/components/rp/etudiants/etudiants-skeleton';
import { useEtudiantsQuery } from '@/lib/queries-v3';

// ── Page ─────────────────────────────────────────────────────────────
// Next.js App Router requires default export for page
// eslint-disable-next-line no-restricted-syntax
export default function EtudiantsPage() {
  const [q, setQ] = useState('');
  // E.3 — drawer fiche étudiant ouvert depuis le bouton « Voir »
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
                  return (
                    <tr
                      key={etudiant.id}
                      className="border-b border-border-soft transition-colors last:border-b-0 hover:bg-bg"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={etudiant.nomComplet} size={36} />
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
                        <RowActionButton
                          onClick={() => setSelectedId(etudiant.id)}
                          icon={<ChevronRightIcon size={12} color="currentColor" />}
                        >
                          Voir
                        </RowActionButton>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      <EtudiantDetailDrawer etudiantId={selectedId} onClose={() => setSelectedId(null)} />
    </Shell>
  );
}
