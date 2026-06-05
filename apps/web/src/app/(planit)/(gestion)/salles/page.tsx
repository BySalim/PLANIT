'use client';

import { DoorIcon } from '@planit/ui';
import { Shell } from '@/components/layout/shell';
import { ComingSoonPlaceholder } from '@/components/ui/coming-soon-placeholder';
import { useIsAc, useIsRp } from '@/hooks/use-role';
import { useAcScope } from '@/hooks/use-ac-scope';

/**
 * Page Salles (LOT 6 G.6).
 *
 * V03 limité au **scope AC** : les salles dont son RP manager est responsable
 * (`Salle.rpResponsableId`, exposées par `GET /api/ac/me/scope`). Pour le RP,
 * une vraie liste/CRUD Salles existera en V04 — on rend un placeholder court
 * en attendant. Décision actée dans la spec VAGUE-03-06 (§D5).
 */
// Next.js App Router requires default export for page
// eslint-disable-next-line no-restricted-syntax
export default function SallesPage() {
  const isAc = useIsAc();
  const isRp = useIsRp();
  const scope = useAcScope();

  return (
    <Shell
      title="Salles"
      breadcrumb={[{ label: 'Référentiels' }, { label: 'Salles' }]}
      activeNavId="rooms"
      surface
    >
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
