'use client';

import { useMemo, useState } from 'react';
import type { SuiviModuleDto } from '@planit/contracts';
import { MobileShell } from '@/components/layout/mobile-shell';
import { useStudentSuiviQuery } from '@/lib/queries-v3';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────
// Page Suivi Étudiant — LOT 9 S.4
//
// Réf design : PLANIT-Design/etudiant/screens/suivi.jsx
// Lecture seule. Onglets formation/semestre + carte récap + liste modules.
// Données : GET /api/suivi-modules (self-scope après S.2 backend)
// ─────────────────────────────────────────────────────────────────────

// ── Statut dérivé depuis SuiviModuleDto ──────────────────────────────

function deriveSuiviStatus(s: SuiviModuleDto): 'completed' | 'ongoing' | 'upcoming' {
  if (s.estTermine) return 'completed';
  const pct = s.heuresPrevues > 0 ? s.heuresFaites / s.heuresPrevues : 0;
  if (pct > 0) return 'ongoing';
  return 'upcoming';
}

// ── Métadonnées visuelles par statut ─────────────────────────────────

const STATUS_META = {
  completed: {
    label: 'Terminé',
    bg: 'bg-ok-100',
    text: 'text-ok',
    dot: 'bg-ok',
    ring: 'border-ok/25',
  },
  ongoing: {
    label: 'En cours',
    bg: 'bg-accent-100',
    text: 'text-accent-600',
    dot: 'bg-accent',
    ring: 'border-accent/25',
  },
  upcoming: {
    label: 'À venir',
    bg: 'bg-bg',
    text: 'text-text-muted',
    dot: 'bg-text-faint',
    ring: 'border-border',
  },
} as const;

// ── Anneau de progression (SVG) ───────────────────────────────────────

function RingProgress({ pct, size = 68 }: { pct: number; size?: number }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * Math.min(pct / 100, 1);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth={6}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.85)"
        strokeWidth={6}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dasharray 0.5s ease' }}
      />
    </svg>
  );
}

// ── Carte module ──────────────────────────────────────────────────────

