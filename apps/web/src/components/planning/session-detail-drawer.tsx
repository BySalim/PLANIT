'use client';

import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { type SessionDto, type UpdateSessionDto, sessionTypeSchema, z } from '@planit/contracts';
import { Button } from '@/components/ui/button';
import { Drawer } from '@/components/ui/drawer';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useUpdateSessionMutation } from '@/lib/mutations';
import { useSessionDetailQuery } from '@/lib/queries';
import { seedClasses, seedModules, seedSalles, seedTeachers } from '@/lib/seed-refs';

interface SessionDetailDrawerProps {
  sessionId: string | null;
  onClose: () => void;
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

function isoToParts(iso: string): { date: string; time: string } {
  // Treat ISO as UTC (Africa/Dakar = UTC+0) — keeps backend round-trips exact.
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

function toIsoUtc(date: string, time: string): string {
  return `${date}T${time}:00.000Z`;
}

function valuesFromSession(s: SessionDto): FormValues {
  const start = isoToParts(s.startAt);
  const end = isoToParts(s.endAt);
  return {
    type: s.type,
    classeId: s.classe.id,
    moduleId: s.module.id,
    salleId: s.salle.id,
    teacherId: s.teacher.id,
    date: start.date,
    startTime: start.time,
    endTime: end.time,
  };
}

export function SessionDetailDrawer({ sessionId, onClose }: SessionDetailDrawerProps) {
  const detailQuery = useSessionDetailQuery(sessionId);
  const session = detailQuery.data;
  const mutation = useUpdateSessionMutation();
  const [isEditing, setIsEditing] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(sessionFormSchema),
  });

  useEffect(() => {
    if (sessionId === null) {
      setIsEditing(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (session) reset(valuesFromSession(session));
  }, [session, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (!session) return;
    const body: UpdateSessionDto = {
      type: values.type,
      classeId: values.classeId,
      moduleId: values.moduleId,
      salleId: values.salleId,
      teacherId: values.teacherId,
      startAt: toIsoUtc(values.date, values.startTime),
      endAt: toIsoUtc(values.date, values.endTime),
    };
    await mutation.mutateAsync({ id: session.id, body });
    setIsEditing(false);
  });

  const handleClose = () => {
    setIsEditing(false);
    onClose();
  };

  return (
    <Drawer
      isOpen={sessionId !== null}
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
        ) : (
          <ReadOnlyView session={session} />
        )
      ) : null}
    </Drawer>
  );
}

function ReadOnlyView({ session }: { session: SessionDto }) {
  const start = new Date(session.startAt);
  const end = new Date(session.endAt);
  const dateLabel = format(start, 'eeee d MMMM yyyy');
  const timeLabel = `${format(start, 'HH:mm')} – ${format(end, 'HH:mm')}`;

  return (
    <dl className="flex flex-col gap-3 text-sm">
      <Row label="Module" value={`${session.module.code} — ${session.module.name}`} />
      <Row label="Classe" value={`${session.classe.code} — ${session.classe.name}`} />
      <Row label="Salle" value={session.salle.name} />
      <Row label="Enseignant" value={session.teacher.fullName} />
      <Row label="Type" value={session.type} />
      <Row label="Date" value={dateLabel} />
      <Row label="Horaire" value={timeLabel} />
      <Row
        label="État"
        value={session.isPublished ? 'Publiée' : 'Non publiée (modification en attente)'}
      />
    </dl>
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
