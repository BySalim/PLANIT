'use client';

import { useEffect, useState } from 'react';
import { type Role, type UserAdminDto, type UserStatut } from '@planit/contracts';
import { Shell } from '@/components/layout/shell';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast-provider';
import { AdminTableSkeleton } from '@/components/admin/admin-table-skeleton';
import { TempPasswordDialog } from '@/components/admin/temp-password-dialog';
import { UserModal } from '@/components/admin/user-modal';
import { roleLabel } from '@/hooks/use-role';
import { cn } from '@/lib/utils';
import { ADMIN_PAGE_SIZE, useEcolesQuery, useUtilisateursQuery } from '@/lib/admin-queries';
import {
  useArchiveUserMutation,
  useReactivateUserMutation,
  useResetPasswordMutation,
  useSuspendUserMutation,
} from '@/lib/admin-mutations';

const ALL_ROLES: readonly Role[] = [
  'SUPER_ADMIN',
  'ADMIN',
  'DIRECTION',
  'RESPONSABLE_PROGRAMME',
  'ASSISTANT_PROGRAMME',
  'ENSEIGNANT',
  'ETUDIANT',
  'RESPONSABLE_CLASSE',
];

const STATUT_STYLE: Record<UserStatut, string> = {
  ACTIF: 'border-ok/20 bg-ok-100 text-ok',
  SUSPENDU: 'border-err/20 bg-err-100 text-err',
  EN_ATTENTE: 'border-border bg-bg text-text-muted',
};
const STATUT_LABEL: Record<UserStatut, string> = {
  ACTIF: 'Actif',
  SUSPENDU: 'Suspendu',
  EN_ATTENTE: 'En attente',
};

