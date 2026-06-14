'use client';

import { useMemo, useState } from 'react';
import type { SuiviModuleDto, SuiviModuleQueryDto } from '@planit/contracts';
import { CheckIcon, ChevronRightIcon } from '@planit/ui';
import { Shell } from '@/components/layout/shell';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { RowActionButton } from '@/components/ui/row-action-button';
import { SearchInput } from '@/components/ui/search-input';
import { Select } from '@/components/ui/select';
import { SuiviSeancesDrawer } from '@/components/rp/suivi/suivi-seances-drawer';
import { SuiviTableSkeleton } from '@/components/rp/suivi/suivi-skeleton';
import { ResponsableCell } from '@/components/shared/responsable-cell';
import { StatutPill } from '@/components/shared/statut-pill';
import { useAuth } from '@/contexts/auth-context';
import { useRouvrirSuiviMutation, useTerminerSuiviMutation } from '@/lib/mutations-v3';
import { useClassesQuery } from '@/lib/queries-v2';
import { useSuiviModulesQuery } from '@/lib/queries-v3';

export function RpSuiviView() {
  const { state } = useAuth();
  const isRP = state.status === 'authenticated' && state.user.role === 'RESPONSABLE_PROGRAMME';

  // Filtres (propagés au backend)
  const [classeId, setClasseId] = useState<string>('');
  const [semestre, setSemestre] = useState<string>('');
  const [statut, setStatut] = useState<'' | 'termine' | 'en_cours' | 'a_planifier'>('');
  const [q, setQ] = useState<string>('');

  // Multi-sélection bulk « Marquer terminés » (pattern Set du planning-grid LOT 4 V02).
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set());

  // E.5 — drawer « Voir les séances » ouvert depuis chaque ligne.
  const [seancesSuiviId, setSeancesSuiviId] = useState<string | null>(null);
  const [seancesSuiviLibelle, setSeancesSuiviLibelle] = useState<string | undefined>(undefined);
  const [seancesSuiviColor, setSeancesSuiviColor] = useState<string | undefined>(undefined);

  const query = useMemo<SuiviModuleQueryDto>(() => {
    const out: SuiviModuleQueryDto = {};
    if (classeId.length > 0) out.classeId = classeId;
    if (semestre.length > 0) out.semestre = Number(semestre) as 1 | 2;
    if (statut.length > 0) out.statut = statut as 'termine' | 'en_cours' | 'a_planifier';
    if (q.length > 0) out.q = q;
    return out;
  }, [classeId, semestre, statut, q]);

  const { data, isLoading, isError } = useSuiviModulesQuery(query);
  const items = useMemo(() => data ?? [], [data]);

  const classesQuery = useClassesQuery();
  const classes = classesQuery.data ?? [];

  const terminer = useTerminerSuiviMutation();

  // Statistiques en bandeau
  const counts = useMemo(() => {
    let termine = 0;
    let enCours = 0;
    let aPlanifier = 0;
    for (const it of items) {
      if (it.estTermine) termine++;
      else if (it.heuresFaites > 0) enCours++;
      else aPlanifier++;
    }
    return { total: items.length, termine, enCours, aPlanifier };
  }, [items]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function clearSelection() {
    setSelectedIds((prev) => (prev.size === 0 ? prev : new Set()));
  }
  async function bulkTerminer() {
    const ids = Array.from(selectedIds);
    // Promise.all : les flashes individuels sont gérés par la mutation,
    // mais c'est OK V1 — itération bulk uniquement.
    await Promise.allSettled(ids.map((id) => terminer.mutateAsync({ id })));
    clearSelection();
  }

  return (
    <Shell
      title="Suivi des modules"
      breadcrumb={[{ label: 'Référentiels' }, { label: 'Suivi des modules' }]}
      activeNavId="suivi"
      surface
    >
      {/* Toolbar : recherche + 3 filtres backend */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <SearchInput
          className="w-full max-w-xs"
          placeholder="Rechercher un module…"
          ariaLabel="Rechercher un module"
          onSearch={setQ}
        />
        <Select
          className="h-9 w-44 rounded-lg border border-border bg-surface px-3 text-sm"
          value={classeId}
          onChange={(e) => setClasseId(e.target.value)}
          aria-label="Filtrer par classe"
        >
          <option value="">Toutes les classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code}
            </option>
          ))}
        </Select>
        <Select
          className="h-9 w-40 rounded-lg border border-border bg-surface px-3 text-sm"
          value={semestre}
          onChange={(e) => setSemestre(e.target.value)}
          aria-label="Filtrer par semestre"
        >
          <option value="">Tous semestres</option>
          <option value="1">Semestre 1</option>
          <option value="2">Semestre 2</option>
        </Select>
        <Select
          className="h-9 w-40 rounded-lg border border-border bg-surface px-3 text-sm"
          value={statut}
          onChange={(e) => setStatut(e.target.value as typeof statut)}
          aria-label="Filtrer par statut"
        >
          <option value="">Tous statuts</option>
          <option value="a_planifier">À planifier</option>
          <option value="en_cours">En cours</option>
          <option value="termine">Terminé</option>
        </Select>
      </div>

      {/* Ligne sommaire */}
      <div className="mb-3 text-xs text-text-sec">
        {isLoading ? (
          <span
            className="inline-block h-3 w-48 animate-pulse rounded bg-border-soft align-middle"
            aria-hidden
          />
        ) : (
          <>
            <strong className="font-semibold text-text">{counts.total}</strong> modules ·{' '}
            <strong className="font-semibold text-ok">{counts.termine}</strong> terminés ·{' '}
            <strong className="font-semibold text-accent-800">{counts.enCours}</strong> en cours ·{' '}
            <strong className="font-semibold text-text-muted">{counts.aPlanifier}</strong> à
            planifier
          </>
        )}
      </div>

      {/* Barre de sélection bulk — RP uniquement (G.4 : l'AC n'a pas la
          permission de terminer, donc pas de checkbox/bulk côté UI). */}
      {isRP && selectedIds.size > 0 ? (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-primary bg-primary-50 px-4 py-2">
          <span className="text-sm font-medium text-text">
            {selectedIds.size} module{selectedIds.size > 1 ? 's' : ''} sélectionné
            {selectedIds.size > 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={bulkTerminer}
              disabled={terminer.isPending}
            >
              Marquer terminés
            </Button>
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              Annuler
            </Button>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <SuiviTableSkeleton />
      ) : isError ? (
        <div className="flex items-center justify-center py-16 text-sm text-err">
          Impossible de charger le suivi des modules.
        </div>
      ) : (
        <SuiviTable
          items={items}
          selectedIds={selectedIds}
          canEdit={isRP}
          onToggleSelect={toggleSelect}
          onViewSeances={(s) => {
            setSeancesSuiviId(s.id);
            setSeancesSuiviLibelle(s.module.libelle);
            setSeancesSuiviColor(s.module.color);
          }}
        />
      )}

      <SuiviSeancesDrawer
        suiviId={seancesSuiviId}
        moduleLibelle={seancesSuiviLibelle}
        moduleColor={seancesSuiviColor}
        onClose={() => {
          setSeancesSuiviId(null);
          setSeancesSuiviLibelle(undefined);
          setSeancesSuiviColor(undefined);
        }}
      />
    </Shell>
  );
}

