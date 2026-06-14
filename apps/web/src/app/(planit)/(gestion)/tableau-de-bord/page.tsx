'use client';

import { HomeIcon } from '@planit/ui';
import { Shell } from '@/components/layout/shell';
import { ComingSoonPlaceholder } from '@/components/ui/coming-soon-placeholder';
import { DirectionHomeView } from '@/components/direction/direction-home-view';
import { useIsDirection } from '@/hooks/use-role';

/**
 * Tableau de bord (V3-D9, G.7 du LOT 6). Role-aware (V05 LOT 3, correctif 3.3) :
 *  - DIRECTION → KPIs + accès rapides de son école (`DirectionHomeView`).
 *  - RP / AC → placeholder (la synthèse RP/AC arrive plus tard).
 * La Direction trouve ici son dashboard ; sa vue planning vit sur `/`.
 */
// Next.js App Router requires default export for page
// eslint-disable-next-line no-restricted-syntax
export default function TableauDeBordPage() {
  return <TableauDeBordByRole />;
}

function TableauDeBordByRole() {
  const isDirection = useIsDirection();

  if (isDirection) {
    return (
      <Shell
        title="Tableau de bord"
        breadcrumb={[{ label: 'Mon école' }, { label: 'Tableau de bord' }]}
        activeNavId="dashboard"
      >
        <DirectionHomeView />
      </Shell>
    );
  }

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
