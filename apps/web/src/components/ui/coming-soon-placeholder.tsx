'use client';

import type { ComponentType } from 'react';
import Link from 'next/link';
import type { IconProps } from '@planit/ui';

interface ComingSoonPlaceholderProps {
  /** Titre principal (ex. « Tableau de bord »). */
  title: string;
  /** Sous-titre / description courte. */
  subtitle?: string;
  /** Icône `@planit/ui` rendue en grand au-dessus du titre. */
  icon?: ComponentType<IconProps>;
  /** Texte du lien retour. Si omis : pas de lien. */
  backLabel?: string;
  /** Cible du lien retour (défaut `/`). */
  backHref?: string;
}

/**
 * Écran « Bientôt disponible » utilisé pour les entrées de menu V3-D9
 * livrées en placeholder (`Tableau de bord` et `Demandes` pour l'AC,
 * mais réutilisable côté RP). Volontairement très simple — illustration
 * minimale (icône agrandie) plutôt qu'une vraie image, pour rester
 * cohérent avec la sobriété du reste de l'app.
 */
export function ComingSoonPlaceholder({
  title,
  subtitle,
  icon: Icon,
  backLabel = 'Retour à l’accueil',
  backHref = '/',
}: ComingSoonPlaceholderProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      {Icon ? (
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-50 text-primary">
          <Icon size={36} color="currentColor" />
        </div>
      ) : null}
      <h2 className="font-display text-2xl font-semibold text-text">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-text-muted">
        {subtitle ?? 'Cette section sera disponible dans une prochaine version.'}
      </p>
      <span className="mt-4 inline-flex items-center rounded-full bg-accent/10 px-3 py-1 text-[12px] font-semibold uppercase tracking-wide text-accent">
        Bientôt disponible
      </span>
      {backLabel ? (
        <Link href={backHref} className="mt-6 text-[13px] font-medium text-primary hover:underline">
          {backLabel}
        </Link>
      ) : null}
    </div>
  );
}
