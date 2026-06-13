'use client';

// Vue home Direction (V05 LOT 3) — KPIs école + liens rapides.
// Données live via TanStack Query ; état interactif → 'use client' requis.

import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import {
  usePersonnelQuery,
  useAnneesDirectionQuery,
  useSallesDirectionQuery,
} from '@/lib/direction-queries';

type KpiCardProps = {
  label: string;
  value: string | number;
  isLoading?: boolean | undefined;
};

function KpiCard({ label, value, isLoading }: KpiCardProps) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-border-soft bg-surface px-6 py-5 shadow-sm">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
        {label}
      </span>
      {isLoading ? (
        <span className="h-7 w-16 animate-pulse rounded bg-border-soft" aria-hidden />
      ) : (
        <span className="text-2xl font-bold text-text">{value}</span>
      )}
    </div>
  );
}

type QuickLinkProps = {
  href: string;
  label: string;
};

function QuickLink({ href, label }: QuickLinkProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-xl border border-border-soft bg-surface px-4 py-3 text-[13.5px] font-medium text-text transition-colors hover:border-accent/40 hover:bg-primary-50 hover:text-accent"
    >
      {label}
    </Link>
  );
}

export function DirectionHomeView() {
  const { state } = useAuth();
  const fullName = state.status === 'authenticated' ? state.user.fullName : '…';

  const personnelQuery = usePersonnelQuery();
  const anneesQuery = useAnneesDirectionQuery();
  const sallesQuery = useSallesDirectionQuery();

  const rpCount = (personnelQuery.data ?? []).filter(
    (p) => p.role === 'RESPONSABLE_PROGRAMME',
  ).length;
  const acCount = (personnelQuery.data ?? []).filter(
    (p) => p.role === 'ASSISTANT_PROGRAMME',
  ).length;
  const personnelCount = rpCount + acCount;

  const anneeCourante = (anneesQuery.data ?? []).find((a) => a.etat === 'EN_COURS');
  const anneeLabel = anneeCourante?.libelle ?? '—';

  const sallesCount = (sallesQuery.data ?? []).length;

  return (
    <div className="flex flex-col gap-8 px-6 py-8">
      {/* Greeting */}
      <div>
        <h1 className="font-display text-2xl font-semibold text-text">Bonjour, {fullName}</h1>
        <p className="mt-1 text-sm text-text-muted">Direction — tableau de bord école</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Personnel (RP + AC)"
          value={personnelCount}
          isLoading={personnelQuery.isLoading}
        />
        <KpiCard label="Année en cours" value={anneeLabel} isLoading={anneesQuery.isLoading} />
        <KpiCard label="Salles" value={sallesCount} isLoading={sallesQuery.isLoading} />
      </div>

      {/* Liens rapides */}
      <div>
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          Accès rapides
        </h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <QuickLink href="/personnel" label="Gérer le personnel" />
          <QuickLink href="/annees" label="Année académique" />
          <QuickLink href="/salles" label="Salles" />
        </div>
      </div>
    </div>
  );
}
