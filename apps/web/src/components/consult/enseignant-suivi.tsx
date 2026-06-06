'use client';

import { useMemo, useState } from 'react';
import type { EnseignantSuiviItem } from '@/lib/queries-v3';
import { MobileShell } from '@/components/layout/mobile-shell';
import { useEnseignantSuiviQuery } from '@/lib/queries-v3';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────
// Page Suivi Enseignant — LOT 9 S.5
//
// Réf design : PLANIT-Design/enseignant/screens/suivi.jsx
// Lecture seule. Modules groupés par statut, expandables par classe.
// Données : GET /api/suivi-modules/mes-enseignements (S.3 backend)
// ─────────────────────────────────────────────────────────────────────

// ── Statut global d'un module (dérivé de ses classes) ────────────────

function moduleGlobalStatus(
  classes: EnseignantSuiviItem['classes'],
): 'completed' | 'ongoing' | 'upcoming' {
  if (classes.length === 0) return 'upcoming';
  if (classes.every((c) => c.estTermine)) return 'completed';
  if (classes.some((c) => c.heuresFaites > 0)) return 'ongoing';
  return 'upcoming';
}

// ── Métadonnées visuelles ─────────────────────────────────────────────

const STATUS_META = {
  completed: {
    label: 'Terminé',
    bg: 'bg-ok-100',
    text: 'text-ok',
    dot: 'bg-ok',
    barColor: 'var(--color-ok)',
  },
  ongoing: {
    label: 'En cours',
    bg: 'bg-accent-100',
    text: 'text-accent-600',
    dot: 'bg-accent',
    barColor: 'var(--color-accent)',
  },
  upcoming: {
    label: 'À venir',
    bg: 'bg-bg',
    text: 'text-text-muted',
    dot: 'bg-text-faint',
    barColor: 'var(--color-border)',
  },
} as const;

// ── Ligne classe dans la carte module ─────────────────────────────────

