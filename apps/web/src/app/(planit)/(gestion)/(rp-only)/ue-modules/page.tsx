'use client';

import { useState } from 'react';
import { type UEDto, type ModuleV2Dto } from '@planit/contracts';
import { PlusIcon, ChevronRightIcon } from '@planit/ui';
import { Shell } from '@/components/layout/shell';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast-provider';
import { useUesQuery, useUeModulesQuery } from '@/lib/queries';
import { useDeleteUeMutation, useDeleteModuleMutation } from '@/lib/mutations';
import { UeModal } from '@/components/rp/ue-modules/ue-modal';
import { ModuleModal } from '@/components/rp/ue-modules/module-modal';
import {
  ModulesListSkeleton,
  UeModulesSkeleton,
} from '@/components/rp/ue-modules/ue-modules-skeleton';

// ── Icônes inline ─────────────────────────────────────────────────────
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

// ── Badge code coloré ─────────────────────────────────────────────────
function ColorBadge({ code, hex }: { code: string; hex: string }) {
  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-bold leading-none tracking-wide"
      style={{
        backgroundColor: hex + '22',
        color: hex,
        border: `1px solid ${hex}33`,
      }}
    >
      {code}
    </span>
  );
}

// ── Types modals ──────────────────────────────────────────────────────
type UeModalState =
  | { open: false }
  | { open: true; mode: 'create' }
  | { open: true; mode: 'edit'; initial: UEDto };

type ModuleModalState =
  | { open: false }
  | { open: true; mode: 'create'; ueId: string }
  | { open: true; mode: 'edit'; ueId: string; initial: ModuleV2Dto };

// ── Page ──────────────────────────────────────────────────────────────
export default function UeModulesPage() {
  const toast = useToast();

  const { data: ues, isLoading, isError } = useUesQuery();
  const deleteUeMutation = useDeleteUeMutation();

  const [openUeIds, setOpenUeIds] = useState<Set<string>>(new Set());
  const [ueModal, setUeModal] = useState<UeModalState>({ open: false });
  const [moduleModal, setModuleModal] = useState<ModuleModalState>({ open: false });

  function toggleUe(id: string) {
    setOpenUeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDeleteUe(ue: UEDto) {
    const confirmed = window.confirm(`Supprimer l'UE "${ue.libelle}" et tous ses modules ?`);
    if (!confirmed) return;
    try {
      await deleteUeMutation.mutateAsync(ue.id);
      toast.show('UE supprimée.', { variant: 'success' });
    } catch {
      toast.show("Impossible de supprimer l'UE.", { variant: 'error' });
    }
  }

  return (
    <Shell
      title="UE & Modules"
      breadcrumb={[{ label: 'Offre de formation' }, { label: 'UE & Modules' }]}
      activeNavId="modules"
      surface
    >
      {/* Toolbar */}
      <div className="mb-5 flex items-center justify-between">
        <div>{/* espace gauche — filtre à venir */}</div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setUeModal({ open: true, mode: 'create' })}
        >
          + Nouvelle UE
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <UeModulesSkeleton />
      ) : isError ? (
        <div className="flex items-center justify-center py-16 text-sm text-err">
          Impossible de charger les UE.
        </div>
      ) : !ues || ues.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <p className="text-sm text-text-muted">Aucune UE créée.</p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setUeModal({ open: true, mode: 'create' })}
          >
            Créer une UE
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border-soft bg-surface shadow-sm">
          {ues.map((ue, idx) => {
            const isOpen = openUeIds.has(ue.id);
            const isLast = idx === ues.length - 1;
            const moduleCount = ue.moduleCount ?? ue.modules?.length ?? 0;
            return (
              <UeRow
                key={ue.id}
                ue={ue}
                isOpen={isOpen}
                isLast={isLast}
                moduleCount={moduleCount}
                deletePending={deleteUeMutation.isPending}
                onToggle={() => toggleUe(ue.id)}
                onEdit={() => setUeModal({ open: true, mode: 'edit', initial: ue })}
                onDelete={() => void handleDeleteUe(ue)}
                onAddModule={() => {
                  setModuleModal({ open: true, mode: 'create', ueId: ue.id });
                  if (!isOpen) toggleUe(ue.id);
                }}
                onEditModule={(mod) =>
                  setModuleModal({ open: true, mode: 'edit', ueId: ue.id, initial: mod })
                }
              />
            );
          })}
        </div>
      )}

      {/* UE Modal */}
      <UeModal
        isOpen={ueModal.open}
        onClose={() => setUeModal({ open: false })}
        mode={ueModal.open ? ueModal.mode : 'create'}
        initial={ueModal.open && ueModal.mode === 'edit' ? ueModal.initial : undefined}
      />

      {/* Module Modal */}
      <ModuleModal
        isOpen={moduleModal.open}
        onClose={() => setModuleModal({ open: false })}
        mode={moduleModal.open ? moduleModal.mode : 'create'}
        ueId={moduleModal.open ? moduleModal.ueId : ''}
        initial={moduleModal.open && moduleModal.mode === 'edit' ? moduleModal.initial : undefined}
      />
    </Shell>
  );
}

// ── Ligne UE ──────────────────────────────────────────────────────────
// Sortie en composant dédié pour pouvoir appeler `useUeModulesQuery`
// conditionnellement par UE (les hooks doivent rester appelés au top
// level d'un composant — un appel direct dans `.map(...)` planterait
// les Rules of Hooks).

interface UeRowProps {
  ue: UEDto;
  isOpen: boolean;
  isLast: boolean;
  moduleCount: number;
  deletePending: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddModule: () => void;
  onEditModule: (mod: ModuleV2Dto) => void;
}