// Next.js App Router requires default export for page
// eslint-disable-next-line no-restricted-syntax
export default function UtilisateursPage() {
  const toast = useToast();
  const ecolesQuery = useEcolesQuery();

  const [page, setPage] = useState(1);
  const [ecoleId, setEcoleId] = useState('');
  const [role, setRole] = useState('');
  const [statut, setStatut] = useState('');
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');

  // Recherche débouncée (évite un fetch par frappe).
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(qInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [qInput]);

  const { data, isLoading, isError } = useUtilisateursQuery({
    page,
    ecoleId: ecoleId || undefined,
    role: role || undefined,
    statut: statut || undefined,
    q: q || undefined,
  });

  const suspendMutation = useSuspendUserMutation();
  const reactivateMutation = useReactivateUserMutation();
  const archiveMutation = useArchiveUserMutation();
  const resetMutation = useResetPasswordMutation();

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UserAdminDto | undefined>(undefined);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [tempPasswordUser, setTempPasswordUser] = useState<string | undefined>(undefined);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const hasPrev = page > 1;
  const hasNext = total > page * ADMIN_PAGE_SIZE;

  function openCreate() {
    setEditTarget(undefined);
    setModalOpen(true);
  }
  function openEdit(user: UserAdminDto) {
    setEditTarget(user);
    setModalOpen(true);
  }

  async function runAction(
    label: string,
    fn: () => Promise<unknown>,
    confirmMsg?: string,
  ): Promise<void> {
    if (confirmMsg !== undefined && !window.confirm(confirmMsg)) return;
    try {
      await fn();
      toast.show(label, { variant: 'success' });
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Action impossible.', { variant: 'error' });
    }
  }

  async function handleReset(user: UserAdminDto) {
    if (
      !window.confirm(
        `Réinitialiser le mot de passe de ${user.fullName} ? Ses sessions seront fermées.`,
      )
    ) {
      return;
    }
    try {
      const res = await resetMutation.mutateAsync(user.id);
      setTempPasswordUser(user.fullName);
      setTempPassword(res.temporaryPassword);
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Réinitialisation impossible.', {
        variant: 'error',
      });
    }
  }

  function resetFilters() {
    setEcoleId('');
    setRole('');
    setStatut('');
    setQInput('');
    setPage(1);
  }

  const filterSelectClass =
    'h-9 w-auto min-w-[9rem] rounded-lg border border-border bg-surface px-3 text-sm shadow-sm';

  return (
    <Shell
      title="Utilisateurs"
      breadcrumb={[{ label: 'Système' }, { label: 'Utilisateurs' }]}
      activeNavId="utilisateurs"
      surface
    >
      {/* Filtres */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="search"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Rechercher (nom, e-mail, matricule)…"
            className="h-9 w-64"
          />
          <Select
            className={filterSelectClass}
            value={ecoleId}
            onChange={(e) => {
              setEcoleId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Toutes les écoles</option>
            {(ecolesQuery.data ?? []).map((ecole) => (
              <option key={ecole.id} value={ecole.id}>
                {ecole.nom}
              </option>
            ))}
          </Select>
          <Select
            className={filterSelectClass}
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tous les rôles</option>
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>
                {roleLabel(r)}
              </option>
            ))}
          </Select>
          <Select
            className={filterSelectClass}
            value={statut}
            onChange={(e) => {
              setStatut(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tous les statuts</option>
            <option value="ACTIF">Actif</option>
            <option value="SUSPENDU">Suspendu</option>
            <option value="EN_ATTENTE">En attente</option>
          </Select>
          {(ecoleId || role || statut || q) !== '' ? (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Réinitialiser
            </Button>
          ) : null}
        </div>
        <Button variant="primary" size="sm" onClick={openCreate}>
          + Créer un compte
        </Button>
      </div>

      {/* Contenu */}
      {isLoading ? (
        <AdminTableSkeleton />
      ) : isError ? (
        <div className="flex items-center justify-center py-16 text-sm text-err">
          Impossible de charger les utilisateurs.
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-border-soft bg-surface shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-soft bg-bg">
                  <Th>Utilisateur</Th>
                  <Th>Rôle</Th>
                  <Th>École</Th>
                  <Th>Statut</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-sm text-text-muted">
                      Aucun utilisateur ne correspond à ces critères.
                    </td>
                  </tr>
                ) : (
                  items.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-border-soft transition-colors last:border-b-0 hover:bg-bg"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={user.fullName} size={36} />
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-text">{user.fullName}</div>
                            <div className="truncate text-[12px] text-text-muted">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-text-sec">{roleLabel(user.role)}</td>
                      <td className="px-4 py-3.5 text-text-muted">
                        {user.ecole?.nom ?? <span className="italic">cross-école</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
                            STATUT_STYLE[user.statut],
                          )}
                        >
                          {STATUT_LABEL[user.statut]}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <RowAction onClick={() => openEdit(user)}>Modifier</RowAction>
                          {user.statut === 'SUSPENDU' ? (
                            <RowAction
                              tone="ok"
                              onClick={() =>
                                runAction(`${user.fullName} réactivé.`, () =>
                                  reactivateMutation.mutateAsync(user.id),
                                )
                              }
                            >
                              Réactiver
                            </RowAction>
                          ) : (
                            <RowAction
                              tone="err"
                              onClick={() =>
                                runAction(
                                  `${user.fullName} suspendu.`,
                                  () => suspendMutation.mutateAsync(user.id),
                                  `Suspendre ${user.fullName} ? L'accès est coupé immédiatement.`,
                                )
                              }
                            >
                              Suspendre
                            </RowAction>
                          )}
                          <RowAction onClick={() => handleReset(user)}>Réinit. mdp</RowAction>
                          <RowAction
                            tone="err"
                            onClick={() =>
                              runAction(
                                `${user.fullName} archivé.`,
                                () => archiveMutation.mutateAsync(user.id),
                                `Archiver ${user.fullName} ? Le compte sort des listes (pas de suppression dure).`,
                              )
                            }
                          >
                            Archiver
                          </RowAction>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

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
              <span className="text-sm text-text-muted">
                Page {page} · {total} compte{total > 1 ? 's' : ''}
              </span>
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

      <UserModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        mode={editTarget !== undefined ? 'edit' : 'create'}
        initial={editTarget}
      />
      <TempPasswordDialog
        isOpen={tempPassword !== null}
        onClose={() => setTempPassword(null)}
        password={tempPassword}
        userLabel={tempPasswordUser}
      />
    </Shell>
  );
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th
      className={cn(
        'px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted first:px-5',
        align === 'right' ? 'text-right' : 'text-left',
      )}
    >
      {children}
    </th>
  );
}

function RowAction({
  children,
  onClick,
  tone = 'default',
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: 'default' | 'ok' | 'err';
}) {
  const toneClass =
    tone === 'err'
      ? 'hover:border-err hover:text-err'
      : tone === 'ok'
        ? 'hover:border-ok hover:text-ok'
        : 'hover:border-accent hover:text-accent';
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-8 items-center rounded-lg border border-border px-2.5 text-[12px] font-medium text-text-muted transition-colors',
        toneClass,
      )}
    >
      {children}
    </button>
  );
}