function ClassRow({ cls }: { cls: EnseignantSuiviItem['classes'][number] }) {
  const status = cls.estTermine ? 'completed' : cls.heuresFaites > 0 ? 'ongoing' : 'upcoming';
  const meta = STATUS_META[status];
  const pct = cls.heuresPrevues > 0 ? Math.round((cls.heuresFaites / cls.heuresPrevues) * 100) : 0;

  return (
    <div className="flex items-center gap-2 py-1.5">
      {/* Badge classe */}
      <span
        className={cn(
          'inline-flex h-5 min-w-[44px] flex-shrink-0 items-center justify-center rounded-[5px] border px-1.5 text-[10.5px] font-bold',
          meta.bg,
          meta.text,
        )}
        style={{ borderColor: `color-mix(in srgb, ${meta.barColor} 40%, transparent)` }}
      >
        {cls.classeCode}
      </span>

      {/* Barre de progression */}
      <div
        className={cn(
          'flex-1 h-[7px] overflow-hidden rounded-full',
          status === 'upcoming'
            ? 'border border-dashed border-border bg-transparent'
            : 'bg-border-soft',
        )}
      >
        {status !== 'upcoming' && (
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${Math.min(pct, 100)}%`, background: meta.barColor }}
          />
        )}
      </div>

      {/* Heures + % */}
      <div className="w-20 flex-shrink-0 text-right">
        <span className="text-[11px] font-semibold tabular-nums text-text">
          {cls.heuresFaites}h
        </span>
        <span className="text-[10.5px] text-text-faint">/{cls.heuresPrevues}h</span>
        <span className="ml-1 text-[10.5px] tabular-nums" style={{ color: meta.barColor }}>
          {pct}%
        </span>
      </div>
    </div>
  );
}

// ── Carte module expandable ───────────────────────────────────────────

function ModuleCard({ item }: { item: EnseignantSuiviItem }) {
  const [expanded, setExpanded] = useState(false);
  const status = moduleGlobalStatus(item.classes);
  const meta = STATUS_META[status];
  const moduleColor = item.module.color;

  const totalFait = item.classes.reduce((a, c) => a + c.heuresFaites, 0);
  const totalPrevu = item.classes.reduce((a, c) => a + c.heuresPrevues, 0);

  return (
    <div className="mb-2 overflow-hidden rounded-xl border border-border bg-surface">
      {/* En-tête */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-bg"
      >
        {/* Pastille couleur module */}
        <span className="size-2.5 flex-shrink-0 rounded-full" style={{ background: moduleColor }} />

        {/* Nom + UE */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-text">{item.module.libelle}</p>
          {item.module.ue !== null && (
            <p className="text-[10.5px] text-text-faint">{item.module.ue.code}</p>
          )}
        </div>

        {/* Badge statut */}
        <span
          className={cn(
            'inline-flex flex-shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold',
            meta.bg,
            meta.text,
          )}
        >
          <span className={cn('size-1 rounded-full', meta.dot)} />
          {meta.label}
        </span>

        {/* Heures résumé */}
        <span className="flex-shrink-0 text-[11.5px] font-semibold tabular-nums text-text-muted">
          {totalFait}h/{totalPrevu}h
        </span>

        {/* Chevron */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className={cn(
            'flex-shrink-0 text-text-faint transition-transform',
            expanded ? 'rotate-0' : '-rotate-90',
          )}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Classes dépliées */}
      {expanded && (
        <div className="border-t border-border-soft px-3 pb-2 pt-1.5">
          {item.classes.map((cls) => (
            <ClassRow key={cls.classeId} cls={cls} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Hero KPIs ─────────────────────────────────────────────────────────

function HeroBar({ items }: { items: EnseignantSuiviItem[] }) {
  const totalModules = items.length;
  const totalFait = items.flatMap((i) => i.classes).reduce((a, c) => a + c.heuresFaites, 0);

  return (
    <div className="flex items-center gap-3 border-b border-border-soft bg-surface px-4 py-3">
      <div className="flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
          Modules enseignés
        </p>
        <p className="font-display text-[22px] font-semibold text-text">{totalModules}</p>
      </div>
      <div className="h-8 w-px bg-border-soft" />
      <div className="flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
          Heures réalisées
        </p>
        <p className="font-display text-[22px] font-semibold text-primary">{totalFait}h</p>
      </div>
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────

type FilterId = 'ongoing' | 'upcoming' | 'completed' | 'all';

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'ongoing', label: 'En cours' },
  { id: 'upcoming', label: 'À venir' },
  { id: 'completed', label: 'Terminés' },
  { id: 'all', label: 'Tous' },
];

const STATUS_ORDER: FilterId[] = ['ongoing', 'upcoming', 'completed'];

export function EnseignantSuiviView() {
  const [filter, setFilter] = useState<FilterId>('all');

  const { data, isLoading, isError } = useEnseignantSuiviQuery();
  const items = useMemo<EnseignantSuiviItem[]>(() => data ?? [], [data]);

  const withStatus = useMemo(
    () => items.map((item) => ({ item, status: moduleGlobalStatus(item.classes) })),
    [items],
  );

  const filtered = useMemo(
    () => (filter === 'all' ? withStatus : withStatus.filter(({ status }) => status === filter)),
    [withStatus, filter],
  );

  // Grouper pour la vue "all" : ongoing → upcoming → completed
  const grouped = useMemo(() => {
    if (filter !== 'all') return null;
    return STATUS_ORDER.map((s) => ({
      status: s,
      label: s === 'ongoing' ? 'En cours' : s === 'upcoming' ? 'À venir' : 'Terminés',
      items: withStatus.filter(({ status }) => status === s),
    })).filter(({ items: its }) => its.length > 0);
  }, [filter, withStatus]);

  return (
    <MobileShell>
      {/* Hero KPIs */}
      {!isLoading && !isError && <HeroBar items={items} />}

      {/* Filtres */}
      <div className="flex gap-1.5 overflow-x-auto border-b border-border-soft bg-surface px-4 py-2.5 scrollbar-hide">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          const count =
            f.id === 'all'
              ? withStatus.length
              : withStatus.filter(({ status }) => status === f.id).length;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                'inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors',
                active
                  ? 'border-primary bg-primary text-white'
                  : 'border-border bg-surface text-text',
              )}
            >
              {f.label}
              <span
                className={cn(
                  'inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold',
                  active ? 'bg-white/25 text-white' : 'bg-primary-100 text-primary',
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Contenu */}
      <div className="px-4 py-3">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-bg" />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-xl border border-err bg-err-100 p-4 text-center text-sm text-err">
            Impossible de charger le suivi. Vérifiez votre connexion.
          </div>
        ) : filtered.length === 0 && grouped === null ? (
          <div className="py-8 text-center text-sm text-text-muted">
            Aucun module dans cette catégorie.
          </div>
        ) : grouped !== null ? (
          // Vue groupée (filter === 'all')
          grouped.map(({ status, label, items: its }) => (
            <div key={status} className="mb-5">
              <h3 className="mb-2 text-[10.5px] font-bold uppercase tracking-wider text-text-muted">
                {label}
                <span className="ml-2 rounded-full bg-bg px-1.5 py-0.5 font-bold text-text-faint">
                  {its.length}
                </span>
              </h3>
              {its.map(({ item }) => (
                <ModuleCard key={item.moduleId} item={item} />
              ))}
            </div>
          ))
        ) : (
          // Vue filtrée
          filtered.map(({ item }) => <ModuleCard key={item.moduleId} item={item} />)
        )}
      </div>
    </MobileShell>
  );
}
