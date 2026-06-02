'use client';

import { useState } from 'react';
import { type EnseignantDto } from '@planit/contracts';
import { Shell } from '@/components/layout/shell';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast-provider';
import { useEnseignantsQuery } from '@/lib/queries';
import { useDeleteEnseignantMutation } from '@/lib/mutations';
import { EnseignantModal } from '@/components/rp/enseignants/enseignant-modal';
import { EnseignantsTableSkeleton } from '@/components/rp/enseignants/enseignants-table-skeleton';

// ── Icônes inline (pas dans @planit/ui) ─────────────────────────────
function PencilIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

// ── Helpers avatar ────────────────────────────────────────────────────
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
export default function EnseignantsPage() {
  const toast = useToast();

  const [page, setPage] = useState(1);
  const [statut, setStatut] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EnseignantDto | undefined>(undefined);

  const { data, isLoading, isError } = useEnseignantsQuery(
    page,
    statut.length > 0 ? statut : undefined,
  );
  const deleteMutation = useDeleteEnseignantMutation();

  const PAGE_SIZE = 50;
  const total = data?.total ?? 0;
  const items = data?.items ?? [];
  const hasPrev = page > 1;
  const hasNext = total > page * PAGE_SIZE;

  function openCreate() {
    setEditTarget(undefined);
    setModalOpen(true);
  }

  function openEdit(enseignant: EnseignantDto) {
    setEditTarget(enseignant);
    setModalOpen(true);
  }

  async function handleDelete(enseignant: EnseignantDto) {
    const confirmed = window.confirm('Supprimer cet enseignant ?');
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync(enseignant.id);
      toast.show('Enseignant supprimé.', { variant: 'success' });
    } catch {
      toast.show("Impossible de supprimer l'enseignant.", { variant: 'error' });
    }
  }

  return (
    <Shell
      title="Enseignants"
      breadcrumb={[{ label: 'Référentiels' }, { label: 'Enseignants' }]}
      activeNavId="teachers"
      surface
    >
      {/* Toolbar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Select
            className="h-9 w-44 rounded-lg border border-border bg-surface px-3 text-sm text-text shadow-sm"
            value={statut}
            onChange={(e) => {
              setStatut(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tous les statuts</option>
            <option value="PERMANENT">Permanent</option>
            <option value="VACATAIRE">Vacataire</option>
          </Select>
        </div>
        <Button variant="primary" size="sm" onClick={openCreate}>
          + Ajouter un enseignant
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <EnseignantsTableSkeleton />
      ) : isError ? (
        <div className="flex items-center justify-center py-16 text-sm text-err">
          Impossible de charger les enseignants.
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-border-soft bg-surface shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-soft bg-bg">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    Enseignant
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    Statut
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    Spécialité
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    WhatsApp
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-sm text-text-muted">
                      Aucun enseignant trouvé.
                    </td>
                  </tr>
                ) : (
                  items.map((enseignant: EnseignantDto) => {
                    const palette = getAvatarStyle(enseignant.nomComplet);
                    const initials = getInitials(enseignant.nomComplet);
                    return (
                      <tr
                        key={enseignant.id}
                        className="border-b border-border-soft last:border-b-0 transition-colors hover:bg-bg"
                      >
                        {/* Enseignant */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div
                              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
                              style={{ backgroundColor: palette.bg, color: palette.fg }}
                            >
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate font-semibold text-text">
                                {enseignant.nomComplet}
                              </div>
                              <div className="truncate text-[12px] text-text-muted">
                                {enseignant.emailInstitutionnel}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Statut */}
                        <td className="px-4 py-3.5">
                          <span
                            className={
                              enseignant.statut === 'PERMANENT'
                                ? 'inline-flex items-center rounded-md border border-ok/20 bg-ok-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ok'
                                : 'inline-flex items-center rounded-md border border-border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted'
                            }
                          >
                            {enseignant.statut === 'PERMANENT' ? 'Permanent' : 'Vacataire'}
                          </span>
                        </td>

                        {/* Spécialité */}
                        <td className="px-4 py-3.5 font-medium text-accent">
                          {enseignant.specialite}
                        </td>

                        {/* WhatsApp */}
                        <td className="px-4 py-3.5 text-text-muted">
                          {enseignant.whatsapp ?? '—'}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              title="Modifier"
                              onClick={() => openEdit(enseignant)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-bg hover:text-text"
                            >
                              <PencilIcon />
                            </button>
                            <button
                              type="button"
                              title="Supprimer"
                              onClick={() => handleDelete(enseignant)}
                              disabled={deleteMutation.isPending}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-err-100 hover:text-err disabled:opacity-50"
                            >
                              <TrashIcon />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEdit(enseignant)}
                              className="ml-1 flex h-8 items-center gap-1 rounded-lg border border-border px-3 text-[12px] font-medium text-text-muted transition-colors hover:border-accent hover:text-accent"
                            >
                              Voir
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="9 18 15 12 9 6" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {(hasPrev || hasNext) && (
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => p - 1)}
                disabled={!hasPrev}
              >
                Précédent
              </Button>
              <span className="text-sm text-text-muted">Page {page}</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasNext}
              >
                Suivant
              </Button>
            </div>
          )}
        </>
      )}

      <EnseignantModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        mode={editTarget !== undefined ? 'edit' : 'create'}
        initial={editTarget}
      />
    </Shell>
  );
}
