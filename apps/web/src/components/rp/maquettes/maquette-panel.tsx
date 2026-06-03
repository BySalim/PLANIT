'use client';

import { useCallback, useMemo, useState } from 'react';
import type {
  AnneeAcademiqueDto,
  FiliereRef,
  MaquetteDto,
  MaquetteModuleDto,
  MaquetteVersionDto,
} from '@planit/contracts';
import { useFlash } from '@planit/ui';
import {
  useAddMaquetteModuleMutation,
  useDeleteMaquetteModuleMutation,
  useRenewMaquetteMutation,
  useUpdateMaquetteModuleMutation,
  useUpdateMaquetteMutation,
} from '@/lib/mutations-v3';
import { useMaquetteVersionDetailQuery, useMaquetteVersionsQuery } from '@/lib/queries-v3';
import { AnneesWidget } from './annees-widget';
import { MaquetteInfosModal } from './maquette-infos-modal';
import { SemestresView } from './semestres-view';

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
      <p className="text-[14px] font-semibold text-text-sec">Sélectionnez une maquette à gauche</p>
      <p className="text-[12.5px] text-text-muted">ou créez-en une nouvelle.</p>
    </div>
  );
}

// ── Panneau droit ─────────────────────────────────────────────────────

export interface MaquettePanelProps {
  readonly maquette: MaquetteDto;
  readonly annees: readonly AnneeAcademiqueDto[];
  readonly filieres: readonly FiliereRef[];
}

