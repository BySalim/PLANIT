'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { type EcoleDto, z } from '@planit/contracts';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast-provider';
import { useCreateDirectionMutation } from '@/lib/admin-mutations';

// Miroir du schéma inline backend `POST /api/ecoles/:id/direction`.
const directionFormSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).max(120),
  password: z.string().min(12).max(72),
});
type DirectionForm = z.infer<typeof directionFormSchema>;

interface DirectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  ecole: EcoleDto | undefined;
}

export function DirectionModal({ isOpen, onClose, ecole }: DirectionModalProps) {
  const toast = useToast();
  const mutation = useCreateDirectionMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DirectionForm>({
    resolver: zodResolver(directionFormSchema),
    defaultValues: { email: '', fullName: '', password: '' },
  });

  useEffect(() => {
    if (isOpen) reset({ email: '', fullName: '', password: '' });
  }, [isOpen, reset]);

  async function onSubmit(values: DirectionForm) {
    if (ecole === undefined) return;
    try {
      await mutation.mutateAsync({ ecoleId: ecole.id, body: values });
      toast.show(`Direction créée pour ${ecole.nom}.`, { variant: 'success' });
      onClose();
    } catch {
      // erreur affichée via mutation.error
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Créer la Direction"
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
            form="direction-form"
            disabled={isSubmitting}
          >
            Créer la Direction
          </Button>
        </>
      }
    >
      <form
        id="direction-form"
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        <p className="text-sm text-text-muted">
          Compte <strong className="text-text">Direction</strong> rattaché à{' '}
          <strong className="text-text">{ecole?.nom ?? '—'}</strong>. Communiquez le mot de passe
          hors-bande.
        </p>

        <FormField label="Nom complet" required error={errors.fullName?.message}>
          {({ id, 'aria-describedby': describedBy }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              invalid={!!errors.fullName}
              {...register('fullName')}
            />
          )}
        </FormField>

        <FormField label="Adresse e-mail" required error={errors.email?.message}>
          {({ id, 'aria-describedby': describedBy }) => (
            <Input
              id={id}
              type="email"
              aria-describedby={describedBy}
              invalid={!!errors.email}
              {...register('email')}
            />
          )}
        </FormField>

        <FormField
          label="Mot de passe"
          required
          hint="12 caractères minimum."
          error={errors.password?.message}
        >
          {({ id, 'aria-describedby': describedBy }) => (
            <Input
              id={id}
              type="password"
              aria-describedby={describedBy}
              invalid={!!errors.password}
              {...register('password')}
            />
          )}
        </FormField>

        {mutation.error != null ? (
          <div className="rounded-lg bg-err-100 px-4 py-2 text-sm text-err">
            {mutation.error.message}
          </div>
        ) : null}
      </form>
    </Modal>
  );
}
