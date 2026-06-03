'use client';

import { useMemo, useState } from 'react';
import type { MaquetteModuleDto, MaquetteVersionDto } from '@planit/contracts';
import { cn } from '@/lib/utils';

// ── Palette UE (6 couleurs cycliques — miroir PLANIT-Design) ─────────
const UE_PALETTE = [
  { bar: '#E8620A', bg: '#FEF3E2', text: '#7C2D12', soft: '#FFF7ED', chip: '#FDE8D0' },
  { bar: '#1E40AF', bg: '#DBEAFE', text: '#1E3A8A', soft: '#EFF6FF', chip: '#BFDBFE' },
  { bar: '#15803D', bg: '#DCFCE7', text: '#14532D', soft: '#F0FDF4', chip: '#BBF7D0' },
  { bar: '#9D174D', bg: '#FCE7F3', text: '#831843', soft: '#FDF2F8', chip: '#FBCFE8' },
  { bar: '#5B21B6', bg: '#EDE9FE', text: '#4C1D95', soft: '#F5F3FF', chip: '#DDD6FE' },
  { bar: '#B91C1C', bg: '#FEE2E2', text: '#7F1D1D', soft: '#FEF2F2', chip: '#FECACA' },
] as const;

// ── Helpers ──────────────────────────────────────────────────────────

function vhe(m: MaquetteModuleDto) {
  return m.vhe ?? m.heuresCM + m.heuresTD + m.heuresTP;
}
function vht(m: MaquetteModuleDto) {
  return m.vht ?? vhe(m) + m.heuresTPE;
}

// ── Cellule numérique (lecture ou édition) ───────────────────────────

interface NumCellProps {
  readonly value: number;
  readonly field?: 'heuresCM' | 'heuresTD' | 'heuresTP' | 'heuresTPE';
  readonly mfId?: string;
  readonly isVH?: boolean;
  readonly isEditing?: boolean;
  readonly onChange?: (mfId: string, field: string, val: number) => void;
}

function NumCell({ value, field, mfId, isVH = false, isEditing = false, onChange }: NumCellProps) {
  if (isEditing && field !== undefined && mfId !== undefined) {
    return (
      <td className={cn('border-l border-border-soft px-1 py-1', isVH ? 'bg-[#FEF3C7]' : '')}>
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => onChange?.(mfId, field, Math.max(0, Number(e.target.value) || 0))}
          className="w-full rounded border border-border bg-[#FAFAF8] px-1 py-1 text-center font-mono text-[12px] tabular-nums text-text focus:border-primary focus:outline-none"
          style={{ appearance: 'textfield' }}
        />
      </td>
    );
  }
  return (
    <td
      className={cn(
        'border-l border-border-soft px-2 py-2.5 text-center font-mono text-[12.5px] tabular-nums',
        isVH
          ? 'bg-[#FFFBEB] font-semibold text-[#92400E]'
          : value === 0
            ? 'text-text-faint'
            : 'text-text',
      )}
    >
      {value === 0 && !isVH ? '—' : value}
    </td>
  );
}

// ── Tableau d'un semestre ────────────────────────────────────────────

interface SemestreTableProps {
  readonly modules: MaquetteModuleDto[];
  readonly isEditing: boolean;
  readonly edits: Record<string, Partial<MaquetteModuleDto>>;
  readonly onChange: (mfId: string, field: string, val: number) => void;
  readonly onRemove: (mfId: string) => void;
  readonly onAddModule: () => void;
}

