'use client';

// Page Salles (V05 LOT 3).
// - Direction : liste toutes les salles de l'école + CRUD création/modification.
// - AC : salles de son périmètre RP manager (scope).
// - RP : placeholder (V04 différé).
// État interactif (modal, mutations) → 'use client'.

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  type SalleDto,
  type CreateSalleDto,
  type PersonnelDto,
  createSalleSchema,
} from '@planit/contracts';
import { DoorIcon } from '@planit/ui';
import { Shell } from '@/components/layout/shell';
import { ComingSoonPlaceholder } from '@/components/ui/coming-soon-placeholder';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast-provider';
import { useIsAc, useIsRp, useIsDirection } from '@/hooks/use-role';
import { useAcScope } from '@/hooks/use-ac-scope';
import { useSallesDirectionQuery, usePersonnelQuery } from '@/lib/direction-queries';
import { useCreateSalleMutation, useUpdateSalleMutation } from '@/lib/direction-mutations';

// ── Vue Direction ─────────────────────────────────────────────────────────────

type SalleModalProps = {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  initial?: SalleDto | undefined;
  personnel: PersonnelDto[];
};

type CreateSalleFormValues = CreateSalleDto;

function SalleModal({ isOpen, onClose, mode, initial, personnel }: SalleModalProps) {
  const toast = useToast();
  const createMutation = useCreateSalleMutation();
  const updateMutation = useUpdateSalleMutation();
  const isEdit = mode === 'edit';

  const rpList = personnel.filter((p) => p.role === 'RESPONSABLE_PROGRAMME');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateSalleFormValues>({
    resolver: zodResolver(createSalleSchema),
    defaultValues: { name: '', type: '', capacity: 0, rpResponsableId: undefined },
  });

  // Reset du formulaire à l'ouverture
  useState(() => {
    if (!isOpen) return;
    if (isEdit && initial !== undefined) {
      reset({
        name: initial.name,
        type: initial.type,
        capacity: initial.capacity,
        rpResponsableId: initial.rpResponsable?.id ?? undefined,
      });
    } else {
      reset({ name: '', type: '', capacity: 0, rpResponsableId: undefined });
    }
  });

  const errs = errors as Record<string, { message?: string } | undefined>;
  const mutationError = isEdit ? updateMutation.error : createMutation.error;

  async function onSubmit(values: CreateSalleFormValues) {
    try {
      if (isEdit && initial !== undefined) {
        await updateMutation.mutateAsync({
          id: initial.id,
          dto: {
            name: values.name,
            type: values.type,
            capacity: values.capacity,
            rpResponsableId:
              values.rpResponsableId && values.rpResponsableId.length > 0
                ? values.rpResponsableId
                : null,
          },
        });
        toast.show('Salle modifiée.', { variant: 'success' });
      } else {
        await createMutation.mutateAsync({
          name: values.name,
          type: values.type,
          capacity: values.capacity,
          ...(values.rpResponsableId && values.rpResponsableId.length > 0
            ? { rpResponsableId: values.rpResponsableId }
            : {}),
        });
        toast.show('Salle créée.', { variant: 'success' });
      }
      onClose();
    } catch {
      // Erreur affichée via mutationError
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Modifier la salle' : 'Créer une salle'}
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
            form="salle-form"
            disabled={isSubmitting}
          >
            {isEdit ? 'Enregistrer' : 'Créer'}
          </Button>
        </>
      }
    >
      <form
        id="salle-form"
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        <FormField label="Nom de la salle" required error={errs['name']?.message}>
          {({ id, 'aria-describedby': describedBy }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              invalid={!!errs['name']}
              placeholder="Ex. Amphithéâtre A"
              {...register('name')}
            />
          )}
        </FormField>

        <FormField label="Type" required error={errs['type']?.message}>
          {({ id, 'aria-describedby': describedBy }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              invalid={!!errs['type']}
              placeholder="Ex. Amphithéâtre, Salle TD, Labo"
              {...register('type')}
            />
          )}
        </FormField>

        <FormField label="Capacité" required error={errs['capacity']?.message}>
          {({ id, 'aria-describedby': describedBy }) => (
            <Input
              id={id}
              type="number"
              aria-describedby={describedBy}
              invalid={!!errs['capacity']}
              {...register('capacity', { valueAsNumber: true })}
            />
          )}
        </FormField>

        <FormField label="Responsable RP (optionnel)" error={errs['rpResponsableId']?.message}>
          {({ id, 'aria-describedby': describedBy }) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              invalid={!!errs['rpResponsableId']}
              {...register('rpResponsableId')}
            >
              <option value="">— Aucun responsable —</option>
              {rpList.map((rp) => (
                <option key={rp.id} value={rp.id}>
                  {rp.fullName}
                </option>
              ))}
            </Select>
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

function SallesDirectionView() {
  const sallesQuery = useSallesDirectionQuery();
  const personnelQuery = usePersonnelQuery();
  const personnel = personnelQuery.data ?? [];

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SalleDto | undefined>(undefined);

  function openCreate() {
    setEditTarget(undefined);
    setModalOpen(true);
  }

  function openEdit(s: SalleDto) {
    setEditTarget(s);
    setModalOpen(true);
  }

  const salles = sallesQuery.data ?? [];

  return (
    <>
      <SalleModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        mode={editTarget !== undefined ? 'edit' : 'create'}
        initial={editTarget}
        personnel={personnel}
      />

      {sallesQuery.isLoading ? (
        <div className="overflow-hidden rounded-2xl border border-border-soft bg-surface shadow-sm">
          <div className="flex items-center justify-between border-b border-border-soft px-5 py-3">
            <span className="h-4 w-20 animate-pulse rounded bg-border-soft" aria-hidden />
            <span className="h-8 w-36 animate-pulse rounded-lg bg-border-soft" aria-hidden />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 border-b border-border-soft px-5 py-3.5 last:border-0"
            >
              <span className="h-3.5 w-32 animate-pulse rounded bg-border-soft" aria-hidden />
              <span className="h-3.5 w-20 animate-pulse rounded bg-border-soft" aria-hidden />
              <span className="h-3.5 w-10 animate-pulse rounded bg-border-soft" aria-hidden />
            </div>
          ))}
        </div>
      ) : sallesQuery.isError ? (
        <div className="rounded-2xl border border-err-100 bg-err-100 px-6 py-4 text-sm text-err">
          Erreur lors du chargement des salles.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border-soft bg-surface shadow-sm">
          <div className="flex items-center justify-between border-b border-border-soft px-5 py-3">
            <span className="text-[13px] font-semibold text-text">
              {salles.length} salle{salles.length > 1 ? 's' : ''}
            </span>
            <Button variant="primary" size="sm" onClick={openCreate}>
              + Créer une salle
            </Button>
          </div>

          {salles.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-text-muted">
              Aucune salle enregistrée.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-[13.5px]">
                <thead>
                  <tr className="border-b border-border-soft bg-bg">
                    <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                      Nom
                    </th>
                    <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                      Type
                    </th>
                    <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                      Capacité
                    </th>
                    <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                      Responsable RP
                    </th>
                    <th className="px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {salles.map((salle, idx) => (
                    <tr
                      key={salle.id}
                      className={idx < salles.length - 1 ? 'border-b border-border-soft' : ''}
                    >
                      <td className="px-5 py-3.5 font-semibold text-text">{salle.name}</td>
                      <td className="px-5 py-3.5 text-text-muted">{salle.type}</td>
                      <td className="px-5 py-3.5 text-text-muted">{salle.capacity}</td>
                      <td className="px-5 py-3.5 text-text-muted">
                        {salle.rpResponsable !== null ? (
                          salle.rpResponsable.fullName
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-bg-warm px-2.5 py-0.5 text-[11px] font-semibold text-text-muted">
                            commune
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Button variant="secondary" size="sm" onClick={() => openEdit(salle)}>
                          Modifier
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ── Vue AC ────────────────────────────────────────────────────────────────────

function SallesAcView({
  salles,
  isLoading,
}: {
  salles: ReadonlyArray<{ id: string; name: string }> | undefined;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-border-soft bg-surface shadow-sm">
        <div className="border-b border-border-soft bg-bg px-5 py-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Salle
          </span>
        </div>
        <div className="px-5 py-3.5">
          <span
            className="inline-block h-3 w-48 animate-pulse rounded bg-border-soft align-middle"
            aria-hidden
          />
        </div>
      </div>
    );
  }
  if (!salles || salles.length === 0) {
    return (
      <div className="rounded-2xl border border-border-soft bg-surface px-6 py-12 text-center text-sm text-text-muted">
        Aucune salle dans votre périmètre. Votre RP doit en assigner.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-border-soft bg-surface shadow-sm">
      <div className="border-b border-border-soft bg-bg px-5 py-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          Salle
        </span>
      </div>
      <ul>
        {salles.map((salle, idx) => (
          <li
            key={salle.id}
            className={`flex items-center gap-3 px-5 py-3.5 ${
              idx < salles.length - 1 ? 'border-b border-border-soft' : ''
            }`}
          >
            <DoorIcon size={16} color="currentColor" />
            <span className="text-[13.5px] font-semibold text-text">{salle.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

// Next.js App Router requires default export for page
// eslint-disable-next-line no-restricted-syntax
export default function SallesPage() {
  const isAc = useIsAc();
  const isRp = useIsRp();
  const isDirection = useIsDirection();
  const scope = useAcScope();

  return (
    <Shell
      title="Salles"
      breadcrumb={[{ label: 'Référentiels' }, { label: 'Salles' }]}
      activeNavId="rooms"
      surface
    >
      {isDirection ? <SallesDirectionView /> : null}
      {isAc ? <SallesAcView salles={scope.data?.salles} isLoading={scope.isLoading} /> : null}
      {isRp ? (
        <ComingSoonPlaceholder
          title="Salles"
          subtitle="La gestion complète des salles arrive en V04. Pour l'instant, seules les salles assignées à un RP responsable sont visibles côté AC."
          icon={DoorIcon}
        />
      ) : null}
    </Shell>
  );
}
