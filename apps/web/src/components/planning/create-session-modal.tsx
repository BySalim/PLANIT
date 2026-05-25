'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { type CreateSessionDto, sessionTypeSchema, z } from '@planit/contracts';
import { now as nowDakar } from '@planit/utils/date';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { useCreateSessionMutation } from '@/lib/mutations';
import { seedClasses, seedModules, seedSalles, seedTeachers } from '@/lib/seed-refs';

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDay?: Date | undefined;
}

const sessionFormSchema = z
  .object({
    type: sessionTypeSchema,
    classeId: z.string().min(1, 'Classe requise'),
    moduleId: z.string().min(1, 'Module requis'),
    salleId: z.string().min(1, 'Salle requise'),
    teacherId: z.string().min(1, 'Enseignant requis'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide'),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Début invalide'),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Fin invalide'),
  })
  .refine((v) => v.startTime < v.endTime, {
    message: 'L’heure de fin doit être après le début.',
    path: ['endTime'],
  });

type FormValues = z.infer<typeof sessionFormSchema>;

const SESSION_TYPES = sessionTypeSchema.options;

function toIsoUtc(date: string, time: string): string {
  // We store/seed times as "...T10:00:00.000Z" so we treat the local form
  // values as already-UTC ISO components (Africa/Dakar = UTC+0).
  return `${date}T${time}:00.000Z`;
}

function defaultDateString(date: Date | undefined): string {
  return format(date ?? nowDakar(), 'yyyy-MM-dd');
}

export function CreateSessionModal({ isOpen, onClose, defaultDay }: CreateSessionModalProps) {
  const mutation = useCreateSessionMutation();

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      type: 'CM',
      classeId: seedClasses[0]?.id ?? '',
      moduleId: seedModules[0]?.id ?? '',
      salleId: seedSalles[0]?.id ?? '',
      teacherId: seedTeachers[0]?.id ?? '',
      date: defaultDateString(defaultDay),
      startTime: '10:00',
      endTime: '12:00',
    },
  });

  useEffect(() => {
    if (!isOpen) return;
    reset({
      type: 'CM',
      classeId: seedClasses[0]?.id ?? '',
      moduleId: seedModules[0]?.id ?? '',
      salleId: seedSalles[0]?.id ?? '',
      teacherId: seedTeachers[0]?.id ?? '',
      date: defaultDateString(defaultDay),
      startTime: '10:00',
      endTime: '12:00',
    });
  }, [isOpen, defaultDay, reset]);

  const onSubmit = handleSubmit(async (values) => {
    const payload: CreateSessionDto = {
      type: values.type,
      classeId: values.classeId,
      moduleId: values.moduleId,
      salleId: values.salleId,
      teacherId: values.teacherId,
      startAt: toIsoUtc(values.date, values.startTime),
      endAt: toIsoUtc(values.date, values.endTime),
    };
    await mutation.mutateAsync(payload);
    onClose();
  });

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
        <FormField label="Type" required error={errors.type?.message}>
          {({ id }) => (
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select id={id} {...field}>
                  {SESSION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              )}
            />
          )}
        </FormField>

        <FormField label="Classe" required error={errors.classeId?.message}>
          {({ id }) => (
            <Select id={id} {...register('classeId')}>
              {seedClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          )}
        </FormField>

        <FormField label="Module" required error={errors.moduleId?.message}>
          {({ id }) => (
            <Select id={id} {...register('moduleId')}>
              {seedModules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </Select>
          )}
        </FormField>

        <FormField label="Salle" required error={errors.salleId?.message}>
          {({ id }) => (
            <Select id={id} {...register('salleId')}>
              {seedSalles.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          )}
        </FormField>

        <FormField label="Enseignant" required error={errors.teacherId?.message}>
          {({ id }) => (
            <Select id={id} {...register('teacherId')}>
              {seedTeachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
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