// ── Table extraite pour lisibilité ───────────────────────────────────

function SuiviTable({
  items,
  selectedIds,
  canEdit,
  onToggleSelect,
  onViewSeances,
}: {
  items: readonly SuiviModuleDto[];
  selectedIds: ReadonlySet<string>;
  canEdit: boolean;
  onToggleSelect: (id: string) => void;
  onViewSeances: (suivi: SuiviModuleDto) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-border-soft bg-surface px-6 py-12 text-center text-sm text-text-muted">
        Aucun module suivi pour ces filtres.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border-soft bg-surface shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-soft bg-bg">
            {canEdit ? <th className="w-10 px-4 py-3 text-left" /> : null}
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Module
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Niveau · Sem.
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Classe
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Statut
            </th>
            {/* Responsable masqué pour le RP (canEdit) : il ne voit que ses modules. */}
            {canEdit ? null : (
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                Responsable
              </th>
            )}
            <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Prévu
            </th>
            <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Fait
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Progression
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Enseignants
            </th>
            <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((suivi) => (
            <SuiviRow
              key={suivi.id}
              suivi={suivi}
              selected={selectedIds.has(suivi.id)}
              canEdit={canEdit}
              onToggleSelect={() => onToggleSelect(suivi.id)}
              onViewSeances={() => onViewSeances(suivi)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SuiviRow({
  suivi,
  selected,
  canEdit,
  onToggleSelect,
  onViewSeances,
}: {
  suivi: SuiviModuleDto;
  selected: boolean;
  canEdit: boolean;
  onToggleSelect: () => void;
  onViewSeances: () => void;
}) {
  const terminer = useTerminerSuiviMutation();
  const rouvrir = useRouvrirSuiviMutation();
  const isPending = terminer.isPending || rouvrir.isPending;
  const progColor =
    suivi.progression >= 95 ? 'bg-ok' : suivi.progression >= 60 ? 'bg-accent' : 'bg-info';

  return (
    <tr
      className={[
        'border-b border-border-soft last:border-b-0 transition-colors',
        suivi.estTermine ? 'bg-ok-100/40' : selected ? 'bg-primary-50/60' : 'hover:bg-bg',
      ].join(' ')}
    >
      {canEdit ? (
        <td className="px-4 py-3.5">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            disabled={suivi.estTermine}
            aria-label={`Sélectionner ${suivi.module.code}`}
            className="size-4 cursor-pointer accent-primary disabled:cursor-not-allowed"
          />
        </td>
      ) : null}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <span
            className="block h-9 w-1 flex-shrink-0 rounded-full"
            style={{ background: suivi.module.color }}
            aria-hidden
          />
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-medium text-text">{suivi.module.libelle}</span>
            <span className="font-mono text-[11px] text-text-muted">{suivi.module.code}</span>
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-1.5">
          {suivi.niveau ? (
            <span className="inline-flex h-5 items-center rounded bg-primary-50 px-1.5 text-[11px] font-bold text-primary">
              {suivi.niveau}
            </span>
          ) : (
            <span className="text-text-muted">—</span>
          )}
          {suivi.semestre !== null ? (
            <span className="inline-flex h-5 items-center rounded bg-bg px-1.5 text-[11px] font-semibold tabular-nums text-text-sec">
              S{suivi.semestre}
            </span>
          ) : null}
        </div>
      </td>
      <td className="px-4 py-3.5">
        <span className="inline-flex h-5 items-center rounded bg-bg px-1.5 font-mono text-[11.5px] font-semibold text-text">
          {suivi.classeCode ?? '—'}
        </span>
      </td>
      <td className="px-4 py-3.5">
        <StatutPill statut={suivi.statut} />
      </td>
      {/* Responsable masqué pour le RP (canEdit) : il ne voit que ses modules. */}
      {canEdit ? null : (
        <td className="px-4 py-3.5">
          <ResponsableCell responsable={suivi.responsable} />
        </td>
      )}
      <td className="px-4 py-3.5 text-right tabular-nums text-text-sec">
        {formatHours(suivi.heuresPrevues)}
      </td>
      <td
        className={[
          'px-4 py-3.5 text-right tabular-nums',
          suivi.heuresFaites > 0 ? 'font-semibold text-ok' : 'text-text-muted',
        ].join(' ')}
      >
        {formatHours(suivi.heuresFaites)}
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-border-soft">
            <div
              className={`h-full transition-all ${progColor}`}
              style={{ width: `${Math.min(100, suivi.progression)}%` }}
              aria-hidden
            />
          </div>
          <span className="w-9 text-right text-[11px] font-medium tabular-nums text-text-sec">
            {Math.round(suivi.progression)}%
          </span>
        </div>
      </td>
      <td className="px-4 py-3.5">
        {suivi.enseignants.length === 0 ? (
          <span className="text-[11.5px] italic text-text-muted">Non enseigné</span>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {suivi.enseignants.map((ens) => (
              <li key={ens.id} className="flex items-center gap-2">
                <Avatar name={ens.nom} size={22} />
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-text" title={ens.nom}>
                  {ens.nom}
                </span>
                <span className="flex-shrink-0 text-[11.5px] font-bold tabular-nums text-ok">
                  {formatHours(ens.heures)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </td>
      <td className="px-4 py-3.5 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <RowActionButton
            onClick={onViewSeances}
            icon={<ChevronRightIcon size={12} color="currentColor" />}
          >
            Voir
          </RowActionButton>
          {canEdit && suivi.estTermine ? (
            <RowActionButton onClick={() => rouvrir.mutate({ id: suivi.id })} disabled={isPending}>
              Rouvrir
            </RowActionButton>
          ) : null}
          {canEdit && !suivi.estTermine ? (
            <RowActionButton
              emphasis="primary"
              onClick={() => terminer.mutate({ id: suivi.id })}
              disabled={isPending}
              icon={<CheckIcon size={12} color="currentColor" />}
            >
              Terminer
            </RowActionButton>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function formatHours(h: number): string {
  if (h === 0) return '0h';
  if (Number.isInteger(h)) return `${h}h`;
  return `${h.toFixed(1)}h`;
}
