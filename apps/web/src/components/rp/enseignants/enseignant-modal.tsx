// "use client" — formulaire interactif avec react-hook-form et mutations TanStack
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  type EnseignantDto,
  type CreateEnseignantDto,
  type UpdateEnseignantDto,
  createEnseignantSchema,
  updateEnseignantSchema,
} from '@planit/contracts';
import { Modal } from '@/components/ui/modal';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast-provider';
import { useCreateEnseignantMutation, useUpdateEnseignantMutation } from '@/lib/mutations';

export type EnseignantModalProps = {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  initial?: EnseignantDto | undefined;
};

export function EnseignantModal({ isOpen, onClose, mode, initial }: EnseignantModalProps) {
  const toast = useToast();
  const createMutation = useCreateEnseignantMutation();
  const updateMutation = useUpdateEnseignantMutation();

  const isEdit = mode === 'edit';

  type FormValues = CreateEnseignantDto | UpdateEnseignantDto;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: isEdit ? zodResolver(updateEnseignantSchema) : zodResolver(createEnseignantSchema),
    defaultValues:
      isEdit && initial !== undefined
        ? {
            nomComplet: initial.nomComplet,
            statut: initial.statut,
            specialite: initial.specialite,
            whatsapp: initial.whatsapp ?? undefined,
          }
        : {
            nomComplet: '',
            emailInstitutionnel: '',
            password: '',
            statut: 'PERMANENT',
            specialite: '',
            whatsapp: undefined,
          },
  });

  useEffect(() => {
    if (!isOpen) return;
    if (isEdit && initial !== undefined) {
      reset({
        nomComplet: initial.nomComplet,
        statut: initial.statut,
        specialite: initial.specialite,
        whatsapp: initial.whatsapp ?? undefined,
      });
    } else {
      reset({
        nomComplet: '',
        emailInstitutionnel: '',
        password: '',
        statut: 'PERMANENT',
        specialite: '',
        whatsapp: undefined,
      });
    }
  }, [isOpen, isEdit, initial, reset]);

  const mutationError = isEdit ? updateMutation.error : createMutation.error;

  async function onSubmit(values: FormValues) {
    try {
      if (isEdit && initial !== undefined) {
        await updateMutation.mutateAsync({ id: initial.id, body: values as UpdateEnseignantDto });
        toast.show('Enseignant modifié avec succès.', { variant: 'success' });
      } else {
        await createMutation.mutateAsync(values as CreateEnseignantDto);
        toast.show('Enseignant ajouté avec succès.', { variant: 'success' });
      }
      onClose();
    } catch {
      // error affichée via mutationError
    }
  }

  const createErrors = isEdit ? {} : (errors as Record<string, { message?: string }>);
  const sharedErrors = errors as Record<string, { message?: string }>;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Modifier l'enseignant" : 'Ajouter un enseignant'}
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
            form="enseignant-form"
            disabled={isSubmitting}
          >
            {isEdit ? 'Enregistrer' : 'Ajouter'}
          </Button>
        </>
      }
    >
      <form
        id="enseignant-form"
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        <FormField label="Nom complet" required error={sharedErrors['nomComplet']?.message}>
          {({ id, 'aria-describedby': describedBy }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              invalid={!!sharedErrors['nomComplet']}
              {...register('nomComplet')}
            />
          )}
        </FormField>

        {isEdit && initial !== undefined ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-text-sec">
              Email institutionnel
            </span>
            <p className="h-10 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-muted">
              {initial.emailInstitutionnel}
            </p>
          </div>
        ) : (
          <FormField
            label="Email institutionnel"
            required
            error={createErrors['emailInstitutionnel']?.message}
          >
            {({ id, 'aria-describedby': describedBy }) => (
              <Input
                id={id}
                type="email"
                aria-describedby={describedBy}
                invalid={!!createErrors['emailInstitutionnel']}
                {...register('emailInstitutionnel' as keyof FormValues)}
              />
            )}
          </FormField>
        )}

        {!isEdit && (
          <FormField
            label="Mot de passe temporaire"
            required
            error={createErrors['password']?.message}
          >
            {({ id, 'aria-describedby': describedBy }) => (
              <Input
                id={id}
                type="password"
                aria-describedby={describedBy}
                invalid={!!createErrors['password']}
                {...register('password' as keyof FormValues)}
              />
            )}
          </FormField>
        )}

        <FormField label="Statut" required error={sharedErrors['statut']?.message}>
          {({ id, 'aria-describedby': describedBy }) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              invalid={!!sharedErrors['statut']}
              {...register('statut')}
            >
              <option value="PERMANENT">Permanent</option>
              <option value="VACATAIRE">Vacataire</option>
            </Select>
          )}
        </FormField>

        <FormField label="Spécialité" required error={sharedErrors['specialite']?.message}>
          {({ id, 'aria-describedby': describedBy }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              invalid={!!sharedErrors['specialite']}
              {...register('specialite')}
            />
          )}
        </FormField>

        <FormField label="WhatsApp (optionnel)" error={sharedErrors['whatsapp']?.message}>
          {({ id, 'aria-describedby': describedBy }) => (
            <Input
              id={id}
              placeholder="+221 77 000 00 00"
              aria-describedby={describedBy}
              invalid={!!sharedErrors['whatsapp']}
              {...register('whatsapp')}
            />
          )}
        </FormField>

        {mutationError !== null && mutationError !== undefined ? (
          <div className="rounded-lg bg-err-100 px-4 py-2 text-sm text-err">
            {mutationError.message}
          </div>
        ) : null}
      </form>
    </Modal>
  );
}
