'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { type SuiviModuleDto } from '@planit/contracts';
import { ChevronLeftIcon } from '@planit/ui';
import { Shell } from '@/components/layout/shell';
import { Button } from '@/components/ui/button';
import { useClasseEtudiantsQuery, useClasseQuery, useClasseSuiviQuery } from '@/lib/queries-v3';
import { InscriptionModal } from '@/components/inscriptions/inscription-modal';
import {
  ClasseEtudiantsTabSkeleton,
  ClasseFicheSkeleton,
  ClasseSuiviTabSkeleton,
} from '@/components/rp/classes/classe-fiche-skeleton';

// ── Atomes ────────────────────────────────────────────────────────────
function StatTile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex-1 rounded-xl border border-border-soft bg-bg-warm px-4 py-3 text-center">
      <div className="font-display text-lg font-bold tabular-nums text-text">{value}</div>
      <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-text-muted">
        {label}
      </div>
      {sub ? <div className="mt-0.5 text-[10.5px] text-text-faint">{sub}</div> : null}
    </div>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  const color =
    clamped >= 95 ? 'var(--color-ok)' : clamped >= 60 ? 'var(--color-accent)' : 'var(--color-info)';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full border border-border-soft bg-bg">
        <div
          className="h-full rounded-full"
          style={{ width: `${clamped}%`, backgroundColor: color }}
        />
      </div>
      <span className="min-w-[34px] text-right text-[11px] font-semibold tabular-nums text-text-sec">
        {clamped}%
      </span>
    </div>
  );
}

const SUIVI_COLS = 'grid grid-cols-[1.6fr_70px_70px_160px_1.2fr] items-center gap-3';

