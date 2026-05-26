'use client';

import { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { format } from 'date-fns';
import {
  COURS_SOUS_TYPES,
  EVALUATION_SOUS_TYPES,
  type CreateSessionV2Dto,
  type SessionTypeV2,
  type SettingsDto,
  sessionSousTypeSchema,
  sessionTypeV2Schema,
  z,
} from '@planit/contracts';
import { now as nowDakar } from '@planit/utils/date';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { useCreateSessionV2Mutation } from '@/lib/mutations-v2';
import { useEnseignantsQuery, useSettingsQuery, useUesQuery } from '@/lib/queries-v2';
import { ClasseChipsPicker } from './classe-chips-picker';

// ─────────────────────────────────────────────────────────────────────
// <CreateSessionModal> V2 — LOT 3 R.2 + R.4
//
// Formulaire adaptatif au type Cours / Évaluation / Événement (V2-D5).
// Multi-classes via <ClasseChipsPicker> (R.3). Validation horaires
// contre les Settings.dayStart/dayEnd (R.4). Submission via le contract
// discriminated union createSessionV2Schema (LOT 0 contracts).
// ─────────────────────────────────────────────────────────────────────

interface CreateSessionModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  /** Pré-remplissage optionnel (utilisé en LOT 4 par hover+/drag-select). */
  readonly initialValues?: {
    readonly type?: SessionTypeV2;
    readonly date?: Date;
    readonly startTime?: string;
    readonly endTime?: string;
    readonly classeIds?: readonly string[];
  };
}

// ── Schema de formulaire (form-level, transformé en V2 DTO au submit) ──
//
// On garde un schema "plat" pour bien jouer avec react-hook-form. Les règles
// conditionnelles selon `type` sont appliquées via `superRefine`. La factory
// reçoit les Settings (peut être undefined si la query n'a pas encore résolu —
// la validation horaire est alors permissive, le backend reste failsafe).

