'use client';

import { useEffect, useMemo, useState } from 'react';
import { Shell } from '@/components/layout/shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { AdminTableSkeleton } from '@/components/admin/admin-table-skeleton';
import { ADMIN_PAGE_SIZE, useEcolesQuery, useJournalQuery } from '@/lib/admin-queries';

// Libellés FR des actions tracées (clés = `action` côté backend, V5-D8).
const ACTION_LABEL: Record<string, string> = {
  'ecole.create': 'École créée',
  'ecole.update': 'École modifiée',
  'ecole.archive': 'École archivée',
  'ecole.direction.create': 'Direction créée',
  'user.create': 'Compte créé',
  'user.update': 'Compte modifié',
  'user.suspend': 'Compte suspendu',
  'user.reactivate': 'Compte réactivé',
  'user.archive': 'Compte archivé',
  'user.reset_password': 'Mot de passe réinitialisé',
};
const ACTION_OPTIONS = Object.keys(ACTION_LABEL);

// Affichage Africa/Dakar (fuseau projet). Formate une date serveur ISO — pas une
// source de « maintenant ».
const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Africa/Dakar',
  dateStyle: 'short',
  timeStyle: 'short',
});

// Next.js App Router requires default export for page
// eslint-disable-next-line no-restricted-syntax
export default function JournalPage() {
  const ecolesQuery = useEcolesQuery();

  const [page, setPage] = useState(1);
  const [ecoleId, setEcoleId] = useState('');
  const [action, setAction] = useState('');
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(qInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [qInput]);

  const { data, isLoading, isError } = useJournalQuery({
    page,
    ecoleId: ecoleId || undefined,
    action: action || undefined,
    q: q || undefined,
  });

  const ecoleNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of ecolesQuery.data ?? []) map.set(e.id, e.nom);
    return map;
  }, [ecolesQuery.data]);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const hasPrev = page > 1;
  const hasNext = total > page * ADMIN_PAGE_SIZE;

  const filterSelectClass =
    'h-9 w-auto min-w-[10rem] rounded-lg border border-border bg-surface px-3 text-sm shadow-sm';

  return (
    <Shell
      title="Journal d'audit"
      breadcrumb={[{ label: 'Système' }, { label: "Journal d'audit" }]}
      activeNavId="journal"
      surface
    >
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Input
          type="search"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          placeholder="Rechercher (action, cible, acteur)…"
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
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Toutes les actions</option>
          {ACTION_OPTIONS.map((a) => (
            <option key={a} value={a}>
              {ACTION_LABEL[a]}
            </option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <AdminTableSkeleton />
      ) : isError ? (
        <div className="flex items-center justify-center py-16 text-sm text-err">
          Impossible de charger le journal.
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-border-soft bg-surface shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-soft bg-bg">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    Acteur
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    Cible
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    École
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-sm text-text-muted">
                      Aucune action tracée pour ces critères.
                    </td>
                  </tr>
                ) : (
                  items.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-border-soft transition-colors last:border-b-0 hover:bg-bg"
                    >
                      <td className="whitespace-nowrap px-5 py-3 text-text-muted">
                        {dateFormatter.format(new Date(log.createdAt))}
                      </td>
                      <td className="px-4 py-3 font-medium text-text">
                        {log.actor?.fullName ?? <span className="italic text-text-muted">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-md bg-primary-50 px-2 py-0.5 text-[12px] font-medium text-primary">
                          {ACTION_LABEL[log.action] ?? log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-sec">
                        {log.targetType}
                        {log.targetId !== null ? (
                          <span className="ml-1 font-mono text-[11px] text-text-muted">
                            {log.targetId.slice(0, 8)}…
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {log.ecoleId !== null ? (
                          (ecoleNameById.get(log.ecoleId) ?? '—')
                        ) : (
                          <span className="italic">cross-école</span>
                        )}
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
                Page {page} · {total} entrée{total > 1 ? 's' : ''}
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
    </Shell>
  );
}
