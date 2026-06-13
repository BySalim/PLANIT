'use client';

// Formulaire modal création/édition d'un RP ou AC par la Direction (V05 LOT 3).
// État interactif (form, mutations) → directive 'use client' requise.

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  type PersonnelDto,
  type CreatePersonnelDto,
  type UpdatePersonnelDto,
  createPersonnelSchema,
  updatePersonnelSchema,
} from '@planit/contracts';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast-provider';
import { useCreatePersonnelMutation, useUpdatePersonnelMutation } from '@/lib/direction-mutations';

type PersonnelModalMode = 'create' | 'edit';

type PersonnelModalProps = {
  isOpen: boolean;
  onClose: () => void;
  mode: PersonnelModalMode;
  initial?: PersonnelDto | undefined;
};

// Formulaire création — tous les champs
type CreateFormValues = {
  fullName: string;
  email: string;
  role: 'RESPONSABLE_PROGRAMME' | 'ASSISTANT_PROGRAMME';
  password: string;
  matricule: string;
};

// Formulaire édition — seuls fullName et email
type EditFormValues = {
  fullName: string;
  email: string;
};

function PersonnelCreateForm({
  onClose,
  mutation,
}: {
  onClose: () => void;
  mutation: ReturnType<typeof useCreatePersonnelMutation>;
}) {
  const toast = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createPersonnelSchema),
    defaultValues: {
      fullName: '',
      email: '',
      role: 'RESPONSABLE_PROGRAMME',
      password: '',
      matricule: '',
    },
  });

  const errs = errors as Record<string, { message?: string } | undefined>;

  async function onSubmit(values: CreateFormValues) {
    const dto: CreatePersonnelDto = {
      fullName: values.fullName,
      email: values.email,
      role: values.role,
      password: values.password,
      ...(values.matricule.length > 0 ? { matricule: values.matricule } : {}),
    };
    try {
      await mutation.mutateAsync(dto);
      toast.show('Personnel créé.', { variant: 'success' });
      onClose();
    } catch {
      // Erreur affichée via mutationError
    }
  }

  return (
    <form
      id="personnel-form"
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      <FormField label="Nom complet" required error={errs['fullName']?.message}>
        {({ id, 'aria-describedby': describedBy }) => (
          <Input
            id={id}
            aria-describedby={describedBy}
            invalid={!!errs['fullName']}
            {...register('fullName')}
          />
        )}
      </FormField>

      <FormField label="Adresse e-mail" required error={errs['email']?.message}>
        {({ id, 'aria-describedby': describedBy }) => (
          <Input
            id={id}
            type="email"
            aria-describedby={describedBy}
            invalid={!!errs['email']}
            {...register('email')}
          />
        )}
      </FormField>

      <FormField label="Rôle" required error={errs['role']?.message}>
        {({ id, 'aria-describedby': describedBy }) => (
          <Select
            id={id}
            aria-describedby={describedBy}
            invalid={!!errs['role']}
            {...register('role')}
          >
            <option value="RESPONSABLE_PROGRAMME">Responsable de programme (RP)</option>
            <option value="ASSISTANT_PROGRAMME">Attaché de classe (AC)</option>
          </Select>
        )}
      </FormField>

      <FormField
        label="Mot de passe"
        required
        hint="12 caractères minimum."
        error={errs['password']?.message}
      >
        {({ id, 'aria-describedby': describedBy }) => (
          <Input
            id={id}
            type="password"
            aria-describedby={describedBy}
            invalid={!!errs['password']}
            {...register('password')}
          />
        )}
      </FormField>

      <FormField label="Matricule (optionnel)" error={errs['matricule']?.message}>
        {({ id, 'aria-describedby': describedBy }) => (
          <Input
            id={id}
            aria-describedby={describedBy}
            invalid={!!errs['matricule']}
            {...register('matricule')}
          />
        )}
      </FormField>

      {mutation.error != null ? (
        <div className="rounded-lg bg-err-100 px-4 py-2 text-sm text-err">
          {mutation.error.message}
        </div>
      ) : null}
    </form>
  );
}

function PersonnelEditForm({
  initial,
  onClose,
  mutation,
}: {
  initial: PersonnelDto;
  onClose: () => void;
  mutation: ReturnType<typeof useUpdatePersonnelMutation>;
}) {
  const toast = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditFormValues>({
    resolver: zodResolver(updatePersonnelSchema),
    defaultValues: { fullName: initial.fullName, email: initial.email },
  });

  useEffect(() => {
    reset({ fullName: initial.fullName, email: initial.email });
  }, [initial, reset]);

  const errs = errors as Record<string, { message?: string } | undefined>;

  async function onSubmit(values: EditFormValues) {
    const dto: UpdatePersonnelDto = {};
    if (values.fullName.length > 0) dto.fullName = values.fullName;
    if (values.email.length > 0) dto.email = values.email;
    try {
      await mutation.mutateAsync({ id: initial.id, dto });
      toast.show('Personnel modifié.', { variant: 'success' });
      onClose();
    } catch {
      // Erreur affichée via mutationError
    }
  }

  return (
    <form
      id="personnel-form"
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      <FormField label="Nom complet" required error={errs['fullName']?.message}>
        {({ id, 'aria-describedby': describedBy }) => (
          <Input
            id={id}
            aria-describedby={describedBy}
            invalid={!!errs['fullName']}
            {...register('fullName')}
          />
        )}
      </FormField>

      <FormField label="Adresse e-mail" required error={errs['email']?.message}>
        {({ id, 'aria-describedby': describedBy }) => (
          <Input
            id={id}
            type="email"
            aria-describedby={describedBy}
            invalid={!!errs['email']}
            {...register('email')}
          />
        )}
      </FormField>

      {mutation.error != null ? (
        <div className="rounded-lg bg-err-100 px-4 py-2 text-sm text-err">
          {mutation.error.message}
        </div>
      ) : null}
    </form>
  );
}

export function PersonnelModal({ isOpen, onClose, mode, initial }: PersonnelModalProps) {
  const createMutation = useCreatePersonnelMutation();
  const updateMutation = useUpdatePersonnelMutation();
  const isEdit = mode === 'edit';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Modifier le personnel' : 'Créer un RP / AC'}
      size="md"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" size="sm" type="submit" form="personnel-form">
            {isEdit ? 'Enregistrer' : 'Créer'}
          </Button>
        </>
      }
    >
      {isEdit && initial !== undefined ? (
        <PersonnelEditForm initial={initial} onClose={onClose} mutation={updateMutation} />
      ) : (
        <PersonnelCreateForm onClose={onClose} mutation={createMutation} />
      )}
    </Modal>
  );
}