function ModuleCard({
  item,
  status,
}: {
  item: SuiviModuleDto;
  status: ReturnType<typeof deriveSuiviStatus>;
}) {
  const meta = STATUS_META[status];
  const pct =
    item.heuresPrevues > 0 ? Math.round((item.heuresFaites / item.heuresPrevues) * 100) : 0;
  const moduleColor = item.module?.color ?? '#A8A29E';

  return (
    <div className="mb-2 flex overflow-hidden rounded-xl border border-border bg-surface">
      <div className="w-1 flex-shrink-0" style={{ background: moduleColor }} />
      <div className="flex-1 p-3">
        {/* Nom + badge statut */}
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="flex-1 truncate text-[13px] font-semibold text-text">
            {item.module?.libelle ?? item.moduleId}
          </span>
          <span
            className={cn(
              'inline-flex flex-shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold',
              meta.bg,
              meta.text,
              meta.ring,
            )}
          >
            <span className={cn('size-1 rounded-full', meta.dot)} />
            {meta.label}
          </span>
        </div>
        {/* Heures + barre progression */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[12px] text-text-muted">
            <span className="font-display text-[15px] font-bold text-primary">
              {item.heuresFaites}
              <span className="text-[10px] font-semibold">h</span>
            </span>
            <span className="text-text-faint">/</span>
            <span>{item.heuresPrevues}h</span>
          </div>
          <div className="flex-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-border-soft">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  status === 'completed'
                    ? 'bg-ok'
                    : status === 'ongoing'
                      ? 'bg-accent'
                      : 'bg-text-faint',
                )}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
          </div>
          <span className="w-9 text-right text-[11px] font-semibold tabular-nums text-text-muted">
            {pct}%
          </span>
        </div>
        {/* UE */}
        {item.module?.ue !== undefined && item.module.ue !== null && (
          <p className="mt-1.5 text-[10.5px] text-text-faint">
            {item.module.ue.code} — {item.module.ue.libelle}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Carte récap semestre ──────────────────────────────────────────────

function RecapCard({ items, label }: { items: SuiviModuleDto[]; label: string }) {
  const statuses = items.map(deriveSuiviStatus);
  const done = statuses.filter((s) => s === 'completed').length;
  const ongoing = statuses.filter((s) => s === 'ongoing').length;
  const upcoming = statuses.filter((s) => s === 'upcoming').length;
  const total = items.length;
  const pctModules = total > 0 ? Math.round((done / total) * 100) : 0;
  const totalDoneH = items.reduce((a, s) => a + s.heuresFaites, 0);
  const totalPrevH = items.reduce((a, s) => a + s.heuresPrevues, 0);
  const pctH = totalPrevH > 0 ? Math.round((totalDoneH / totalPrevH) * 100) : 0;

  return (
    <div
      className="relative mx-4 mb-1 mt-3 overflow-hidden rounded-[20px] p-4 text-white"
      style={{
        background: 'linear-gradient(135deg, #6b2d0e 0%, #8b3a12 100%)',
        boxShadow: '0 8px 24px -8px rgba(107,45,14,0.45)',
      }}
    >
      {/* Halo décoratif */}
      <div
        className="pointer-events-none absolute -right-9 -top-9 size-40 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(232,98,10,0.28) 0%, transparent 70%)' }}
      />

      {/* Titre */}
      <p className="mb-3.5 text-[10px] font-semibold uppercase tracking-widest opacity-55">
        {label}
      </p>

      {/* Anneau + stats */}
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <RingProgress pct={pctModules} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-[14px] font-bold">{pctModules}%</span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1 mb-0.5">
            <span className="font-display text-[26px] font-bold leading-none">{done}</span>
            <span className="text-[14px] font-medium opacity-55">/{total}</span>
          </div>
          <p className="mb-2.5 text-[11px] opacity-60">modules terminés</p>
          {/* Barre heures */}
          <div
            className="mb-1 h-[3px] overflow-hidden rounded-full"
            style={{ background: 'rgba(255,255,255,0.18)' }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pctH}%`, background: 'rgba(255,255,255,0.82)' }}
            />
          </div>
          <p className="text-[10.5px] tabular-nums opacity-60">
            {totalDoneH}h <span className="opacity-70">/ {totalPrevH}h</span>{' '}
            <span className="opacity-50">validées</span>
          </p>
        </div>
      </div>

      {/* Chips */}
      <div className="mt-3.5 grid grid-cols-3 gap-1.5">
        {[
          { label: 'Terminés', count: done, color: '#4ADE80' },
          { label: 'En cours', count: ongoing, color: 'var(--color-accent)' },
          { label: 'À venir', count: upcoming, color: 'rgba(255,255,255,0.45)' },
        ].map((chip) => (
          <div
            key={chip.label}
            className="flex flex-col items-center gap-0.5 rounded-[10px] py-1.5"
            style={{ background: 'rgba(255,255,255,0.10)' }}
          >
            <span className="font-display text-[17px] font-bold leading-none">{chip.count}</span>
            <span className="text-[8.5px] font-semibold uppercase tracking-wide opacity-55">
              {chip.label}
            </span>
          </div>
        ))}
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

export function EtudiantSuiviView() {
  const [semestre, setSemestre] = useState<1 | 2>(1);
  const [filter, setFilter] = useState<FilterId>('ongoing');

  // GET /api/suivi-modules — self-scope après livraison backend S.2
  const { data, isLoading, isError } = useStudentSuiviQuery(undefined, semestre);
  const items = useMemo<SuiviModuleDto[]>(() => data ?? [], [data]);

  const withStatus = useMemo(
    () => items.map((item) => ({ item, status: deriveSuiviStatus(item) })),
    [items],
  );

  const filtered = useMemo(
    () => (filter === 'all' ? withStatus : withStatus.filter(({ status }) => status === filter)),
    [withStatus, filter],
  );

  const semLabel = `Semestre ${semestre}`;

  return (
    <MobileShell>
      {/* ── Onglets semestre ── */}
      <div className="flex items-center justify-center gap-2 border-b border-border-soft bg-surface px-4 py-2.5">
        {([1, 2] as const).map((s) => {
          const active = semestre === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => {
                setSemestre(s);
                setFilter('ongoing');
              }}
              className={cn(
                'rounded-full border px-7 py-1 text-[12.5px] font-semibold transition-colors',
                active
                  ? 'border-primary bg-primary text-white'
                  : 'border-border bg-surface text-text',
              )}
            >
              S{s}
            </button>
          );
        })}
      </div>

      {/* ── Contenu ── */}
      {isLoading ? (
        <div className="p-4 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-bg" />
          ))}
        </div>
      ) : isError ? (
        <div className="mx-4 mt-4 rounded-xl border border-err bg-err-100 p-4 text-center text-sm text-err">
          Impossible de charger le suivi. Vérifiez votre connexion.
        </div>
      ) : (
        <>
          {/* Carte récap */}
          <RecapCard items={items} label={`Avancement · ${semLabel}`} />

          {/* Filtres */}
          <div className="flex gap-1.5 overflow-x-auto px-4 py-2.5 scrollbar-hide">
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

          {/* Liste modules */}
          <div className="px-4 pb-4">
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-sm text-text-muted">
                <div className="mb-2 text-2xl">✅</div>
                Aucun module dans cette catégorie.
              </div>
            ) : (
              filtered.map(({ item, status }) => (
                <ModuleCard key={item.id} item={item} status={status} />
              ))
            )}
          </div>
        </>
      )}
    </MobileShell>
  );
}
