'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { AnneeAcademiqueDto, MaquetteDto, MaquetteModuleDto } from '@planit/contracts';
import { useFlash } from '@planit/ui';
import {
  useAddMaquetteModuleMutation,
  useDeleteMaquetteModuleMutation,
  useUpdateMaquetteModuleMutation,
} from '@/lib/mutations-v3';
import { useMaquetteVersionDetailQuery, useMaquetteVersionsQuery } from '@/lib/queries-v3';
import { useUesQuery } from '@/lib/queries-v2';
import { exportNodeToImage, exportNodeToPdf } from '@/lib/export';
import { ExportMenu } from '@/components/ui/export-menu';
import { AnneesWidget } from './annees-widget';
import { MaquetteInfosModal } from './maquette-infos-modal';
import { SemestresView } from './semestres-view';
import { AddModuleModal, type ModulePickerGroup } from './add-module-modal';

// ── Empty state ───────────────────────────────────────────────────────

export function MaquettePanelEmpty() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-bg px-12 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-bg-warm opacity-50 text-text-muted">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      </div>
      <p className="text-[14px] font-semibold text-text-sec">Sélectionnez une maquette</p>
    </div>
  );
}

// ── Pilule de statistique compacte ────────────────────────────────────

function Stat({
  value,
  label,
  accent,
}: {
  value: string | number;
  label: string;
  accent?: string;
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span
        className="font-display text-[19px] font-semibold tabular-nums leading-none"
        style={{ color: accent ?? 'var(--color-text)' }}
      >
        {value}
      </span>
      <span className="text-[10.5px] font-semibold uppercase tracking-wider text-text-muted">
        {label}
      </span>
    </div>
  );
}

// ── Panneau droit ─────────────────────────────────────────────────────

export interface MaquettePanelProps {
  readonly maquette: MaquetteDto;
  readonly annees: readonly AnneeAcademiqueDto[];
}

