'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { type CreateEcoleDto, type EcoleDto, createEcoleSchema } from '@planit/contracts';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast-provider';
import { useCreateEcoleMutation, useUpdateEcoleMutation } from '@/lib/admin-mutations';

interface EcoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  initial?: EcoleDto | undefined;
}

export function EcoleModal({ isOpen, onClose, mode, initial }: EcoleModalProps) {
  const toast = useToast();
  const createMutation = useCreateEcoleMutation();
  const updateMutation = useUpdateEcoleMutation();
  const isEdit = mode === 'edit';

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateEcoleDto>({
    resolver: zodResolver(createEcoleSchema),
    defaultValues: { nom: '' },
  });

  useEffect(() => {
    if (!isOpen) return;
    reset({ nom: isEdit && initial !== undefined ? initial.nom : '' });
  }, [isOpen, isEdit, initial, reset]);

  const mutationError = isEdit ? updateMutation.error : createMutation.error;

  async function onSubmit(values: CreateEcoleDto) {
    try {
      if (isEdit && initial !== undefined) {
        await updateMutation.mutateAsync({ id: initial.id, body: values });
        toast.show('École modifiée.', { variant: 'success' });
      } else {
        await createMutation.mutateAsync(values);
        toast.show('École créée.', { variant: 'success' });
      }
      onClose();
    } catch {
      // erreur affichée via mutationError
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Modifier l'école" : 'Créer une école'}
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
            form="ecole-form"
            disabled={isSubmitting}
          >
            {isEdit ? 'Enregistrer' : 'Créer'}
          </Button>
        </>
      }
    >
      <form
        id="ecole-form"
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        <FormField label="Nom de l'école" required error={errors.nom?.message}>
          {({ id, 'aria-describedby': describedBy }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              invalid={!!errors.nom}
              placeholder="École d'Ingénieurs"
              {...register('nom')}
            />
          )}
        </FormField>

        {mutationError != null ? (
          <div className="rounded-lg bg-err-100 px-4 py-2 text-sm text-err">
            {mutationError.message}
          </div>
        ) : null}
      </form>
    </Modal>
  );
}
