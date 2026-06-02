// "use client" — formulaire interactif avec react-hook-form et mutations TanStack
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  type FiliereDto,
  type CreateFiliereDto,
  type UpdateFiliereDto,
  createFiliereSchema,
  updateFiliereSchema,
} from '@planit/contracts';
import { Modal } from '@/components/ui/modal';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast-provider';
import { useCreateFiliereMutation, useUpdateFiliereMutation } from '@/lib/mutations';

export type FiliereModalProps = {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  initial?: FiliereDto | undefined;
};

export function FiliereModal({ isOpen, onClose, mode, initial }: FiliereModalProps) {
  const toast = useToast();
  const createMutation = useCreateFiliereMutation();
  const updateMutation = useUpdateFiliereMutation();

  const isEdit = mode === 'edit';

  type FormValues = CreateFiliereDto | UpdateFiliereDto;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: isEdit ? zodResolver(updateFiliereSchema) : zodResolver(createFiliereSchema),
    defaultValues:
      isEdit && initial !== undefined
        ? {
            sigle: initial.sigle,
            libelle: initial.libelle,
            grade: initial.grade,
            isDoubleDiplome: initial.isDoubleDiplome,
          }
        : { sigle: '', libelle: '', grade: 'LICENCE', isDoubleDiplome: false },
  });

  useEffect(() => {
    if (!isOpen) return;
    if (isEdit && initial !== undefined) {
      reset({
        sigle: initial.sigle,
        libelle: initial.libelle,
        grade: initial.grade,
        isDoubleDiplome: initial.isDoubleDiplome,
      });
    } else {
      reset({ sigle: '', libelle: '', grade: 'LICENCE', isDoubleDiplome: false });
    }
  }, [isOpen, isEdit, initial, reset]);

  const mutationError = isEdit ? updateMutation.error : createMutation.error;
  const fieldErrors = errors as Record<string, { message?: string }>;

  async function onSubmit(values: FormValues) {
    try {
      if (isEdit && initial !== undefined) {
        await updateMutation.mutateAsync({ id: initial.id, body: values as UpdateFiliereDto });
        toast.show('Filière modifiée avec succès.', { variant: 'success' });
      } else {
        await createMutation.mutateAsync(values as CreateFiliereDto);
        toast.show('Filière créée avec succès.', { variant: 'success' });
      }
      onClose();
    } catch {
      // error affichée via mutationError
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Modifier la filière' : 'Nouvelle filière'}
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            form="filiere-form"
            disabled={isSubmitting}
          >
            {isEdit ? 'Enregistrer' : 'Créer'}
          </Button>
        </>
      }
    >
      <form
        id="filiere-form"
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        <FormField label="Sigle" required error={fieldErrors['sigle']?.message}>
          {({ id, 'aria-describedby': describedBy }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              invalid={!!fieldErrors['sigle']}
              placeholder="ex. GL"
              {...register('sigle')}
            />
          )}
        </FormField>

        <FormField label="Libellé" required error={fieldErrors['libelle']?.message}>
          {({ id, 'aria-describedby': describedBy }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              invalid={!!fieldErrors['libelle']}
              placeholder="ex. Génie Logiciel"
              {...register('libelle')}
            />
          )}
        </FormField>

        <FormField label="Grade" required error={fieldErrors['grade']?.message}>
          {({ id, 'aria-describedby': describedBy }) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              invalid={!!fieldErrors['grade']}
              {...register('grade')}
            >
              <option value="LICENCE">Licence</option>
              <option value="MASTER">Master</option>
              <option value="DOCTORAT">Doctorat</option>
            </Select>
          )}
        </FormField>

        <div className="flex items-center gap-2">
          <input
            id="isDoubleDiplome"
            type="checkbox"
            className="h-4 w-4 rounded border-border accent-primary"
            {...register('isDoubleDiplome')}
          />
          <label htmlFor="isDoubleDiplome" className="text-sm text-text">
            Double diplôme
          </label>
        </div>

        {mutationError !== null && mutationError !== undefined ? (
          <div className="rounded-lg bg-err-100 px-4 py-2 text-sm text-err">
            {mutationError.message}
          </div>
        ) : null}
      </form>
    </Modal>
  );
}