function UeRow({
  ue,
  isOpen,
  isLast,
  moduleCount,
  deletePending,
  onToggle,
  onEdit,
  onDelete,
  onAddModule,
  onEditModule,
}: UeRowProps) {
  // Lazy fetch : ne part qu'à la première ouverture, reste en cache pour
  // les ouvertures suivantes (staleTime: 30s). Mutations sur l'UE/module
  // invalident automatiquement via `ueKeys.all`.
  const modulesQuery = useUeModulesQuery(ue.id, { enabled: isOpen });
  const modules = modulesQuery.data ?? [];

  return (
    <div className={!isLast ? 'border-b border-border-soft' : ''}>
      {/* ── En-tête UE — toute la ligne est cliquable pour expand ── */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        aria-label={`${isOpen ? 'Réduire' : 'Développer'} l'UE ${ue.libelle}`}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
        className="flex cursor-pointer select-none items-center gap-3 px-5 py-3.5 transition-colors hover:bg-bg focus:outline-none focus-visible:bg-bg"
        style={{ borderLeft: `4px solid ${ue.color}` }}
      >
        {/* Badge code */}
        <ColorBadge code={ue.code} hex={ue.color} />

        {/* Libellé */}
        <span className="flex-1 font-semibold text-text">{ue.libelle}</span>

        {/* Compteur modules — affiche moduleCount serveur (mode lite) */}
        <span className="text-[13px] text-text-muted">
          {moduleCount} module{moduleCount !== 1 ? 's' : ''}
        </span>

        {/* Éditer l'UE */}
        <button
          type="button"
          title="Éditer l'UE"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-bg hover:text-text"
        >
          <PencilIcon />
        </button>

        {/* Supprimer l'UE */}
        <button
          type="button"
          title="Supprimer l'UE"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          disabled={deletePending}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-err-100 hover:text-err disabled:opacity-50"
        >
          <TrashIcon />
        </button>

        {/* Ajouter un module */}
        <button
          type="button"
          title="Ajouter un module"
          onClick={(e) => {
            e.stopPropagation();
            onAddModule();
          }}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-bg hover:text-accent"
        >
          <PlusIcon size={15} color="currentColor" />
        </button>

        {/* Chevron — purement décoratif (la ligne entière est le bouton) */}
        <span
          aria-hidden
          className="flex h-7 w-7 items-center justify-center text-text-muted"
          style={{
            display: 'inline-flex',
            transition: 'transform .2s ease',
            transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
        >
          <ChevronRightIcon size={15} color="currentColor" />
        </span>
      </div>

      {/* ── Liste modules (lazy-loaded à l'ouverture) ── */}
      {isOpen ? (
        <div className="border-t border-border-soft bg-bg">
          <ModulesList
            modules={modules}
            isLoading={modulesQuery.isLoading}
            isError={modulesQuery.isError}
            onEdit={onEditModule}
          />
        </div>
      ) : null}
    </div>
  );
}

interface ModulesListProps {
  modules: readonly ModuleV2Dto[];
  isLoading: boolean;
  isError: boolean;
  onEdit: (mod: ModuleV2Dto) => void;
}

function ModulesList({ modules, isLoading, isError, onEdit }: ModulesListProps) {
  const toast = useToast();
  const deleteModuleMutation = useDeleteModuleMutation();

  async function handleDeleteModule(mod: ModuleV2Dto) {
    const confirmed = window.confirm(`Supprimer le module "${mod.libelle}" ?`);
    if (!confirmed) return;
    try {
      await deleteModuleMutation.mutateAsync(mod.id);
      toast.show('Module supprimé.', { variant: 'success' });
    } catch {
      toast.show('Impossible de supprimer le module.', { variant: 'error' });
    }
  }

  if (isLoading) {
    return <ModulesListSkeleton />;
  }

  if (isError) {
    return <p className="px-14 py-3 text-[13px] text-err">Impossible de charger les modules.</p>;
  }

  if (modules.length === 0) {
    return <p className="px-14 py-3 text-[13px] text-text-muted">Aucun module dans cette UE.</p>;
  }

  return (
    <>
      {modules.map((mod, mIdx) => (
        <div
          key={mod.id}
          className={`flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface ${
            mIdx < modules.length - 1 ? 'border-b border-border-soft' : ''
          }`}
          style={{ paddingLeft: '3rem' }}
        >
          {/* Indentation visuelle */}
          <ColorBadge code={mod.code} hex={mod.color} />

          {/* Libellé module */}
          <span className="flex-1 text-[13px] text-text">{mod.libelle}</span>

          {/* Ouvrir → edit module */}
          <button
            type="button"
            onClick={() => onEdit(mod)}
            className="flex h-7 items-center gap-1 rounded-lg border border-border px-2.5 text-[12px] font-medium text-text-muted transition-colors hover:border-accent hover:text-accent"
          >
            Ouvrir
            <ChevronRightIcon size={12} color="currentColor" />
          </button>

          {/* Éditer */}
          <button
            type="button"
            title="Modifier le module"
            onClick={() => onEdit(mod)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface hover:text-text"
          >
            <PencilIcon />
          </button>

          {/* Supprimer */}
          <button
            type="button"
            title="Supprimer le module"
            onClick={() => void handleDeleteModule(mod)}
            disabled={deleteModuleMutation.isPending}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-err-100 hover:text-err disabled:opacity-50"
          >
            <TrashIcon />
          </button>
        </div>
      ))}
    </>
  );
}
