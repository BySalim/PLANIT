// Squelette de chargement pour <HeroCurrentSession>.
// Mime la carte hero : pill statut + titre + meta + barre progression.
// Utilise `animate-pulse` + tokens (`bg-border-soft`) — pas de hex en dur.

export function HeroSkeleton() {
  return (
    <section
      aria-busy="true"
      aria-label="Chargement de votre prochaine séance"
      className="overflow-hidden rounded-2xl border border-border bg-surface px-6 py-5"
    >
      <div className="flex flex-col gap-3">
        {/* Pill "En cours" + temps restant */}
        <div className="flex items-center justify-between">
          <span className="h-4 w-20 animate-pulse rounded-full bg-border-soft" aria-hidden />
          <span className="h-3 w-16 animate-pulse rounded bg-border-soft" aria-hidden />
        </div>

        {/* Titre module (2 lignes pour reproduire la hauteur du hero) */}
        <div className="flex flex-col gap-1.5">
          <span className="h-5 w-2/3 animate-pulse rounded bg-border-soft" aria-hidden />
          <span className="h-5 w-1/3 animate-pulse rounded bg-border-soft" aria-hidden />
        </div>

        {/* Badge classe / prof */}
        <span className="h-4 w-16 animate-pulse rounded bg-border-soft" aria-hidden />

        {/* Ligne salle (icône + label) */}
        <div className="flex items-center gap-2">
          <span className="size-3 animate-pulse rounded-full bg-border-soft" aria-hidden />
          <span className="h-3 w-24 animate-pulse rounded bg-border-soft" aria-hidden />
        </div>

        {/* Horaire + badge catégorie */}
        <div className="flex items-center justify-between">
          <span className="h-3.5 w-28 animate-pulse rounded bg-border-soft" aria-hidden />
          <span className="h-4 w-14 animate-pulse rounded bg-border-soft" aria-hidden />
        </div>

        {/* Barre de progression */}
        <div className="h-1 w-full overflow-hidden rounded-full bg-border-soft">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-border" aria-hidden />
        </div>
      </div>
    </section>
  );
}
