'use client';

// Page Personnel (V05 LOT 3 — tâche 3.7).
// CRUD RP/AC par la Direction. État interactif (modal, mutations) → 'use client'.

import { useState } from 'react';
import { type PersonnelDto } from '@planit/contracts';
import { Shell } from '@/components/layout/shell';
import { Button } from '@/components/ui/button';
import { PersonnelModal } from '@/components/direction/personnel-modal';
import { PersonnelSkeleton } from '@/components/direction/personnel-skeleton';
import { useToast } from '@/components/ui/toast-provider';
import { usePersonnelQuery } from '@/lib/direction-queries';
import {
  useSuspendrePersonnelMutation,
  useReactiverPersonnelMutation,
} from '@/lib/direction-mutations';

type BadgeVariant = 'blue' | 'green' | 'ok' | 'err' | 'warn';

type StatusBadgeProps = {
  variant: BadgeVariant;
  label: string;
};

function StatusBadge({ variant, label }: StatusBadgeProps) {
  const variantClasses: Record<BadgeVariant, string> = {
    blue: 'bg-primary-100 text-primary-700',
    green: 'bg-ok-100 text-ok',
    ok: 'bg-ok-100 text-ok',
    err: 'bg-err-100 text-err',
    warn: 'bg-warn-100 text-warn',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${variantClasses[variant]}`}
    >
      {label}
    </span>
  );
}

// Next.js App Router requires default export for page
// eslint-disable-next-line no-restricted-syntax
export default function PersonnelPage() {
  const toast = useToast();
  const personnelQuery = usePersonnelQuery();
  const suspendMutation = useSuspendrePersonnelMutation();
  const reactiverMutation = useReactiverPersonnelMutation();

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PersonnelDto | undefined>(undefined);

  function openCreate() {
    setEditTarget(undefined);
    setModalOpen(true);
  }

  function openEdit(p: PersonnelDto) {
    setEditTarget(p);
    setModalOpen(true);
  }

  async function handleSuspendre(p: PersonnelDto) {
    const confirmed = window.confirm(
      `Suspendre le compte de ${p.fullName} ? Cette personne ne pourra plus se connecter.`,
    );
    if (!confirmed) return;
    try {
      await suspendMutation.mutateAsync(p.id);
      toast.show(`${p.fullName} suspendu·e.`, { variant: 'success' });
    } catch {
      toast.show('Erreur lors de la suspension.', { variant: 'error' });
    }
  }

  async function handleReactiver(p: PersonnelDto) {
    try {
      await reactiverMutation.mutateAsync(p.id);
      toast.show(`${p.fullName} réactivé·e.`, { variant: 'success' });
    } catch {
      toast.show('Erreur lors de la réactivation.', { variant: 'error' });
    }
  }

  const personnel = personnelQuery.data ?? [];

  return (
    <Shell
      title="Personnel"
      breadcrumb={[{ label: 'Mon école' }, { label: 'Personnel' }]}
      activeNavId="personnel"
      surface
    >
      <PersonnelModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        mode={editTarget !== undefined ? 'edit' : 'create'}
        initial={editTarget}
      />

      {personnelQuery.isLoading ? (
        <PersonnelSkeleton />
      ) : personnelQuery.isError ? (
        <div className="rounded-2xl border border-err-100 bg-err-100 px-6 py-4 text-sm text-err">
          Erreur lors du chargement du personnel.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border-soft bg-surface shadow-sm">
          {/* Toolbar */}
          <div className="flex items-center justify-between border-b border-border-soft px-5 py-3">
            <span className="text-[13px] font-semibold text-text">
              {personnel.length} membre{personnel.length > 1 ? 's' : ''}
            </span>
            <Button variant="primary" size="sm" onClick={openCreate}>
              + Créer RP / AC
            </Button>
          </div>

          {personnel.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-text-muted">
              Aucun personnel enregistré. Créez le premier RP ou AC.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-[13.5px]">
                <thead>
                  <tr className="border-b border-border-soft bg-bg">
                    <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                      Nom
                    </th>
                    <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                      Rôle
                    </th>
                    <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                      Statut
                    </th>
                    <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                      Matricule
                    </th>
                    <th className="px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {personnel.map((p, idx) => (
                    <tr
                      key={p.id}
                      className={idx < personnel.length - 1 ? 'border-b border-border-soft' : ''}
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-text">{p.fullName}</div>
                        <div className="text-[11px] text-text-muted">{p.email}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        {p.role === 'RESPONSABLE_PROGRAMME' ? (
                          <StatusBadge variant="blue" label="RP" />
                        ) : (
                          <StatusBadge variant="green" label="AC" />
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {p.statut === 'ACTIF' ? (
                          <StatusBadge variant="ok" label="Actif" />
                        ) : p.statut === 'SUSPENDU' ? (
                          <StatusBadge variant="err" label="Suspendu" />
                        ) : (
                          <StatusBadge variant="warn" label="En attente" />
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-text-muted">{p.matricule ?? '—'}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="secondary" size="sm" onClick={() => openEdit(p)}>
                            Modifier
                          </Button>
                          {p.statut === 'SUSPENDU' ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => void handleReactiver(p)}
                              disabled={reactiverMutation.isPending}
                            >
                              Réactiver
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => void handleSuspendre(p)}
                              disabled={suspendMutation.isPending}
                            >
                              Suspendre
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Shell>
  );
}
