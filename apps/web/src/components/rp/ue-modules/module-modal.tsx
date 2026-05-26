// "use client" — formulaire interactif avec react-hook-form et mutations TanStack
'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  type ModuleV2Dto,
  type CreateModuleDto,
  type UpdateModuleDto,
  createModuleSchema,
  updateModuleSchema,
} from '@planit/contracts';
import { Modal } from '@/components/ui/modal';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast-provider';
import { ColorSwatchPicker } from '@/components/rp/color-swatch-picker';
import { useCreateModuleMutation, useUpdateModuleMutation } from '@/lib/mutations';

export type ModuleModalProps = {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  ueId: string;
  initial?: ModuleV2Dto | undefined;
};

const DEFAULT_COLOR = '#16A34A';

export function ModuleModal({ isOpen, onClose, mode, ueId, initial }: ModuleModalProps) {
  const toast = useToast();
  const createMutation = useCreateModuleMutation();
  const updateMutation = useUpdateModuleMutation();

  const isEdit = mode === 'edit';

  type FormValues = CreateModuleDto | UpdateModuleDto;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: isEdit ? zodResolver(updateModuleSchema) : zodResolver(createModuleSchema),
    defaultValues:
      isEdit && initial !== undefined
        ? { code: initial.code, libelle: initial.libelle, color: initial.color }
        : { code: '', libelle: '', color: DEFAULT_COLOR },
  });

  useEffect(() => {
    if (!isOpen) return;
    if (isEdit && initial !== undefined) {
      reset({ code: initial.code, libelle: initial.libelle, color: initial.color });
    } else {
      reset({ code: '', libelle: '', color: DEFAULT_COLOR });
    }
  }, [isOpen, isEdit, initial, reset]);

  const mutationError = isEdit ? updateMutation.error : createMutation.error;
  const fieldErrors = errors as Record<string, { message?: string }>;

  async function onSubmit(values: FormValues) {
    try {
      if (isEdit && initial !== undefined) {
        await updateMutation.mutateAsync({ id: initial.id, body: values as UpdateModuleDto });
        toast.show('Module modifié avec succès.', { variant: 'success' });
      } else {
        await createMutation.mutateAsync({ ueId, body: values as CreateModuleDto });
        toast.show('Module créé avec succès.', { variant: 'success' });
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
      title={isEdit ? 'Modifier le module' : 'Nouveau module'}
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
            form="module-form"
            disabled={isSubmitting}
          >
            {isEdit ? 'Enregistrer' : 'Créer'}
          </Button>
        </>
      }
    >
      <form
        id="module-form"
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
              placeholder="ex. M-INF301-A"
              {...register('code')}
            />
          )}
        </FormField>

        <FormField label="Libellé" required error={fieldErrors['libelle']?.message}>
          {({ id, 'aria-describedby': describedBy }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              invalid={!!fieldErrors['libelle']}
              placeholder="ex. Graphes et complexité"
              {...register('libelle')}
            />
          )}
        </FormField>

        <FormField label="Couleur" required error={fieldErrors['color']?.message}>
          {() => (
            <Controller
              control={control}
              name="color"
              render={({ field }) => (
                <ColorSwatchPicker value={field.value ?? DEFAULT_COLOR} onChange={field.onChange} />
              )}
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