function makeFormSchema(settings: SettingsDto | undefined) {
  return z
    .object({
      libelle: z.string().min(1, 'Libellé requis').max(200),
      type: sessionTypeV2Schema,
      sousType: z.string(), // '' = aucun
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
      // Champs requis selon le type (V2-D5)
      if (data.type === 'COURS' || data.type === 'EVALUATION') {
        if (!data.moduleId) {
          ctx.addIssue({
            code: 'custom',
            path: ['moduleId'],
            message: 'Module requis',
          });
        }
        if (!data.enseignantId) {
          ctx.addIssue({
            code: 'custom',
            path: ['enseignantId'],
            message: 'Enseignant requis',
          });
        }
        // sousType : si fourni, doit appartenir à la palette du type
        if (data.sousType) {
          const allowed = data.type === 'COURS' ? COURS_SOUS_TYPES : EVALUATION_SOUS_TYPES;
          if (!(allowed as readonly string[]).includes(data.sousType)) {
            ctx.addIssue({
              code: 'custom',
              path: ['sousType'],
              message: 'Sous-type incompatible avec le type choisi',
            });
          }
        }
      }

      // Horaires : end > start
      if (data.endTime <= data.startTime) {
        ctx.addIssue({
          code: 'custom',
          path: ['endTime'],
          message: 'L’heure de fin doit être postérieure au début',
        });
      }

      // Plage Settings (V2-D10) — appliquée seulement si Settings disponibles
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
        // Fin > dayEndHour OU pile dayEndHour avec minutes > 0
        if (eh > settings.dayEndHour || (eh === settings.dayEndHour && em > 0)) {
          ctx.addIssue({
            code: 'custom',
            path: ['endTime'],
            message: `L’heure de fin doit être ≤ ${settings.dayEndHour}h`,
          });
        }
        // sanity sur sh/eh (NaN protection)
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

type FormValues = z.infer<ReturnType<typeof makeFormSchema>>;

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

function toIsoUtc(date: string, time: string): string {
  // Africa/Dakar = UTC+0 — on stocke et affiche en UTC.
  return `${date}T${time}:00.000Z`;
}

function defaultDateString(date: Date | undefined): string {
  return format(date ?? nowDakar(), 'yyyy-MM-dd');
}

function makeDefaults(initial?: CreateSessionModalProps['initialValues']): FormValues {
  return {
    libelle: '',
    type: initial?.type ?? 'COURS',
    sousType: '',
    moduleId: '',
    enseignantId: '',
    intervenantNom: '',
    description: '',
    salleId: '',
    classeIds: initial?.classeIds ? [...initial.classeIds] : [],
    date: defaultDateString(initial?.date),
    startTime: initial?.startTime ?? '10:00',
    endTime: initial?.endTime ?? '12:00',
  };
}

// Construit le payload V2 selon le type depuis les valeurs du form.
function toCreatePayload(values: FormValues): CreateSessionV2Dto {
  const startAt = toIsoUtc(values.date, values.startTime);
  const endAt = toIsoUtc(values.date, values.endTime);
  const base = {
    libelle: values.libelle,
    startAt,
    endAt,
    classeIds: values.classeIds,
    salleId: values.salleId || null,
  } as const;

  if (values.type === 'EVENEMENT') {
    return {
      type: 'EVENEMENT',
      intervenantNom: values.intervenantNom || null,
      description: values.description || null,
      ...base,
    };
  }
  // COURS ou EVALUATION
  const sousType = values.sousType ? sessionSousTypeSchema.parse(values.sousType) : undefined;
  if (values.type === 'COURS') {
    return {
      type: 'COURS',
      ...(sousType !== undefined ? { sousType: sousType as 'CM' | 'TD' | 'TP' } : {}),
      moduleId: values.moduleId,
      enseignantId: values.enseignantId,
      ...base,
    };
  }
  // EVALUATION — sousType requis serveur ; on garde la valeur form (Zod refusera si vide)
  return {
    type: 'EVALUATION',
    sousType: (sousType ?? 'EXAMEN') as 'EXAMEN' | 'RATTRAPAGE' | 'DEVOIR',
    moduleId: values.moduleId,
    enseignantId: values.enseignantId,
    ...base,
  };
}

// ── Composant ────────────────────────────────────────────────────────

export function CreateSessionModal({ isOpen, onClose, initialValues }: CreateSessionModalProps) {
  const settingsQuery = useSettingsQuery();
  const enseignantsQuery = useEnseignantsQuery();
  const uesQuery = useUesQuery();
  const mutation = useCreateSessionV2Mutation();

  const formSchema = useMemo(() => makeFormSchema(settingsQuery.data), [settingsQuery.data]);

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: makeDefaults(initialValues),
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });

  // Reset au mount / changement d'`initialValues` pour ne pas garder l'état précédent.
  useEffect(() => {
    if (!isOpen) return;
    reset(makeDefaults(initialValues));
  }, [isOpen, initialValues, reset]);

  // Observe le type pour piloter les champs visibles + remettre à plat lors d'un changement.
  const currentType = useWatch({ control, name: 'type' });

  // Liste plate des modules (UE → modules) pour le <Select module>.
  const flatModules = useMemo(() => {
    const ues = uesQuery.data ?? [];
    return ues.flatMap((ue) =>
      ue.modules.map((m) => ({
        id: m.id,
        label: `${m.code} — ${m.libelle}`,
        ueLibelle: ue.libelle,
      })),
    );
  }, [uesQuery.data]);

  const enseignants = enseignantsQuery.data ?? [];

  // Au changement de type : reset propre des champs spécifiques (V2-D5).
  // Confirmation `confirm()` si des données sont déjà saisies dans les champs
  // qui vont être effacés.
  const handleTypeChange = (next: SessionTypeV2, current: FormValues) => {
    const hasCoursEvalData = current.moduleId || current.enseignantId || current.sousType;
    const hasEventData = current.intervenantNom || current.description;
    const willClear =
      (next === 'EVENEMENT' && (hasCoursEvalData || current.sousType)) ||
      (next !== 'EVENEMENT' && hasEventData);

    if (willClear) {
      const ok = window.confirm(
        'Changer de type effacera les champs spécifiques déjà saisis. Continuer ?',
      );
      if (!ok) return;
    }

    setValue('type', next, { shouldDirty: true });
    // Reset des champs spécifiques à l'ancien type
    if (next === 'EVENEMENT') {
      setValue('sousType', '');
      setValue('moduleId', '');
      setValue('enseignantId', '');
    } else {
      setValue('intervenantNom', '');
      setValue('description', '');
      // Si on quitte EVENEMENT pour Cours/Eval, on garde sousType vide (pas auto).
      if (current.type === 'EVENEMENT') {
        setValue('sousType', '');
      }
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    const payload = toCreatePayload(values);
    await mutation.mutateAsync(payload);
    onClose();
  });

  const showModuleEnseignant = currentType === 'COURS' || currentType === 'EVALUATION';
  const showEventFields = currentType === 'EVENEMENT';
  const sousTypeOptions =
    currentType === 'COURS'
      ? COURS_SOUS_TYPES
      : currentType === 'EVALUATION'
        ? EVALUATION_SOUS_TYPES
        : [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nouvelle séance"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Annuler
          </Button>
          <Button
            type="submit"
            form="create-session-form"
            variant="primary"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Création…' : 'Créer la séance'}
          </Button>
        </>
      }
    >
      <form id="create-session-form" onSubmit={onSubmit} className="flex flex-col gap-3">
        <FormField label="Libellé" required error={errors.libelle?.message}>
          {({ id }) => (
            <Input
              id={id}
              {...register('libelle')}
              placeholder="ex. Algorithmique — Cours du lundi"
            />
          )}
        </FormField>

        <FormField label="Type" required error={errors.type?.message}>
          {({ id }) => (
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select
                  id={id}
                  value={field.value}
                  onChange={(e) => {
                    // Appel via handleTypeChange pour gérer la confirmation + reset.
                    const next = e.target.value as SessionTypeV2;
                    // On lit les values actuelles via `control._formValues` plutôt
                    // que useWatch pour éviter une dépendance cyclique render.
                    const current = control._formValues as FormValues;
                    handleTypeChange(next, current);
                  }}
                >
                  {sessionTypeV2Schema.options.map((t) => (
                    <option key={t} value={t}>
                      {TYPE_LABEL[t]}
                    </option>
                  ))}
                </Select>
              )}
            />
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

        {showModuleEnseignant ? (
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
              {({ id }) => (
                <Input
                  id={id}
                  {...register('intervenantNom')}
                  placeholder="ex. M. Diop — Speaker invité"
                />
              )}
            </FormField>
            <FormField label="Description" hint="Optionnel" error={errors.description?.message}>
              {({ id }) => (
                <textarea
                  id={id}
                  {...register('description')}
                  rows={3}
                  maxLength={1000}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  placeholder="Notes ou contexte de l'événement"
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

        <FormField label="Salle" hint="Optionnel" error={errors.salleId?.message}>
          {({ id }) => (
            <Select id={id} {...register('salleId')}>
              <option value="">— Aucune —</option>
              {/* Source temporaire : pas d'endpoint /api/salles dédié — TODO V03. */}
              {/* Les séances V2 acceptent salleId nullable, ce select reste vide tant que */}
              {/* la liste backend n'est pas exposée. */}
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
    </Modal>
  );
}