export function MaquettePanel({ maquette, annees }: MaquettePanelProps) {
  const flash = useFlash();

  const semestresRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(
    async (fmt: 'png' | 'pdf') => {
      const node = semestresRef.current;
      if (node === null) return;
      setIsExporting(true);
      flash.push('success', 'Génération en cours…');
      try {
        const filename = `maquette-${maquette.nom.replace(/\s+/g, '-').toLowerCase()}`;
        if (fmt === 'png') {
          await exportNodeToImage(node, filename);
        } else {
          await exportNodeToPdf(node, {
            filename,
            title: `PLANIT · Maquette ${maquette.nom} (${maquette.niveau})`,
            orientation: 'portrait',
          });
        }
        flash.push('success', fmt === 'png' ? 'Image exportée' : 'PDF exporté');
      } catch {
        flash.push('error', "Erreur lors de l'export, réessayez.");
      } finally {
        setIsExporting(false);
      }
    },
    [maquette, flash],
  );

  // ── Versions
  const versionsQuery = useMaquetteVersionsQuery(maquette.id);
  const versions = useMemo(() => versionsQuery.data ?? [], [versionsQuery.data]);

  const usedAnnees = useMemo(() => {
    const ids = new Set(versions.map((v) => v.anneeAcademiqueId));
    return annees.filter((a) => ids.has(a.id)).sort((a, b) => b.libelle.localeCompare(a.libelle));
  }, [versions, annees]);

  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const effectiveVersionId = selectedVersionId ?? versions[0]?.id ?? null;

  const versionDetailQuery = useMaquetteVersionDetailQuery(effectiveVersionId);
  const versionDetail = versionDetailQuery.data ?? null;

  // ── Mode composer
  const [isComposing, setIsComposing] = useState(false);
  const [edits, setEdits] = useState<Record<string, Partial<MaquetteModuleDto>>>({});
  const [showInfosModal, setShowInfosModal] = useState(false);
  // Semestre cible de la modale d'ajout (null = fermée).
  const [addSemestre, setAddSemestre] = useState<1 | 2 | null>(null);

  const addModule = useAddMaquetteModuleMutation();
  const updateModule = useUpdateMaquetteModuleMutation();
  const deleteModule = useDeleteMaquetteModuleMutation();

  // Modules ajoutables = référentiel UE/modules moins ceux déjà dans la version.
  const uesQuery = useUesQuery();
  const presentModuleIds = useMemo(
    () => new Set((versionDetail?.modules ?? []).map((m) => m.moduleId)),
    [versionDetail],
  );
  const availableGroups = useMemo<ModulePickerGroup[]>(() => {
    return (uesQuery.data ?? [])
      .map((ue) => ({
        ueId: ue.id,
        ueCode: ue.code,
        ueLibelle: ue.libelle,
        ueColor: ue.color,
        modules: (ue.modules ?? [])
          .filter((m) => !presentModuleIds.has(m.id))
          .map((m) => ({ id: m.id, code: m.code, libelle: m.libelle, color: m.color })),
      }))
      .filter((g) => g.modules.length > 0);
  }, [uesQuery.data, presentModuleIds]);

  function startCompose() {
    setEdits({});
    setIsComposing(true);
  }
  function cancelCompose() {
    setEdits({});
    setIsComposing(false);
  }
  async function saveCompose() {
    if (effectiveVersionId === null) return;
    const mutations = Object.entries(edits).map(([id, changes]) =>
      updateModule.mutateAsync({ id, body: changes }),
    );
    try {
      await Promise.all(mutations);
      if (mutations.length > 0) flash.push('success', 'Maquette enregistrée');
    } catch {
      flash.push('error', "Certaines modifications n'ont pas pu être sauvegardées");
    }
    setEdits({});
    setIsComposing(false);
  }

  const handleFieldChange = useCallback((mfId: string, field: string, val: number) => {
    setEdits((prev) => ({ ...prev, [mfId]: { ...prev[mfId], [field]: val } }));
  }, []);

  const handleRemoveModule = useCallback(
    (mfId: string) => void deleteModule.mutateAsync({ id: mfId }),
    [deleteModule],
  );

  const handleAddModule = useCallback(
    (moduleId: string, semestre: 1 | 2) => {
      if (effectiveVersionId === null) return;
      void addModule.mutateAsync({
        versionId: effectiveVersionId,
        body: { moduleId, semestre, heuresCM: 0, heuresTD: 0, heuresTP: 0, heuresTPE: 0 },
      });
    },
    [addModule, effectiveVersionId],
  );

  // ── Stats globales (résumé en ligne)
  const stats = useMemo(() => {
    const modules = versionDetail?.modules ?? [];
    const ueIds = new Set(modules.map((m) => m.module?.ue?.id).filter(Boolean));
    const vht = modules.reduce(
      (acc, m) => acc + (m.vht ?? m.heuresCM + m.heuresTD + m.heuresTP + m.heuresTPE),
      0,
    );
    return { ueCount: ueIds.size, modCount: modules.length, vht };
  }, [versionDetail]);

  const selectedAnneeId = effectiveVersionId
    ? (versions.find((v) => v.id === effectiveVersionId)?.anneeAcademiqueId ?? null)
    : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-bg">
      <div className="px-7 pb-12 pt-5">
        {/* ── En-tête ── */}
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2.5">
              <h1 className="font-display text-[22px] font-semibold leading-tight tracking-tight text-text">
                {maquette.nom}
              </h1>
              <span className="rounded-md bg-bg-warm px-2 py-0.5 text-[11px] font-bold tracking-wide text-text-sec">
                {maquette.niveau}
              </span>
              {isComposing && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-warn px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-warn-text">
                  <span className="size-1.5 rounded-full bg-warn-text" />
                  Composition
                </span>
              )}
            </div>
            {maquette.filiere !== undefined && (
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[14px]">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-accent-100 px-2.5 py-1 text-[12px] font-bold text-accent-800">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                    <path d="M6 12v5c3 3 9 3 12 0v-5" />
                  </svg>
                  {maquette.filiere.sigle}
                </span>
                <span className="font-medium text-text-sec">{maquette.filiere.libelle}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-shrink-0 items-center gap-2">
            {isComposing ? (
              <>
                <button
                  type="button"
                  onClick={cancelCompose}
                  className="rounded-lg border border-border px-3 py-1.5 text-[12.5px] font-semibold text-text-sec transition-colors hover:border-primary hover:text-primary"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => void saveCompose()}
                  disabled={updateModule.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Terminer
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  title="Informations"
                  onClick={() => setShowInfosModal(true)}
                  className="flex size-9 items-center justify-center rounded-lg border border-border text-text-muted transition-colors hover:border-primary hover:text-primary"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                </button>
                <ExportMenu
                  onExport={(fmt) => void handleExport(fmt)}
                  isExporting={isExporting}
                  align="right"
                />
                <button
                  type="button"
                  onClick={startCompose}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-primary-hover"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                  Composer
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Barre méta : année + résumé chiffré ── */}
        <section className="mb-5 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 rounded-xl border border-border bg-surface px-5 py-3 shadow-sm">
          <AnneesWidget
            annees={usedAnnees}
            selectedId={selectedAnneeId}
            onSelect={(anneeId) => {
              const v = versions.find((ver) => ver.anneeAcademiqueId === anneeId);
              if (v) setSelectedVersionId(v.id);
            }}
          />
          {versionDetail !== null && (
            <div className="flex items-center gap-6">
              <Stat value={stats.ueCount} label="UE" />
              <Stat value={stats.modCount} label="Modules" accent="var(--color-primary)" />
              <Stat value={`${stats.vht} h`} label="Volume horaire" accent="#92400E" />
            </div>
          )}
        </section>

        {/* ── Semestres (capturé pour export) ── */}
        <div ref={semestresRef}>
          <SemestresView
            version={versionDetail}
            niveau={maquette.niveau}
            isLoading={versionDetailQuery.isLoading}
            isEditing={isComposing}
            edits={edits}
            onFieldChange={handleFieldChange}
            onRemoveModule={handleRemoveModule}
            onAddModule={(s) => setAddSemestre(s)}
          />
        </div>

        {/* ── Classes rattachées (affiché seulement s'il y en a) ── */}
        {versionDetail !== null &&
          versionDetail.classes !== undefined &&
          versionDetail.classes.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Classes ({versionDetail.classes.length})
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {versionDetail.classes.map((c) => (
                  <a
                    key={c.id}
                    href={`/classes?id=${c.id}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border-soft bg-surface px-3 py-2 transition-colors hover:border-primary"
                  >
                    <span className="min-w-0 truncate">
                      <span className="font-mono text-[11px] font-bold text-primary">{c.code}</span>
                      <span className="ml-2 text-[12.5px] text-text-sec">{c.name}</span>
                    </span>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="flex-shrink-0 text-text-faint"
                      aria-hidden
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </a>
                ))}
              </div>
            </section>
          )}
      </div>

      <MaquetteInfosModal
        open={showInfosModal}
        maquette={maquette}
        versions={versions}
        annees={annees}
        onClose={() => setShowInfosModal(false)}
      />

      <AddModuleModal
        open={addSemestre !== null}
        niveau={maquette.niveau}
        semestre={addSemestre}
        groups={availableGroups}
        onAdd={(moduleId) => {
          if (addSemestre !== null) handleAddModule(moduleId, addSemestre);
        }}
        onClose={() => setAddSemestre(null)}
      />
    </div>
  );
}