function SuiviTab({ suivi, isLoading }: { suivi: SuiviModuleDto[]; isLoading: boolean }) {
  if (isLoading) {
    return <ClasseSuiviTabSkeleton />;
  }
  if (suivi.length === 0) {
    return (
      <div className="rounded-xl border border-border-soft bg-surface py-10 text-center text-sm text-text-muted">
        Aucun module suivi pour cette classe.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-border-soft bg-surface">
      <div className={`${SUIVI_COLS} border-b border-border-soft bg-bg px-4 py-2.5`}>
        <span className="text-[10.5px] font-semibold uppercase tracking-wide text-text-muted">
          Module
        </span>
        <span className="text-right text-[10.5px] font-semibold uppercase tracking-wide text-text-muted">
          Prévu
        </span>
        <span className="text-right text-[10.5px] font-semibold uppercase tracking-wide text-text-muted">
          Fait
        </span>
        <span className="text-[10.5px] font-semibold uppercase tracking-wide text-text-muted">
          Progression
        </span>
        <span className="text-[10.5px] font-semibold uppercase tracking-wide text-text-muted">
          Enseignant·e·s
        </span>
      </div>
      {suivi.map((s, idx) => (
        <div
          key={s.id}
          className={`${SUIVI_COLS} px-4 py-3 ${idx < suivi.length - 1 ? 'border-b border-border-soft' : ''} ${s.estTermine ? 'bg-ok/5' : ''}`}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className="h-7 w-1 flex-shrink-0 rounded"
              style={{ backgroundColor: s.module.ue?.color ?? s.module.color }}
            />
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold text-text">{s.module.libelle}</div>
              <div className="font-mono text-[11px] font-semibold text-primary">
                {s.module.code}
              </div>
            </div>
          </div>
          <span className="text-right text-[13px] font-semibold tabular-nums text-text">
            {s.heuresPrevues}h
          </span>
          <span
            className={`text-right text-[13px] font-semibold tabular-nums ${s.heuresFaites > 0 ? 'text-ok' : 'text-text-faint'}`}
          >
            {s.heuresFaites}h
          </span>
          <ProgressBar pct={s.progression} />
          <div className="flex min-w-0 flex-col gap-0.5">
            {s.enseignants.length === 0 ? (
              <span className="text-[11.5px] italic text-text-faint">Non enseigné</span>
            ) : (
              s.enseignants.map((t) => (
                <div key={t.id} className="flex items-center gap-1.5 text-[11.5px] text-text-sec">
                  <span className="truncate">{t.nom}</span>
                  <span className="text-text-faint">·</span>
                  <span className="font-semibold tabular-nums text-ok">{t.heures}h</span>
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────
export default function ClasseFichePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [tab, setTab] = useState<'suivi' | 'etudiants'>('suivi');
  const [inscriptionOpen, setInscriptionOpen] = useState(false);

  const classeQuery = useClasseQuery(id);
  const etudiantsQuery = useClasseEtudiantsQuery(id);
  const suiviQuery = useClasseSuiviQuery(id);

  const classe = classeQuery.data;
  const etudiants = etudiantsQuery.data ?? [];
  const suivi = suiviQuery.data ?? [];

  return (
    <Shell
      title={classe?.name ?? 'Classe'}
      breadcrumb={[{ label: 'Référentiels' }, { label: 'Classes' }, { label: classe?.code ?? '…' }]}
      activeNavId="classes"
      surface
    >
      <button
        type="button"
        onClick={() => router.push('/classes')}
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-text-muted transition-colors hover:text-text"
      >
        <ChevronLeftIcon size={14} color="currentColor" />
        Retour aux classes
      </button>

      {classeQuery.isLoading ? (
        <ClasseFicheSkeleton />
      ) : classeQuery.isError || classe === undefined ? (
        <div className="py-16 text-center text-sm text-err">Classe introuvable.</div>
      ) : (
        <>
          {/* En-tête */}
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <h1 className="font-display text-xl font-semibold text-text">{classe.name}</h1>
            <span className="font-mono text-[12px] font-semibold text-primary">{classe.code}</span>
            {classe.niveau !== null ? (
              <span className="rounded-full bg-bg-warm px-2 py-0.5 text-[11px] font-bold text-text-sec">
                {classe.niveau}
              </span>
            ) : null}
            {classe.filiere !== null ? (
              <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[11px] font-semibold text-primary">
                {classe.filiere.sigle}
              </span>
            ) : null}
            {classe.anneeLibelle !== null ? (
              <span className="text-[12px] tabular-nums text-text-muted">
                {classe.anneeLibelle}
              </span>
            ) : null}
            {classe.isDoubleDiplome ? (
              <span className="rounded-full border border-primary-100 bg-primary-100 px-2 py-0.5 text-[10px] font-semibold text-primary">
                Double diplôme
              </span>
            ) : null}
          </div>

          {/* KPIs */}
          <div className="mb-6 flex flex-wrap gap-3">
            <StatTile
              label="Places"
              value={`${classe.places.inscrits}/${classe.places.capaciteMax}`}
              sub="inscrits / capacité"
            />
            <StatTile label="Étudiants" value={etudiants.length} />
            <StatTile label="Modules" value={suivi.length} />
            <StatTile label="Capacité" value={classe.capaciteMax} />
          </div>

          {/* Onglets */}
          <div className="mb-4 flex items-center gap-1 border-b border-border-soft">
            <button
              type="button"
              onClick={() => setTab('suivi')}
              className={`-mb-px border-b-2 px-3 py-2 text-[13px] font-semibold transition-colors ${
                tab === 'suivi'
                  ? 'border-primary text-text'
                  : 'border-transparent text-text-muted hover:text-text'
              }`}
            >
              Suivi pédagogique
              <span className="ml-1.5 text-text-faint">{suivi.length}</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('etudiants')}
              className={`-mb-px border-b-2 px-3 py-2 text-[13px] font-semibold transition-colors ${
                tab === 'etudiants'
                  ? 'border-primary text-text'
                  : 'border-transparent text-text-muted hover:text-text'
              }`}
            >
              Étudiants inscrits
              <span className="ml-1.5 text-text-faint">{etudiants.length}</span>
            </button>
          </div>

          {/* Contenu onglet */}
          {tab === 'suivi' ? (
            <SuiviTab suivi={suivi} isLoading={suiviQuery.isLoading} />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border-soft bg-surface">
              <div className="flex items-center justify-between border-b border-border-soft bg-bg px-4 py-2.5">
                <span className="text-[12px] font-semibold text-text-sec">
                  {etudiants.length} étudiant{etudiants.length > 1 ? 's' : ''}
                </span>
                <Button variant="primary" size="sm" onClick={() => setInscriptionOpen(true)}>
                  + Inscrire un étudiant
                </Button>
              </div>
              {etudiantsQuery.isLoading ? (
                <ClasseEtudiantsTabSkeleton />
              ) : etudiants.length === 0 ? (
                <div className="py-10 text-center text-sm text-text-muted">
                  Aucun étudiant inscrit dans cette classe.
                </div>
              ) : (
                etudiants.map((s, idx) => (
                  <div
                    key={s.id}
                    className={`grid grid-cols-[1.4fr_1fr_140px] items-center gap-3 px-4 py-3 ${
                      idx < etudiants.length - 1 ? 'border-b border-border-soft' : ''
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-[12px] font-bold text-primary">
                        {s.nomComplet.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate text-[13px] font-semibold text-text">
                        {s.nomComplet}
                      </span>
                    </div>
                    <span className="truncate text-[12px] text-text-sec">{s.email}</span>
                    <span className="font-mono text-[11px] text-text-muted">
                      {s.matricule ?? '—'}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {classe !== undefined ? (
        <InscriptionModal
          isOpen={inscriptionOpen}
          onClose={() => setInscriptionOpen(false)}
          classeId={classe.id}
          classeName={classe.name}
        />
      ) : null}
    </Shell>
  );
}
