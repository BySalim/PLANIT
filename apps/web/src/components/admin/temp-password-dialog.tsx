'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';

interface TempPasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
  password: string | null;
  userLabel?: string | undefined;
}

/**
 * Affiche un mot de passe temporaire **une seule fois** (pas de canal d'envoi
 * avant V06). L'admin le copie et le transmet hors-bande.
 */
export function TempPasswordDialog({
  isOpen,
  onClose,
  password,
  userLabel,
}: TempPasswordDialogProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (password === null) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard indisponible — l'utilisateur peut sélectionner manuellement.
    }
  }

  return (
    <Modal
      isOpen={isOpen && password !== null}
      onClose={onClose}
      title="Mot de passe temporaire"
      size="sm"
      footer={
        <Button variant="primary" size="sm" onClick={onClose}>
          J&apos;ai noté
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-text-muted">
          Mot de passe temporaire
          {userLabel !== undefined ? (
            <>
              {' '}
              pour <strong className="text-text">{userLabel}</strong>
            </>
          ) : null}
          . Affiché une seule fois — transmettez-le hors-bande, l&apos;utilisateur le changera à la
          première connexion.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate rounded-lg border border-border bg-bg px-3 py-2 font-mono text-sm text-text">
            {password}
          </code>
          <Button variant="secondary" size="sm" onClick={copy}>
            {copied ? 'Copié' : 'Copier'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
