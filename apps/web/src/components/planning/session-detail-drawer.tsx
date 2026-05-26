'use client';

import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { format } from 'date-fns';
import {
  COURS_SOUS_TYPES,
  EVALUATION_SOUS_TYPES,
  type SessionTypeV2,
  type SessionV2Dto,
  type SettingsDto,
  type UpdateSessionV2Dto,
  sessionSousTypeSchema,
  z,
} from '@planit/contracts';
import { Button } from '@/components/ui/button';
import { Drawer } from '@/components/ui/drawer';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useUpdateSessionV2Mutation } from '@/lib/mutations-v2';
import {
  useEnseignantsQuery,
  useSettingsQuery,
  useUesQuery,
  useV2SessionDetailQuery,
} from '@/lib/queries-v2';
import { ClasseChipsPicker } from './classe-chips-picker';

// ─────────────────────────────────────────────────────────────────────
// <SessionDetailDrawer> V2 — LOT 3 R.5 + R.6
//
// R.5 — Type lock : le `<Select>` du type est `disabled` en mode édition
//       avec tooltip ("Le type d'une séance ne peut pas être modifié...").
//       Le backend (PUT /v2/sessions/:id) rejette de toute façon tout
//       changement de type (400) — failsafe.
// R.6 — Smart dirty : pas de logique de comparaison côté client. On lit
//       `session.hasUnpublishedChanges` du backend (autoritatif, ADR-0008)
//       et on affiche le badge dans l'en-tête du drawer.
// ─────────────────────────────────────────────────────────────────────

interface SessionDetailDrawerProps {
  readonly sessionId: string | null;
  readonly onClose: () => void;
}

// ── Schema de formulaire (édition uniquement, type immuable) ───────────

function makeEditSchema(settings: SettingsDto | undefined, lockedType: SessionTypeV2) {
  return z
    .object({
      libelle: z.string().min(1, 'Libellé requis').max(200),
      sousType: z.string(),
      moduleId: z.string(),
      enseignantId: z.string(),
      intervenantNom: z.string(),
      description: z.string(),
      salleId: z.string(),
      classeIds: z.array(z.string()).min(1, 'Sélectionnez au moins une classe'),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide'),
      startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Début invalide'),
      endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Fin invalide'),
    })
    .superRefine((data, ctx) => {
      // Champs requis selon le type figé
      if (lockedType === 'COURS' || lockedType === 'EVALUATION') {
        if (!data.moduleId) {
          ctx.addIssue({ code: 'custom', path: ['moduleId'], message: 'Module requis' });
        }
        if (!data.enseignantId) {
          ctx.addIssue({
            code: 'custom',
            path: ['enseignantId'],
            message: 'Enseignant requis',
          });
        }
        if (data.sousType) {
          const allowed = lockedType === 'COURS' ? COURS_SOUS_TYPES : EVALUATION_SOUS_TYPES;
          if (!(allowed as readonly string[]).includes(data.sousType)) {
            ctx.addIssue({
              code: 'custom',
              path: ['sousType'],
              message: 'Sous-type incompatible avec le type',
            });
          }
        }
      }

      if (data.endTime <= data.startTime) {
        ctx.addIssue({
          code: 'custom',
          path: ['endTime'],
          message: 'L’heure de fin doit être postérieure au début',
        });
      }

      if (settings !== undefined) {
        const [sh, sm] = data.startTime.split(':').map(Number) as [number, number];
        const [eh, em] = data.endTime.split(':').map(Number) as [number, number];
        if (sh < settings.dayStartHour) {
          ctx.addIssue({
            code: 'custom',
            path: ['startTime'],
            message: `L’heure de début doit être ≥ ${settings.dayStartHour}h`,
          });
        }
        if (eh > settings.dayEndHour || (eh === settings.dayEndHour && em > 0)) {
          ctx.addIssue({
            code: 'custom',
            path: ['endTime'],
            message: `L’heure de fin doit être ≤ ${settings.dayEndHour}h`,
          });
        }
        if (!Number.isFinite(sh) || !Number.isFinite(eh)) {
          ctx.addIssue({
            code: 'custom',
            path: ['startTime'],
            message: 'Horaire invalide',
          });
        }
      }
    });
}

