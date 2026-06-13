'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  type CreateUserAdminDto,
  type Role,
  type UserAdminDto,
  createUserAdminSchema,
  updateUserAdminSchema,
} from '@planit/contracts';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast-provider';
import { roleLabel, useRole } from '@/hooks/use-role';
import { useEcolesQuery } from '@/lib/admin-queries';
import { useCreateUserMutation, useUpdateUserMutation } from '@/lib/admin-mutations';

const BASE_ROLES: readonly Role[] = [
  'DIRECTION',
  'RESPONSABLE_PROGRAMME',
  'ASSISTANT_PROGRAMME',
  'ENSEIGNANT',
  'ETUDIANT',
  'RESPONSABLE_CLASSE',
];
const ADMIN_ROLES: readonly Role[] = ['ADMIN', 'SUPER_ADMIN'];

function isAdminRole(role: Role): boolean {
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  initial?: UserAdminDto | undefined;
}

type FormValues = CreateUserAdminDto;

export function UserModal({ isOpen, onClose, mode, initial }: UserModalProps) {
  const toast = useToast();
  const currentRole = useRole();
  const isSuperAdmin = currentRole === 'SUPER_ADMIN';
  const ecolesQuery = useEcolesQuery();
  const createMutation = useCreateUserMutation();
  const updateMutation = useUpdateUserMutation();
  const isEdit = mode === 'edit';

  // Seul un SUPER_ADMIN propose les rôles ADMIN/SUPER_ADMIN (le backend l'impose aussi).
  const roleOptions = isSuperAdmin ? [...BASE_ROLES, ...ADMIN_ROLES] : BASE_ROLES;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: isEdit ? zodResolver(updateUserAdminSchema) : zodResolver(createUserAdminSchema),
    defaultValues: { email: '', fullName: '', role: 'ENSEIGNANT', password: '', matricule: '' },
  });

  useEffect(() => {
    if (!isOpen) return;
    if (isEdit && initial !== undefined) {
      reset({
        email: initial.email,
        fullName: initial.fullName,
        role: initial.role,
        password: '',
        ecoleId: initial.ecoleId ?? undefined,
        matricule: initial.matricule ?? '',
      });
    } else {
      reset({ email: '', fullName: '', role: 'ENSEIGNANT', password: '', matricule: '' });
    }
  }, [isOpen, isEdit, initial, reset]);

  const selectedRole = (watch('role') ?? 'ENSEIGNANT') as Role;
  const needsEcole = !isAdminRole(selectedRole);
  const mutationError = isEdit ? updateMutation.error : createMutation.error;
  const errs = errors as Record<string, { message?: string } | undefined>;

  async function onSubmit(values: FormValues) {
    const role = values.role;
    const adminRole = isAdminRole(role);
    const ecoleId = adminRole
      ? null
      : values.ecoleId && values.ecoleId.length > 0
        ? values.ecoleId
        : null;

    // Invariant ecoleId (le backend le revérifie) : école requise hors ADMIN/SUPER_ADMIN.
    if (!adminRole && ecoleId === null) {
      setError('ecoleId', { message: 'Sélectionnez une école pour ce rôle.' });
      return;
    }

    try {
      if (isEdit && initial !== undefined) {
        await updateMutation.mutateAsync({
          id: initial.id,
          body: { fullName: values.fullName, role, ecoleId },
        });
        toast.show('Compte modifié.', { variant: 'success' });
      } else {
        await createMutation.mutateAsync({
          email: values.email,
          fullName: values.fullName,
          role,
          password: values.password,
          ecoleId,
          ...(values.matricule && values.matricule.length > 0
            ? { matricule: values.matricule }
            : {}),
        });
        toast.show('Compte créé.', { variant: 'success' });
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
      title={isEdit ? 'Modifier le compte' : 'Créer un compte'}
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
            form="user-form"
            disabled={isSubmitting}
          >
            {isEdit ? 'Enregistrer' : 'Créer'}
          </Button>
        </>
      }
    >
      <form
        id="user-form"
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

        {isEdit ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-text-sec">
              Adresse e-mail
            </span>
            <p className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-muted">
              {initial?.email}
            </p>
          </div>
        ) : (
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
        )}

        <FormField label="Rôle" required error={errs['role']?.message}>
          {({ id, 'aria-describedby': describedBy }) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              invalid={!!errs['role']}
              {...register('role')}
            >
              {roleOptions.map((r) => (
                <option key={r} value={r}>
                  {roleLabel(r)}
                </option>
              ))}
            </Select>
          )}
        </FormField>

        {needsEcole ? (
          <FormField label="École" required error={errs['ecoleId']?.message}>
            {({ id, 'aria-describedby': describedBy }) => (
              <Select
                id={id}
                aria-describedby={describedBy}
                invalid={!!errs['ecoleId']}
                disabled={ecolesQuery.isLoading}
                {...register('ecoleId')}
              >
                <option value="">— Sélectionner une école —</option>
                {(ecolesQuery.data ?? []).map((ecole) => (
                  <option key={ecole.id} value={ecole.id}>
                    {ecole.nom}
                  </option>
                ))}
              </Select>
            )}
          </FormField>
        ) : (
          <p className="rounded-lg bg-primary-50 px-3 py-2 text-xs text-text-sec">
            Un compte ADMIN / SUPER_ADMIN n&apos;est rattaché à aucune école (cross-école).
          </p>
        )}

        {!isEdit ? (
          <>
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
          </>
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
