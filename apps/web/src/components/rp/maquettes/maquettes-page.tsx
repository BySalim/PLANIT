'use client';

import { useState } from 'react';
import type { FiliereRef } from '@planit/contracts';
import { Shell } from '@/components/layout/shell';
import { useFilieresQuery } from '@/lib/queries';
import { useCreateMaquetteMutation } from '@/lib/mutations-v3';
import { useAnneesQuery, useMaquettesQuery } from '@/lib/queries-v3';
import { CreateMaquetteModal } from './maquette-infos-modal';
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
  const [createOpen, setCreateOpen] = useState(false);

  // Queries
  const maquettesQuery = useMaquettesQuery();
  const anneesQuery = useAnneesQuery();
  const filieresQuery = useFilieresQuery();
  const createMaquette = useCreateMaquetteMutation();

  const maquettes = maquettesQuery.data ?? [];
  const annees = anneesQuery.data ?? [];
  const filieres: FiliereRef[] = (filieresQuery.data ?? []).map((f) => ({
    id: f.id,
    sigle: f.sigle,
    libelle: f.libelle,
  }));

  const selected = maquettes.find((m) => m.id === selectedId) ?? null;

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
        onCreate={() => setCreateOpen(true)}
      />

      {/* Panneau droit */}
      {selected !== null ? (
        <MaquettePanel key={selected.id} maquette={selected} annees={annees} filieres={filieres} />
      ) : (
        <MaquettePanelEmpty />
      )}

      {/* Modal création */}
      <CreateMaquetteModal
        open={createOpen}
        filieres={filieres}
        isCreating={createMaquette.isPending}
        onClose={() => setCreateOpen(false)}
        onCreate={(dto) => {
          void createMaquette.mutateAsync(dto).then((created) => {
            setCreateOpen(false);
            setSelectedId(created.id);
          });
        }}
      />
    </div>
  );
}
