'use client';

import { InboxIcon } from '@planit/ui';
import { Shell } from '@/components/layout/shell';
import { ComingSoonPlaceholder } from '@/components/ui/coming-soon-placeholder';

/**
 * Placeholder Demandes (V3-D9, G.7 du LOT 6). Workflow complet (composer,
 * suivi, statuts, propositions de modification) reporté en V04+ — entrée de
 * menu maintenue pour préfigurer l'emplacement final.
 */
// Next.js App Router requires default export for page
// eslint-disable-next-line no-restricted-syntax
export default function DemandesPage() {
  return (
    <Shell
      title="Demandes"
      breadcrumb={[{ label: 'Mon espace' }, { label: 'Demandes' }]}
      activeNavId="demands"
      surface
    >
      <ComingSoonPlaceholder
        title="Demandes"
        subtitle="Modifications de séances, propositions, retours enseignants : ce centre regroupera bientôt toutes vos demandes."
        icon={InboxIcon}
      />
    </Shell>
  );
}
