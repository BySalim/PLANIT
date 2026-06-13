'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  type CreateEcoleDto,
  type EcoleDto,
  createEcoleSchema,
  updateEcoleSchema,
} from '@planit/contracts';
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

const EMPTY: CreateEcoleDto = {
  nom: '',
  direction: { email: '', fullName: '', password: '' },
};

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
    resolver: isEdit ? zodResolver(updateEcoleSchema) : zodResolver(createEcoleSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!isOpen) return;
    reset(isEdit && initial !== undefined ? { ...EMPTY, nom: initial.nom } : EMPTY);
  }, [isOpen, isEdit, initial, reset]);

  const mutationError = isEdit ? updateMutation.error : createMutation.error;

  async function onSubmit(values: CreateEcoleDto) {
    try {
      if (isEdit && initial !== undefined) {
        await updateMutation.mutateAsync({ id: initial.id, body: { nom: values.nom } });
        toast.show('École modifiée.', { variant: 'success' });
      } else {
        await createMutation.mutateAsync(values);
        toast.show('École et Direction créées.', { variant: 'success' });
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
            form="ecole-form"
            disabled={isSubmitting}
          >
            {isEdit ? 'Enregistrer' : "Créer l'école"}
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

        {!isEdit ? (
          <fieldset className="flex flex-col gap-4 rounded-xl border border-border-soft bg-bg p-4">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-text-sec">
              Compte Direction
            </legend>
            <p className="text-sm text-text-muted">
              Chaque école a une Direction. Le compte est créé maintenant ; communiquez le mot de
              passe hors-bande.
            </p>

            <FormField label="Nom complet" required error={errors.direction?.fullName?.message}>
              {({ id, 'aria-describedby': describedBy }) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  invalid={!!errors.direction?.fullName}
                  {...register('direction.fullName')}
                />
              )}
            </FormField>

            <FormField label="Adresse e-mail" required error={errors.direction?.email?.message}>
              {({ id, 'aria-describedby': describedBy }) => (
                <Input
                  id={id}
                  type="email"
                  aria-describedby={describedBy}
                  invalid={!!errors.direction?.email}
                  {...register('direction.email')}
                />
              )}
            </FormField>

            <FormField
              label="Mot de passe"
              required
              hint="12 caractères minimum."
              error={errors.direction?.password?.message}
            >
              {({ id, 'aria-describedby': describedBy }) => (
                <Input
                  id={id}
                  type="password"
                  aria-describedby={describedBy}
                  invalid={!!errors.direction?.password}
                  {...register('direction.password')}
                />
              )}
            </FormField>
          </fieldset>
        ) : null}

        {mutationError != null ? (
          <div className="rounded-lg bg-err-100 px-4 py-2 text-sm text-err">
            {mutationError.message}
          </div>
        ) : null}
      </form>
    </Modal>
  );
}
