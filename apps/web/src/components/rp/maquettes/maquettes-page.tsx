'use client';

import { useState } from 'react';
import { Shell } from '@/components/layout/shell';
import { useAnneesQuery, useMaquettesQuery } from '@/lib/queries-v3';
import { MaquetteList } from './maquette-list';
import { MaquettePanel, MaquettePanelEmpty } from './maquette-panel';

// ── Wrapper (export default pour Next.js via re-export) ───────────────

export function MaquettesPageWrapper() {
  return (
    <Shell
      title="Maquettes de formation"
      breadcrumb={[{ label: 'Pédagogie' }, { label: 'Maquettes' }]}
      activeNavId="maquettes"
      fullBleed
    >
      <MaquettesPageInner />
    </Shell>
  );
}

// ── Page interne (logique + layout) ──────────────────────────────────

function MaquettesPageInner() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Queries
  const maquettesQuery = useMaquettesQuery();
  const anneesQuery = useAnneesQuery();

  const maquettes = maquettesQuery.data ?? [];
  const annees = anneesQuery.data ?? [];

  const selected = maquettes.find((m) => m.id === selectedId) ?? null;

  // ADR-0018 : pas de création directe de maquette ici — elle naît de la création
  // d'une formation. Cette page sert à consulter et **composer** (modules/heures).
  return (
    // Layout master-detail pleine hauteur
    <div className="flex h-full min-h-0">
      {/* Panneau gauche */}
      <MaquetteList
        maquettes={maquettes}
        annees={annees}
        selectedId={selectedId}
        isLoading={maquettesQuery.isLoading}
        onSelect={setSelectedId}
      />

      {/* Panneau droit */}
      {selected !== null ? (
        <MaquettePanel key={selected.id} maquette={selected} annees={annees} />
      ) : (
        <MaquettePanelEmpty />
      )}
    </div>
  );
}
