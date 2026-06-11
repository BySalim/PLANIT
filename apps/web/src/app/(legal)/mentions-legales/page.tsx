import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Mentions légales — PLANIT',
  description: 'Mentions légales de la plateforme PLANIT.',
};

// Next.js App Router requires default export for page
// eslint-disable-next-line no-restricted-syntax
export default function MentionsLegalesPage() {
  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-semibold text-text">Mentions légales</h1>
        <p className="text-sm text-text-muted">Dernière mise à jour : juin 2026</p>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-lg font-semibold text-text">Éditeur</h2>
        <p className="text-sm leading-relaxed text-text-muted">
          PLANIT est une plateforme de gestion des emplois du temps mise à la disposition de
          l’Institut Supérieur de Management (ISM), à Dakar, pour l’organisation de sa scolarité.
          Elle est conçue et opérée par l’équipe projet PLANIT, responsable de sa publication.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-lg font-semibold text-text">Contact</h2>
        <p className="text-sm leading-relaxed text-text-muted">
          Pour toute question relative à la plateforme :{' '}
          <a href="mailto:contact@planit.sn" className="text-primary hover:underline">
            contact@planit.sn
          </a>
          .
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-lg font-semibold text-text">Hébergement</h2>
        <p className="text-sm leading-relaxed text-text-muted">
          La plateforme est hébergée chez un prestataire d’infrastructure cloud situé dans l’Union
          européenne (Hetzner Online GmbH). Les données sont stockées sur cette infrastructure et
          sauvegardées de façon chiffrée.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-lg font-semibold text-text">Propriété intellectuelle</h2>
        <p className="text-sm leading-relaxed text-text-muted">
          L’ensemble des éléments composant la plateforme (code source, identité visuelle,
          interfaces et contenus) est protégé. Toute reproduction, représentation ou réutilisation,
          totale ou partielle, sans autorisation préalable, est interdite.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-lg font-semibold text-text">Données personnelles</h2>
        <p className="text-sm leading-relaxed text-text-muted">
          Le traitement des données personnelles est décrit dans la{' '}
          <Link href="/politique-confidentialite" className="text-primary hover:underline">
            politique de confidentialité
          </Link>
          .
        </p>
      </section>
    </article>
  );
}
