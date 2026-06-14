'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ClasseV3Dto } from '@planit/contracts';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast-provider';
import { usePersonnelQuery, useAcClassesQuery } from '@/lib/direction-queries';
import { useSetAcClassesMutation } from '@/lib/direction-mutations';

interface AssignAcModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Classes de l'école (déjà chargées par la page Classes). */
  classes: ClasseV3Dto[];
}

/**
 * V05 LOT 6 (ADR-0022 §7) — la Direction définit les classes assignées à un AC
 * de son école. On choisit un AC, on coche/décoche ses classes (pré-cochées
 * depuis l'assignation actuelle), puis on enregistre (sémantique « set »).
 */
export function AssignAcModal({ isOpen, onClose, classes }: AssignAcModalProps) {
  const toast = useToast();
  const personnelQuery = usePersonnelQuery();
  const acs = useMemo(
    () => (personnelQuery.data ?? []).filter((p) => p.role === 'ASSISTANT_PROGRAMME'),
    [personnelQuery.data],
  );

  const [acId, setAcId] = useState<string>('');
  const acClassesQuery = useAcClassesQuery(acId === '' ? null : acId);
  const setMutation = useSetAcClassesMutation();

  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());

  // Pré-coche les classes déjà assignées dès que l'AC change / la requête répond.
  useEffect(() => {
    if (acClassesQuery.data) setSelected(new Set(acClassesQuery.data.classeIds));
  }, [acClassesQuery.data]);

  // Reset à l'ouverture.
  useEffect(() => {
    if (isOpen) {
      setAcId('');
      setSelected(new Set());
    }
  }, [isOpen]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    if (acId === '') return;
    try {
      await setMutation.mutateAsync({ acId, classeIds: [...selected] });
      toast.show('Classes assignées mises à jour.', { variant: 'success' });
      onClose();
    } catch {
      toast.show("Impossible d'enregistrer l'assignation.", { variant: 'error' });
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assigner des classes à un AC"
      size="md"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => void handleSave()}
            disabled={acId === '' || setMutation.isPending}
          >
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-semibold text-text-sec">Attaché de classe</span>
          <Select value={acId} onChange={(e) => setAcId(e.target.value)}>
            <option value="">Sélectionner un AC…</option>
            {acs.map((ac) => (
              <option key={ac.id} value={ac.id}>
                {ac.fullName}
              </option>
            ))}
          </Select>
        </label>

        {acId === '' ? (
          <p className="py-6 text-center text-sm text-text-muted">
            Choisissez un AC pour gérer ses classes.
          </p>
        ) : classes.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-muted">
            Aucune classe dans l&apos;école.
          </p>
        ) : (
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1 text-[12px] font-semibold text-text-sec">
              Classes assignées
            </legend>
            <div className="max-h-72 overflow-y-auto rounded-lg border border-border-soft">
              {classes.map((c) => (
                <label
                  key={c.id}
                  className="flex cursor-pointer items-center gap-3 border-b border-border-soft px-3 py-2 last:border-b-0 hover:bg-bg"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggle(c.id)}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="font-mono text-[12px] font-semibold text-primary">{c.code}</span>
                  <span className="truncate text-[13px] text-text-sec">{c.name}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
      </div>
    </Modal>
  );
}