export function MaquettePanel({ maquette, annees, filieres }: MaquettePanelProps) {
  const flash = useFlash();

  // ── Versions
  const versionsQuery = useMaquetteVersionsQuery(maquette.id);
  const versions = useMemo(() => versionsQuery.data ?? [], [versionsQuery.data]);

  // Année courante
  const currentAnnee = useMemo(() => annees.find((a) => a.etat === 'EN_COURS') ?? null, [annees]);

  // Années utilisées (via versions)
  const usedAnnees = useMemo(() => {
    const ids = new Set(versions.map((v) => v.anneeAcademiqueId));
    return annees.filter((a) => ids.has(a.id)).sort((a, b) => b.libelle.localeCompare(a.libelle));
  }, [versions, annees]);

  // Version sélectionnée (défaut = la plus récente)
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const effectiveVersionId = selectedVersionId ?? versions[0]?.id ?? null;

  // Détail de la version sélectionnée (avec modules + classes)
  const versionDetailQuery = useMaquetteVersionDetailQuery(effectiveVersionId);
  const versionDetail = versionDetailQuery.data ?? null;

  // La maquette a-t-elle une version pour l'année courante ?
  const hasCurrentVersion = useMemo(
    () => currentAnnee !== null && versions.some((v) => v.anneeAcademiqueId === currentAnnee.id),
    [versions, currentAnnee],
  );

  // ── Mode composer
  const [isComposing, setIsComposing] = useState(false);
  const [edits, setEdits] = useState<Record<string, Partial<MaquetteModuleDto>>>({});
  const [snapshot, setSnapshot] = useState<Record<string, Partial<MaquetteModuleDto>> | null>(null);

  // ── Modales
  const [showInfosModal, setShowInfosModal] = useState(false);

  // ── Mutations
  const updateMaquette = useUpdateMaquetteMutation();
  const renewMaquette = useRenewMaquetteMutation();
  const addModule = useAddMaquetteModuleMutation();
  const updateModule = useUpdateMaquetteModuleMutation();
  const deleteModule = useDeleteMaquetteModuleMutation();

  // ── Handlers composer
  function startCompose() {
    setSnapshot({});
    setEdits({});
    setIsComposing(true);
  }

  function cancelCompose() {
    if (snapshot !== null) setEdits(snapshot);
    setSnapshot(null);
    setIsComposing(false);
  }

  async function saveCompose() {
    if (!versionDetail?.modules || effectiveVersionId === null) return;

    // Batch update des modules modifiés
    const mutations = Object.entries(edits).map(([id, changes]) =>
      updateModule.mutateAsync({ id, body: changes }),
    );
    try {
      await Promise.all(mutations);
      flash.push(
        'success',
        `Maquette enregistrée (${mutations.length} module${mutations.length > 1 ? 's' : ''} mis à jour)`,
      );
    } catch {
      flash.push('error', "Certaines modifications n'ont pas pu être sauvegardées");
    }
    setSnapshot(null);
    setEdits({});
    setIsComposing(false);
  }

  const handleFieldChange = useCallback((mfId: string, field: string, val: number) => {
    setEdits((prev) => ({ ...prev, [mfId]: { ...prev[mfId], [field]: val } }));
  }, []);

  const handleRemoveModule = useCallback(
    async (mfId: string) => {
      await deleteModule.mutateAsync({ id: mfId });
    },
    [deleteModule],
  );

  const handleAddModule = useCallback(
    (_semestre: 1 | 2) => {
      // TODO LOT 3 — ouvrir un sélecteur de module (modal)
      flash.push('error', 'Sélecteur de module : à implémenter');
    },
    [flash],
  );

  // ── Stats globales
  const stats = useMemo(() => {
    const modules = versionDetail?.modules ?? [];
    const ueIds = new Set(modules.map((m) => m.module?.ue?.id).filter(Boolean));
    const vht = modules.reduce(
      (acc, m) => acc + (m.vht ?? m.heuresCM + m.heuresTD + m.heuresTP + m.heuresTPE),
      0,
    );
    return { ueCount: ueIds.size, modCount: modules.length, vht };
  }, [versionDetail]);

  function KpiCard({
    label,
    value,
    suffix,
    accent,
  }: {
    label: string;
    value: number;
    suffix?: string;
    accent?: string;
  }) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
        <p className="mb-1.5 truncate text-[10.5px] font-semibold uppercase tracking-wider text-text-muted">
          {label}
        </p>
        <div className="flex items-baseline gap-1.5">
          <span
            className="font-display text-[24px] font-semibold tabular-nums leading-none"
            style={{ color: accent ?? 'var(--color-text)' }}
          >
            {value}
          </span>
          {suffix !== undefined && (
            <span className="text-[12px] font-medium text-text-muted">{suffix}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-bg">
      <div className="px-7 pb-12 pt-5">
        {/* ── En-tête maquette ── */}
        <div className="mb-4 flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <h1 className="font-display text-[22px] font-semibold leading-tight tracking-tight text-text">
                {maquette.nom}
              </h1>
              {isComposing && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-warn px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-warn-text">
                  <span className="size-1.5 rounded-full bg-warn-text" />
                  Mode composition
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-bg-warm px-2.5 py-1 text-[11px] font-bold tracking-wide text-text-sec">
                {maquette.niveau}
              </span>
              {maquette.filiere !== undefined && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-100 px-2.5 py-1 text-[11px] font-semibold text-accent-800">
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                    <path d="M6 12v5c3 3 9 3 12 0v-5" />
                  </svg>
                  {maquette.filiere.sigle} — {maquette.filiere.libelle}
                </span>
              )}
              <span className="flex items-center gap-1 text-[12px] text-text-muted">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
                {versions.length} version{versions.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Boutons */}
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
                  Enregistrer
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  title="Modifier les informations"
                  onClick={() => setShowInfosModal(true)}
                  className="flex size-9 items-center justify-center rounded-lg border border-border text-text-muted transition-colors hover:border-primary hover:text-primary"
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => flash.push('error', 'Export disponible en LOT 7')}
                  className="rounded-lg border border-border px-3 py-1.5 text-[12.5px] font-semibold text-text-sec transition-colors hover:border-border hover:bg-bg-warm"
                >
                  Exporter
                </button>
                <button
                  type="button"
                  onClick={startCompose}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-primary-hover"
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                  </svg>
                  Composer la maquette
                </button>
                {!hasCurrentVersion && currentAnnee !== null && (
                  <button
                    type="button"
                    disabled={renewMaquette.isPending}
                    onClick={() => void renewMaquette.mutateAsync({ maquetteId: maquette.id })}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#92400E] px-3 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#7C2D12] disabled:opacity-60"
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <rect x="8" y="2" width="8" height="4" rx="1" />
                      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                    </svg>
                    Renouveler
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Carte infos + années (compact) ── */}
        <section className="mb-5 grid grid-cols-3 gap-6 rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div>
            <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wider text-text-muted">
              Date de création
            </p>
            <p className="text-[15px] font-semibold tabular-nums text-text">
              {/* format simple sans librairie pour rester léger ici */}
              {new Date(maquette.createdAt).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
          <div>
            <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wider text-text-muted">
              Dernière modification
            </p>
            <p className="text-[15px] font-semibold tabular-nums text-text">
              {new Date(maquette.updatedAt).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
          <AnneesWidget
            annees={usedAnnees}
            selectedId={
              effectiveVersionId
                ? (versions.find((v) => v.id === effectiveVersionId)?.anneeAcademiqueId ?? null)
                : null
            }
            currentAnnee={currentAnnee}
            hasCurrentVersion={hasCurrentVersion}
            onSelect={(anneeId) => {
              const v = versions.find((ver) => ver.anneeAcademiqueId === anneeId);
              if (v) setSelectedVersionId(v.id);
            }}
            onRenew={() => void renewMaquette.mutateAsync({ maquetteId: maquette.id })}
          />
        </section>

        {/* ── Bandeau renouvellement ── */}
        {!hasCurrentVersion && currentAnnee !== null && (
          <div className="mb-5 flex items-center gap-4 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-5 py-4">
            <div className="flex size-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#FEF3C7] text-[#92400E]">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-bold text-[#78350F]">
                Pas de version pour {currentAnnee.libelle}
              </p>
              <p className="text-[12px] text-[#92400E]/90">
                {"Cette maquette n'a pas été renouvelée pour l'année en cours."}
              </p>
            </div>
            <button
              type="button"
              disabled={renewMaquette.isPending}
              onClick={() => void renewMaquette.mutateAsync({ maquetteId: maquette.id })}
              className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-[#92400E] px-3 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#7C2D12] disabled:opacity-60"
            >
              Renouveler pour {currentAnnee.libelle}
            </button>
          </div>
        )}

        {/* ── Semestres ── */}
        <SemestresView
          version={versionDetail}
          isLoading={versionDetailQuery.isLoading}
          isEditing={isComposing}
          edits={edits}
          onFieldChange={handleFieldChange}
          onRemoveModule={(mfId) => void handleRemoveModule(mfId)}
          onAddModule={handleAddModule}
        />

        {/* ── Stats + Classes (sous les semestres, 2 colonnes) ── */}
        {versionDetail !== null && (
          <div className="mt-6 grid grid-cols-2 gap-6">
            {/* Colonne 1 — KPIs */}
            <div className="flex flex-col gap-3">
              <KpiCard label="Unités d'enseignement" value={stats.ueCount} />
              <KpiCard label="Modules" value={stats.modCount} accent="var(--color-primary)" />
              <KpiCard label="Volume horaire total" value={stats.vht} suffix="h" accent="#92400E" />
            </div>

            {/* Colonne 2 — Classes suivant cette version */}
            <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
              <p className="mb-3 text-[10.5px] font-bold uppercase tracking-wider text-text-muted">
                Classes suivant cette version
              </p>
              {versionDetail.classes === undefined || versionDetail.classes.length === 0 ? (
                <p className="text-[12.5px] italic text-text-faint">
                  Aucune classe ne suit cette version.
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {versionDetail.classes.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border-soft bg-bg px-3 py-2"
                    >
                      <div>
                        <span className="font-mono text-[11px] font-bold text-primary">
                          {c.code}
                        </span>
                        <span className="ml-2 text-[12.5px] text-text-sec">{c.name}</span>
                      </div>
                      <a
                        href={`/classes?id=${c.id}`}
                        className="rounded-md border border-border px-2 py-1 text-[11px] font-semibold text-text-muted transition-colors hover:border-primary hover:text-primary"
                      >
                        Voir →
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Modal infos ── */}
      <MaquetteInfosModal
        open={showInfosModal}
        maquette={maquette}
        versions={versions}
        annees={annees}
        isSaving={updateMaquette.isPending}
        onClose={() => setShowInfosModal(false)}
        onSave={(nom) => {
          void updateMaquette.mutateAsync({ id: maquette.id, body: { nom } }).then(() => {
            setShowInfosModal(false);
          });
        }}
      />
    </div>
  );
}