function SemestreTable({
  modules,
  isEditing,
  edits,
  onChange,
  onRemove,
  onAddModule,
}: SemestreTableProps) {
  // Grouper par UE (code UE)
  const groups = useMemo(() => {
    const map = new Map<
      string,
      { ueCode: string; ueLibelle: string; ueColor?: string; modules: MaquetteModuleDto[] }
    >();
    for (const m of modules) {
      const ueId = m.module?.ue?.id ?? 'sans-ue';
      const ueCode = m.module?.ue?.code ?? '—';
      const ueLibelle = m.module?.ue?.libelle ?? 'Sans UE';
      const ueColorRaw = m.module?.ue?.color;
      if (!map.has(ueId)) {
        map.set(ueId, {
          ueCode,
          ueLibelle,
          ...(ueColorRaw !== undefined ? { ueColor: ueColorRaw } : {}),
          modules: [],
        });
      }
      map.get(ueId)!.modules.push(m);
    }
    return Array.from(map.values());
  }, [modules]);

  // Totaux globaux
  const totals = useMemo(() => {
    const merged = modules.map((m) => ({ ...m, ...edits[m.id] }));
    return merged.reduce(
      (acc, m) => ({
        cm: acc.cm + (m.heuresCM ?? 0),
        td: acc.td + (m.heuresTD ?? 0),
        tp: acc.tp + (m.heuresTP ?? 0),
        tpe: acc.tpe + (m.heuresTPE ?? 0),
        vhe: acc.vhe + vhe(m as MaquetteModuleDto),
        vht: acc.vht + vht(m as MaquetteModuleDto),
      }),
      { cm: 0, td: 0, tp: 0, tpe: 0, vhe: 0, vht: 0 },
    );
  }, [modules, edits]);

  if (modules.length === 0 && !isEditing) {
    return (
      <div className="flex flex-col items-center gap-2 bg-surface px-6 py-12 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-bg-warm text-text-muted">
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
        </div>
        <p className="text-[14px] font-semibold text-text-sec">Aucun module pour ce semestre</p>
        <p className="text-[12.5px] text-text-muted">
          Passez en mode composition pour ajouter des modules.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-[#FBF7F1]">
            <th className="border-b border-border px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted">
              Code
            </th>
            <th className="border-b border-border border-l border-border-soft px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted">
              Module
            </th>
            {['CM', 'TD', 'TP'].map((h) => (
              <th
                key={h}
                className="border-b border-border border-l border-border-soft px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-text-muted w-16"
              >
                {h}
              </th>
            ))}
            <th className="border-b border-border border-l border-border-soft bg-[#FEF3C7] px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-[#92400E] w-16">
              VHE
            </th>
            <th className="border-b border-border border-l border-border-soft px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-text-muted w-16">
              TPE
            </th>
            <th className="border-b border-border border-l border-border-soft bg-[#FEF3C7] px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-[#92400E] w-16">
              VHT
            </th>
            {isEditing && (
              <th className="border-b border-border border-l border-border-soft px-2 py-2.5 w-10" />
            )}
          </tr>
        </thead>
        <tbody>
          {groups.map((group, gIdx) => {
            const pal = UE_PALETTE[gIdx % UE_PALETTE.length]!;
            const groupModules = group.modules.map(
              (m) => ({ ...m, ...edits[m.id] }) as MaquetteModuleDto,
            );
            const gTotals = groupModules.reduce(
              (acc, m) => ({
                cm: acc.cm + m.heuresCM,
                td: acc.td + m.heuresTD,
                tp: acc.tp + m.heuresTP,
                tpe: acc.tpe + m.heuresTPE,
              }),
              { cm: 0, td: 0, tp: 0, tpe: 0 },
            );
            const gVHE = gTotals.cm + gTotals.td + gTotals.tp;
            const gVHT = gVHE + gTotals.tpe;

            return [
              // En-tête UE
              <tr
                key={`ue-${group.ueCode}`}
                style={{ background: pal.soft, borderLeft: `3px solid ${pal.bar}` }}
              >
                <td className="px-3 py-2">
                  <span
                    className="rounded px-1.5 py-0.5 font-mono text-[10.5px] font-bold"
                    style={{ background: pal.bg, color: pal.text }}
                  >
                    {group.ueCode}
                  </span>
                </td>
                <td className="border-l border-border-soft px-3 py-2" colSpan={isEditing ? 7 : 6}>
                  <span className="text-[13px] font-semibold" style={{ color: pal.text }}>
                    {group.ueLibelle}
                  </span>
                  <span
                    className="ml-2 rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
                    style={{ background: 'rgba(0,0,0,0.04)', color: '#78716C' }}
                  >
                    {group.modules.length} module{group.modules.length > 1 ? 's' : ''}
                  </span>
                </td>
              </tr>,
              // Lignes modules
              ...groupModules.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-border-soft bg-surface transition-colors hover:bg-bg"
                  style={{ borderLeft: `3px solid ${pal.bar}` }}
                >
                  <td className="px-3 py-2">
                    <span
                      className="rounded px-1.5 py-0.5 font-mono text-[10.5px] font-semibold"
                      style={{ background: pal.bg, color: pal.text }}
                    >
                      {m.module?.code ?? '—'}
                    </span>
                  </td>
                  <td className="border-l border-border-soft px-3 py-2 text-[13px] font-medium text-text">
                    {m.module?.libelle ?? m.moduleId}
                  </td>
                  <NumCell
                    value={m.heuresCM}
                    field="heuresCM"
                    mfId={m.id}
                    isEditing={isEditing}
                    onChange={onChange}
                  />
                  <NumCell
                    value={m.heuresTD}
                    field="heuresTD"
                    mfId={m.id}
                    isEditing={isEditing}
                    onChange={onChange}
                  />
                  <NumCell
                    value={m.heuresTP}
                    field="heuresTP"
                    mfId={m.id}
                    isEditing={isEditing}
                    onChange={onChange}
                  />
                  <NumCell value={vhe(m)} isVH />
                  <NumCell
                    value={m.heuresTPE}
                    field="heuresTPE"
                    mfId={m.id}
                    isEditing={isEditing}
                    onChange={onChange}
                  />
                  <NumCell value={vht(m)} isVH />
                  {isEditing && (
                    <td className="border-l border-border-soft px-1 py-1 text-center">
                      <button
                        type="button"
                        onClick={() => onRemove(m.id)}
                        title="Retirer ce module"
                        className="flex size-7 items-center justify-center rounded-md text-text-faint transition-colors hover:bg-err-100 hover:text-err"
                      >
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6M14 11v6" />
                        </svg>
                      </button>
                    </td>
                  )}
                </tr>
              )),
              // Sous-total UE
              <tr
                key={`st-${group.ueCode}`}
                className="bg-[#FBF5EE]"
                style={{ borderLeft: `3px solid ${pal.bar}`, borderBottom: `2px solid ${pal.bg}` }}
              >
                <td className="px-3 py-2" />
                <td className="border-l border-border-soft px-3 py-2">
                  <span
                    className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide"
                    style={{ color: pal.text }}
                  >
                    <span className="size-1.5 rounded-full" style={{ background: pal.bar }} />
                    Sous-total · {group.ueCode}
                  </span>
                </td>
                {[gTotals.cm, gTotals.td, gTotals.tp].map((v, i) => (
                  <td
                    key={i}
                    className="border-l border-border-soft px-2 py-2 text-center font-mono text-[12.5px] font-bold tabular-nums text-text-sec"
                  >
                    {v}
                  </td>
                ))}
                <td className="border-l border-border-soft bg-[#FEF3C7] px-2 py-2 text-center font-mono text-[12.5px] font-bold tabular-nums text-[#92400E]">
                  {gVHE}
                </td>
                <td className="border-l border-border-soft px-2 py-2 text-center font-mono text-[12.5px] font-bold tabular-nums text-text-sec">
                  {gTotals.tpe}
                </td>
                <td className="border-l border-border-soft bg-[#FEF3C7] px-2 py-2 text-center font-mono text-[12.5px] font-bold tabular-nums text-[#92400E]">
                  {gVHT}
                </td>
                {isEditing && <td className="border-l border-border-soft" />}
              </tr>,
            ];
          })}

          {/* Total semestre */}
          {modules.length > 0 && (
            <tr className="bg-[#2A0F05]">
              <td className="px-3 py-3.5" />
              <td className="border-l border-white/10 px-3 py-3.5">
                <span className="flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-wide text-[#F5E6DC]">
                  <span className="flex size-[18px] items-center justify-center rounded-[5px] bg-white/10 text-[#FDE68A]">
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  Total
                </span>
              </td>
              {[totals.cm, totals.td, totals.tp].map((v, i) => (
                <td
                  key={i}
                  className="border-l border-white/10 px-2 py-3.5 text-center font-mono text-[14px] font-bold tabular-nums text-white"
                >
                  {v}
                </td>
              ))}
              <td className="border-l border-white/10 px-2 py-3.5 text-center font-mono text-[14px] font-bold tabular-nums text-[#FDE68A]">
                {totals.vhe}
              </td>
              <td className="border-l border-white/10 px-2 py-3.5 text-center font-mono text-[14px] font-bold tabular-nums text-white">
                {totals.tpe}
              </td>
              <td className="border-l border-white/10 px-2 py-3.5 text-center font-mono text-[14px] font-bold tabular-nums text-[#FDE68A]">
                {totals.vht}
              </td>
              {isEditing && <td className="border-l border-white/10" />}
            </tr>
          )}
        </tbody>
      </table>

      {/* Bouton ajouter module en mode composer */}
      {isEditing && (
        <div className="border-t border-border bg-bg p-3">
          <button
            type="button"
            onClick={onAddModule}
            className="inline-flex items-center gap-2 rounded-lg border border-dashed border-primary px-3 py-1.5 text-[12.5px] font-semibold text-primary transition-colors hover:bg-primary-50"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Ajouter un module
          </button>
        </div>
      )}
    </div>
  );
}

