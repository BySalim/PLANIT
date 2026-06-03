'use client';

import { useEffect, useState } from 'react';
import { type EtudiantDto, etudiantLookupSchema, z } from '@planit/contracts';
import { Modal } from '@/components/ui/modal';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { apiGet } from '@/lib/api';
import { useCreateInscriptionMutation } from '@/lib/mutations-v3';

export type InscriptionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  classeId: string;
  classeName?: string | undefined;
};

type Step = 'email' | 'confirm' | 'new';

const emailSchema = z.string().email();

/**
 * Modal d'inscription — **flux email** (V3-D7 / ADR-0011), **partagé RP + AC**
 * (réutilisé tel quel par l'espace AC, G.5). Aucune hypothèse de rôle ici : le
 * périmètre (l'AC ne peut inscrire que sur ses classes) est imposé côté serveur.
 *
 * 1. Saisie email → `GET /etudiants/lookup`.
 * 2. Trouvé → confirmation → `POST … { mode: 'existant' }`.
 * 3. Inconnu → infos (nomComplet + matricule) → `POST … { mode: 'nouveau' }`.
 *
 * Le 409 (doublon / règle double-diplôme) est remonté en flash par la mutation.
 */
export function InscriptionModal({ isOpen, onClose, classeId, classeName }: InscriptionModalProps) {
  const createInscription = useCreateInscriptionMutation();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [found, setFound] = useState<EtudiantDto | null>(null);
  const [nomComplet, setNomComplet] = useState('');
  const [matricule, setMatricule] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Réinitialisation à chaque ouverture.
  useEffect(() => {
    if (!isOpen) return;
    setStep('email');
    setEmail('');
    setFound(null);
    setNomComplet('');
    setMatricule('');
    setLookupLoading(false);
    setError(null);
  }, [isOpen]);

  async function handleLookup() {
    const trimmed = email.trim();
    if (!emailSchema.safeParse(trimmed).success) {
      setError('Adresse email invalide.');
      return;
    }
    setError(null);
    setLookupLoading(true);
    try {
      const res = await apiGet(
        `/etudiants/lookup?email=${encodeURIComponent(trimmed)}`,
        etudiantLookupSchema,
      );
      if (res.found && res.etudiant !== null) {
        setFound(res.etudiant);
        setStep('confirm');
      } else {
        setFound(null);
        setStep('new');
      }
    } catch {
      setError('Recherche impossible. Réessayez.');
    } finally {
      setLookupLoading(false);
    }
  }

  async function handleEnrollExistant() {
    try {
      await createInscription.mutateAsync({
        classeId,
        body: { mode: 'existant', email: email.trim() },
      });
      onClose();
    } catch {
      // flash (dont 409) géré par la mutation ; on garde le modal ouvert
    }
  }

  async function handleEnrollNouveau() {
    if (nomComplet.trim() === '' || matricule.trim() === '') {
      setError('Nom complet et matricule sont requis.');
      return;
    }
    setError(null);
    try {
      await createInscription.mutateAsync({
        classeId,
        body: {
          mode: 'nouveau',
          email: email.trim(),
          nomComplet: nomComplet.trim(),
          matricule: matricule.trim(),
        },
      });
      onClose();
    } catch {
      // flash (dont 409) géré par la mutation
    }
  }

  const isEnrolling = createInscription.isPending;

  const footer =
    step === 'email' ? (
      <>
        <Button variant="secondary" size="sm" onClick={onClose}>
          Annuler
        </Button>
        <Button variant="primary" size="sm" onClick={handleLookup} disabled={lookupLoading}>
          {lookupLoading ? 'Recherche…' : 'Rechercher'}
        </Button>
      </>
    ) : step === 'confirm' ? (
      <>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setStep('email')}
          disabled={isEnrolling}
        >
          Retour
        </Button>
        <Button variant="primary" size="sm" onClick={handleEnrollExistant} disabled={isEnrolling}>
          {isEnrolling ? 'Inscription…' : 'Inscrire'}
        </Button>
      </>
    ) : (
      <>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setStep('email')}
          disabled={isEnrolling}
        >
          Retour
        </Button>
        <Button variant="primary" size="sm" onClick={handleEnrollNouveau} disabled={isEnrolling}>
          {isEnrolling ? 'Inscription…' : 'Créer et inscrire'}
        </Button>
      </>
    );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={classeName ? `Inscrire dans ${classeName}` : 'Inscrire un étudiant'}
      size="sm"
      footer={footer}
    >
      <div className="flex flex-col gap-4">
        {/* Étape 1 — email */}
        <FormField
          label="Email de l'étudiant"
          required
          hint={
            step === 'email'
              ? "Saisissez l'email, puis recherchez si l'étudiant existe déjà."
              : undefined
          }
        >
          {({ id, 'aria-describedby': describedBy }) => (
            <Input
              id={id}
              type="email"
              aria-describedby={describedBy}
              placeholder="ex. awa.diop@ism.edu.sn"
              value={email}
              readOnly={step !== 'email'}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && step === 'email') {
                  e.preventDefault();
                  void handleLookup();
                }
              }}
            />
          )}
        </FormField>

        {/* Étape 2 — étudiant trouvé */}
        {step === 'confirm' && found !== null ? (
          <div className="flex items-center gap-3 rounded-lg border border-ok/30 bg-ok/10 px-4 py-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-ok/20 text-sm font-bold text-ok">
              {found.nomComplet.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-text">{found.nomComplet}</div>
              <div className="text-xs text-text-muted">
                {found.matricule ?? 'Sans matricule'} · {found.email}
              </div>
            </div>
          </div>
        ) : null}

        {/* Étape 3 — nouvel étudiant */}
        {step === 'new' ? (
          <>
            <div className="rounded-lg bg-bg-warm px-4 py-2 text-xs text-text-muted">
              Aucun étudiant pour cet email. Renseignez ses informations pour le créer et
              l’inscrire.
            </div>
            <FormField label="Nom complet" required>
              {({ id, 'aria-describedby': describedBy }) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  placeholder="ex. Awa Diop"
                  value={nomComplet}
                  onChange={(e) => setNomComplet(e.target.value)}
                />
              )}
            </FormField>
            <FormField label="Matricule" required>
              {({ id, 'aria-describedby': describedBy }) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  placeholder="ex. ISM-2026-0142"
                  value={matricule}
                  onChange={(e) => setMatricule(e.target.value)}
                />
              )}
            </FormField>
          </>
        ) : null}

        {error !== null ? (
          <div className="rounded-lg bg-err-100 px-4 py-2 text-sm text-err">{error}</div>
        ) : null}
      </div>
    </Modal>
  );
}
