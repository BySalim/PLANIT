'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  type ClasseV3Dto,
  type CreateClasseV3Dto,
  type UpdateClasseV3Dto,
  createClasseV3Schema,
  updateClasseV3Schema,
} from '@planit/contracts';
import { Modal } from '@/components/ui/modal';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useFormationsQuery } from '@/lib/queries-v3';
import { useCreateClasseMutation, useUpdateClasseMutation } from '@/lib/mutations-v3';

export type ClasseModalProps = {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  initial?: ClasseV3Dto | undefined;
};

/**
 * Modal Classe (réf design `classes.jsx`). Une classe se rattache à une
 * **formation de l'année courante** (V3-D5) — la liste de formations vient du
 * défaut serveur (année courante) de `useFormationsQuery()`.
 */
export function ClasseModal({ isOpen, onClose, mode, initial }: ClasseModalProps) {
  const isEdit = mode === 'edit';
  const formationsQuery = useFormationsQuery();
  const createMutation = useCreateClasseMutation();
  const updateMutation = useUpdateClasseMutation();

  const formations = formationsQuery.data ?? [];

  type FormValues = CreateClasseV3Dto | UpdateClasseV3Dto;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: isEdit ? zodResolver(updateClasseV3Schema) : zodResolver(createClasseV3Schema),
    defaultValues:
      isEdit && initial !== undefined
        ? {
            code: initial.code,
            name: initial.name,
            formationId: initial.formationId ?? '',
            capaciteMax: initial.capaciteMax,
          }
        : { code: '', name: '', formationId: '', capaciteMax: 30 },
  });

  useEffect(() => {
    if (!isOpen) return;
    if (isEdit && initial !== undefined) {
      reset({
        code: initial.code,
        name: initial.name,
        formationId: initial.formationId ?? '',
        capaciteMax: initial.capaciteMax,
      });
    } else {
      reset({ code: '', name: '', formationId: '', capaciteMax: 30 });
    }
  }, [isOpen, isEdit, initial, reset]);

  const fieldErrors = errors as Record<string, { message?: string }>;

  async function onSubmit(values: FormValues) {
    try {
      if (isEdit && initial !== undefined) {
        await updateMutation.mutateAsync({ id: initial.id, body: values as UpdateClasseV3Dto });
      } else {
        await createMutation.mutateAsync(values as CreateClasseV3Dto);
      }
      onClose();
    } catch {
      // flash géré par la mutation
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Modifier ${initial?.code ?? 'la classe'}` : 'Nouvelle classe'}
      size="md"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            form="classe-form"
            disabled={isSubmitting}
          >
            {isEdit ? 'Enregistrer' : 'Créer'}
          </Button>
        </>
      }
    >
      <form
        id="classe-form"
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        <FormField label="Code" required error={fieldErrors['code']?.message}>
          {({ id, 'aria-describedby': describedBy }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              invalid={!!fieldErrors['code']}
              placeholder="ex. M1-IA"
              {...register('code')}
            />
          )}
        </FormField>

        <FormField label="Nom" required error={fieldErrors['name']?.message}>
          {({ id, 'aria-describedby': describedBy }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              invalid={!!fieldErrors['name']}
              placeholder="ex. M1 Intelligence Artificielle"
              {...register('name')}
            />
          )}
        </FormField>

        <FormField
          label="Formation"
          required
          error={fieldErrors['formationId']?.message}
          hint={
            formations.length === 0
              ? 'Aucune formation pour l’année courante. Créez-la d’abord.'
              : undefined
          }
        >
          {({ id, 'aria-describedby': describedBy }) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              invalid={!!fieldErrors['formationId']}
              disabled={formations.length === 0}
              {...register('formationId')}
            >
              <option value="">— Choisir une formation —</option>
              {formations.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.code} · {f.niveau}
                  {f.filiere ? ` · ${f.filiere.sigle}` : ''}
                </option>
              ))}
            </Select>
          )}
        </FormField>

        <FormField label="Capacité maximale" required error={fieldErrors['capaciteMax']?.message}>
          {({ id, 'aria-describedby': describedBy }) => (
            <Input
              id={id}
              type="number"
              min={0}
              aria-describedby={describedBy}
              invalid={!!fieldErrors['capaciteMax']}
              {...register('capaciteMax', { valueAsNumber: true })}
            />
          )}
        </FormField>
      </form>
    </Modal>
  );
}