// ── SemestresView (conteneur des semestres dépliables) ────────────────

export interface SemestresViewProps {
  readonly version: MaquetteVersionDto | null;
  readonly isLoading: boolean;
  readonly isEditing: boolean;
  readonly edits: Record<string, Partial<MaquetteModuleDto>>;
  readonly onFieldChange: (mfId: string, field: string, val: number) => void;
  readonly onRemoveModule: (mfId: string) => void;
  readonly onAddModule: (semestre: 1 | 2) => void;
}

export function SemestresView({
  version,
  isLoading,
  isEditing,
  edits,
  onFieldChange,
  onRemoveModule,
  onAddModule,
}: SemestresViewProps) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  function toggle(s: number) {
    setExpanded((prev) => ({ ...prev, [s]: !prev[s] }));
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-bg" />
        ))}
      </div>
    );
  }

  if (version === null || version.modules === undefined) {
    return (
      <div className="py-10 text-center text-[13px] text-text-muted">
        Sélectionnez une version pour afficher les semestres.
      </div>
    );
  }

  const semestres = [1, 2] as const;

  return (
    <div className="flex flex-col gap-4">
      {semestres.map((s) => {
        const modules = (version.modules ?? []).filter((m) => m.semestre === s);
        const isExp = expanded[s] === true;
        const totalVHT = modules.reduce(
          (acc, m) => acc + vht({ ...m, ...edits[m.id] } as MaquetteModuleDto),
          0,
        );

        return (
          <div key={s} className="overflow-hidden rounded-xl border border-border">
            {/* Header semestre */}
            <div
              role="button"
              tabIndex={0}
              aria-expanded={isExp}
              onClick={() => toggle(s)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggle(s);
                }
              }}
              className={cn(
                'flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors',
                isExp ? 'rounded-t-xl bg-surface' : 'rounded-xl bg-[#FAFAF7] hover:bg-bg-warm',
              )}
            >
              <span className="flex-shrink-0 rounded-md bg-primary-100 px-2 py-1 font-mono text-[12px] font-bold tracking-wide text-primary">
                S{s}
              </span>
              <span className="flex-1 text-[13.5px] font-semibold text-text">
                Semestre {s === 1 ? 'impair' : 'pair'}
              </span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="rounded-full border border-border-soft bg-surface px-2.5 py-0.5 text-[11.5px] text-text-muted">
                  {modules.length} module{modules.length !== 1 ? 's' : ''}
                </span>
                <span className="rounded-full border border-[#FDE68A] bg-[#FEF3C7] px-2.5 py-0.5 font-mono text-[11.5px] font-semibold text-[#92400E]">
                  {totalVHT}h VHT
                </span>
                {isEditing && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddModule(s);
                    }}
                    className="rounded-md bg-primary px-2.5 py-1 text-[11.5px] font-semibold text-white transition-colors hover:bg-primary-hover"
                  >
                    + Ajouter
                  </button>
                )}
                <span
                  className={cn(
                    'flex size-7 flex-shrink-0 items-center justify-center rounded-md bg-border-soft text-text-muted transition-transform',
                    isExp ? 'rotate-0' : '-rotate-90',
                  )}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </div>
            </div>

            {isExp && (
              <div className="border-t border-border bg-surface">
                <SemestreTable
                  modules={modules}
                  isEditing={isEditing}
                  edits={edits}
                  onChange={onFieldChange}
                  onRemove={onRemoveModule}
                  onAddModule={() => onAddModule(s)}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
