'use client';

import { HomeIcon } from '@planit/ui';
import { Shell } from '@/components/layout/shell';
import { ComingSoonPlaceholder } from '@/components/ui/coming-soon-placeholder';

/**
 * Placeholder Tableau de bord (V3-D9, G.7 du LOT 6). Entrée de menu présente
 * pour RP **et** AC mais sans implémentation fonctionnelle V03 — la vraie
 * synthèse dashboard (KPIs, classes attachées, séances pending) arrive en V04.
 */
// Next.js App Router requires default export for page
// eslint-disable-next-line no-restricted-syntax
export default function TableauDeBordPage() {
  return (
    <Shell
      title="Tableau de bord"
      breadcrumb={[{ label: 'Mon espace' }, { label: 'Tableau de bord' }]}
      activeNavId="dashboard"
      surface
    >
      <ComingSoonPlaceholder
        title="Tableau de bord"
        subtitle="Vue d'ensemble de vos classes, séances à venir et indicateurs pédagogiques. Disponible prochainement."
        icon={HomeIcon}
      />
    </Shell>
  );
}