type EditValues = z.infer<ReturnType<typeof makeEditSchema>>;

const TYPE_LABEL: Record<SessionTypeV2, string> = {
  COURS: 'Cours',
  EVALUATION: 'Évaluation',
  EVENEMENT: 'Événement',
};

const SOUS_TYPE_LABEL: Record<string, string> = {
  CM: 'Cours magistral (CM)',
  TD: 'Travaux dirigés (TD)',
  TP: 'Travaux pratiques (TP)',
  EXAMEN: 'Examen',
  RATTRAPAGE: 'Rattrapage',
  DEVOIR: 'Devoir',
};

// ── Helpers ──────────────────────────────────────────────────────────

function isoToParts(iso: string): { date: string; time: string } {
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

function toIsoUtc(date: string, time: string): string {
  return `${date}T${time}:00.000Z`;
}

function valuesFromSession(s: SessionV2Dto): EditValues {
  const start = isoToParts(s.startAt);
  const end = isoToParts(s.endAt);
  return {
    libelle: s.libelle,
    sousType: s.sousType ?? '',
    moduleId: s.module?.id ?? '',
    enseignantId: s.enseignant?.id ?? '',
    intervenantNom: s.intervenantNom ?? '',
    description: s.description ?? '',
    salleId: s.salle?.id ?? '',
    classeIds: s.classes.map((c) => c.id),
    date: start.date,
    startTime: start.time,
    endTime: end.time,
  };
}

// Construit le payload UpdateSessionV2Dto. Le `type` est exclu (V2-D8).
function toUpdatePayload(values: EditValues, type: SessionTypeV2): UpdateSessionV2Dto {
  const startAt = toIsoUtc(values.date, values.startTime);
  const endAt = toIsoUtc(values.date, values.endTime);
  const base: UpdateSessionV2Dto = {
    libelle: values.libelle,
    startAt,
    endAt,
    classeIds: values.classeIds,
    salleId: values.salleId || null,
  };
  if (type === 'EVENEMENT') {
    base.intervenantNom = values.intervenantNom || null;
    base.description = values.description || null;
    // Cours/Eval fields cleared at the backend level — on les met explicitement à null.
    base.moduleId = null;
    base.enseignantId = null;
    base.sousType = null;
  } else {
    base.moduleId = values.moduleId || null;
    base.enseignantId = values.enseignantId || null;
    base.sousType = values.sousType
      ? (sessionSousTypeSchema.parse(values.sousType) as
          | 'CM'
          | 'TD'
          | 'TP'
          | 'EXAMEN'
          | 'RATTRAPAGE'
          | 'DEVOIR')
      : null;
  }
  return base;
}

// ── Composant ────────────────────────────────────────────────────────

export function SessionDetailDrawer({ sessionId, onClose }: SessionDetailDrawerProps) {
  const detailQuery = useV2SessionDetailQuery(sessionId);
  const session = detailQuery.data;
  const settingsQuery = useSettingsQuery();
  const enseignantsQuery = useEnseignantsQuery();
  const uesQuery = useUesQuery();
  const mutation = useUpdateSessionV2Mutation();
  const [isEditing, setIsEditing] = useState(false);

  // Schéma reconstruit quand le type figé ou les settings changent.
  const lockedType: SessionTypeV2 = session?.type ?? 'COURS';
  const editSchema = useMemo(
    () => makeEditSchema(settingsQuery.data, lockedType),
    [settingsQuery.data, lockedType],
  );

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });

  // Reset à la fermeture (sessionId null).
  useEffect(() => {
    if (sessionId === null) {
      setIsEditing(false);
    }
  }, [sessionId]);

  // Reset du formulaire chaque fois qu'on reçoit/recharge la séance.
  useEffect(() => {
    if (session) reset(valuesFromSession(session));
  }, [session, reset]);

  // Liste plate des modules pour le select.
  const flatModules = useMemo(() => {
    const ues = uesQuery.data ?? [];
    return ues.flatMap((ue) =>
      ue.modules.map((m) => ({
        id: m.id,
        label: `${m.code} — ${m.libelle}`,
      })),
    );
  }, [uesQuery.data]);

  const enseignants = enseignantsQuery.data ?? [];

  const onSubmit = handleSubmit(async (values) => {
    if (!session) return;
    const body = toUpdatePayload(values, session.type);
    await mutation.mutateAsync({ id: session.id, body });
    setIsEditing(false);
  });

  const handleClose = () => {
    setIsEditing(false);
    onClose();
  };

  const isOpen = sessionId !== null;
  const showCoursEvalFields =
    session !== undefined && (session.type === 'COURS' || session.type === 'EVALUATION');
  const showEventFields = session?.type === 'EVENEMENT';
  const sousTypeOptions =
    lockedType === 'COURS'
      ? COURS_SOUS_TYPES
      : lockedType === 'EVALUATION'
        ? EVALUATION_SOUS_TYPES
        : [];

  return (
    <Drawer
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? 'Modifier la séance' : 'Détail de la séance'}
      width="md"
      footer={
        session && !detailQuery.isLoading ? (
          isEditing ? (
            <>
              <Button
                variant="ghost"
                onClick={() => setIsEditing(false)}
                disabled={mutation.isPending}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                form="edit-session-form"
                variant="primary"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </>
          ) : (
            <Button variant="primary" onClick={() => setIsEditing(true)}>
              Modifier
            </Button>
          )
        ) : undefined
      }
    >
      {detailQuery.isLoading ? (
        <p className="text-sm text-text-muted">Chargement…</p>
      ) : detailQuery.error ? (
        <p
          role="alert"
          className="rounded-lg border border-err bg-err-100 px-3 py-2 text-sm text-err"
        >
          Impossible de charger la séance.
        </p>
      ) : session ? (
        isEditing ? (
          <form id="edit-session-form" onSubmit={onSubmit} className="flex flex-col gap-3">
            <FormField label="Libellé" required error={errors.libelle?.message}>
              {({ id }) => <Input id={id} {...register('libelle')} />}
            </FormField>

            {/* R.5 — Type lock : select disabled avec tooltip explicatif */}
            <FormField label="Type" required>
              {({ id }) => (
                <Select
                  id={id}
                  value={session.type}
                  disabled
                  title="Le type d'une séance ne peut pas être modifié après création. Pour changer de type, supprimez et recréez la séance."
                >
                  <option value={session.type}>{TYPE_LABEL[session.type]}</option>
                </Select>
              )}
            </FormField>

            {sousTypeOptions.length > 0 ? (
              <FormField label="Sous-type" error={errors.sousType?.message} hint="Optionnel">
                {({ id }) => (
                  <Select id={id} {...register('sousType')}>
                    <option value="">— Aucun —</option>
                    {sousTypeOptions.map((st) => (
                      <option key={st} value={st}>
                        {SOUS_TYPE_LABEL[st] ?? st}
                      </option>
                    ))}
                  </Select>
                )}
              </FormField>
            ) : null}

            {showCoursEvalFields ? (
              <>
                <FormField label="Module" required error={errors.moduleId?.message}>
                  {({ id }) => (
                    <Select
                      id={id}
                      {...register('moduleId')}
                      disabled={uesQuery.isLoading}
                      invalid={Boolean(errors.moduleId)}
                    >
                      <option value="">
                        {uesQuery.isLoading ? 'Chargement…' : '— Sélectionner —'}
                      </option>
                      {flatModules.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </Select>
                  )}
                </FormField>

                <FormField label="Enseignant" required error={errors.enseignantId?.message}>
                  {({ id }) => (
                    <Select
                      id={id}
                      {...register('enseignantId')}
                      disabled={enseignantsQuery.isLoading}
                      invalid={Boolean(errors.enseignantId)}
                    >
                      <option value="">
                        {enseignantsQuery.isLoading ? 'Chargement…' : '— Sélectionner —'}
                      </option>
                      {enseignants.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.nomComplet}
                        </option>
                      ))}
                    </Select>
                  )}
                </FormField>
              </>
            ) : null}

            {showEventFields ? (
              <>
                <FormField
                  label="Intervenant"
                  hint="Nom libre (optionnel)"
                  error={errors.intervenantNom?.message}
                >
                  {({ id }) => <Input id={id} {...register('intervenantNom')} />}
                </FormField>
                <FormField label="Description" hint="Optionnel" error={errors.description?.message}>
                  {({ id }) => (
                    <textarea
                      id={id}
                      {...register('description')}
                      rows={3}
                      maxLength={1000}
                      className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    />
                  )}
                </FormField>
              </>
            ) : null}

            <FormField label="Classes" required error={errors.classeIds?.message}>
              {({ id }) => (
                <Controller
                  control={control}
                  name="classeIds"
                  render={({ field }) => (
                    <ClasseChipsPicker
                      id={id}
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.classeIds?.message}
                      min={1}
                    />
                  )}
                />
              )}
            </FormField>

            <FormField label="Salle" hint="Optionnel">
              {({ id }) => (
                <Select id={id} {...register('salleId')}>
                  <option value="">— Aucune —</option>
                  {/* TODO V03 — endpoint /api/salles à exposer côté backend */}
                </Select>
              )}
            </FormField>

            <div className="grid grid-cols-3 gap-3">
              <FormField label="Date" required error={errors.date?.message}>
                {({ id }) => <Input id={id} type="date" {...register('date')} />}
              </FormField>
              <FormField label="Début" required error={errors.startTime?.message}>
                {({ id }) => <Input id={id} type="time" {...register('startTime')} />}
              </FormField>
              <FormField label="Fin" required error={errors.endTime?.message}>
                {({ id }) => <Input id={id} type="time" {...register('endTime')} />}
              </FormField>
            </div>

            {mutation.error ? (
              <p
                role="alert"
                className="rounded-lg border border-err bg-err-100 px-3 py-2 text-xs text-err"
              >
                Erreur : {mutation.error.message}
              </p>
            ) : null}
          </form>
        ) : (
          <ReadOnlyView session={session} />
        )
      ) : null}
    </Drawer>
  );
}

// ── Read-only view ───────────────────────────────────────────────────

function ReadOnlyView({ session }: { session: SessionV2Dto }) {
  const start = new Date(session.startAt);
  const end = new Date(session.endAt);
  const dateLabel = format(start, 'eeee d MMMM yyyy');
  const timeLabel = `${format(start, 'HH:mm')} – ${format(end, 'HH:mm')}`;
  const classesLabel = session.classes.map((c) => c.code).join(', ');
  const personLabel =
    session.type === 'EVENEMENT'
      ? (session.intervenantNom ?? '—')
      : (session.enseignant?.nomComplet ?? '—');
  const typeLabel = TYPE_LABEL[session.type];
  const sousTypeLabel = session.sousType
    ? (SOUS_TYPE_LABEL[session.sousType] ?? session.sousType)
    : null;

  return (
    <div className="flex flex-col gap-3 text-sm">
      {/* Badge "non publiée" — R.6, piloté par hasUnpublishedChanges */}
      {session.hasUnpublishedChanges ? (
        <div
          className="inline-flex items-center gap-2 self-start rounded-full border border-dashed border-warn-text bg-warn px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-warn-text"
          role="status"
        >
          <span className="size-1.5 rounded-full bg-warn-text" aria-hidden />
          Modifications non publiées
        </div>
      ) : null}

      <dl className="flex flex-col gap-3">
        <Row label="Libellé" value={session.libelle} />
        <Row
          label="Type"
          value={sousTypeLabel !== null ? `${typeLabel} — ${sousTypeLabel}` : typeLabel}
        />
        {session.type !== 'EVENEMENT' ? (
          <Row
            label="Module"
            value={session.module ? `${session.module.code} — ${session.module.name}` : '—'}
          />
        ) : session.description !== null ? (
          <Row label="Description" value={session.description} />
        ) : null}
        <Row
          label={session.type === 'EVENEMENT' ? 'Intervenant' : 'Enseignant'}
          value={personLabel}
        />
        <Row label="Classes" value={classesLabel || '—'} />
        <Row label="Salle" value={session.salle?.name ?? '—'} />
        <Row label="Date" value={dateLabel} />
        <Row label="Horaire" value={timeLabel} />
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border-soft pb-1.5">
      <dt className="text-xs font-semibold uppercase tracking-wide text-text-sec">{label}</dt>
      <dd className="text-right text-sm text-text">{value}</dd>
    </div>
  );
}
