// Squelette de chargement de la grille planning (RP & vues semaine enseignant/étudiant).
// Mime la structure jours × heures : en-tête sticky, colonne d'heures, 7 colonnes
// avec quelques blocs gris pulsés. Aligné sur les dimensions de PlanningGrid
// (44px colonne heures, 42px header, 7×minmax(250px,2fr) jours).
//
// Pas d'interaction : c'est un placeholder visuel pendant `isLoading`.

const DAY_COUNT = 7;
const HOUR_HEIGHT = 78;
const GRID_HEIGHT = 12 * HOUR_HEIGHT + HOUR_HEIGHT / 2;

interface SkeletonBlock {
  readonly topOffset: number;
  readonly heightFactor: number;
}

// Variations par colonne pour ne pas avoir un rendu trop régulier.
const SKELETON_PATTERNS: ReadonlyArray<ReadonlyArray<SkeletonBlock>> = [
  [
    { topOffset: 1, heightFactor: 1.5 },
    { topOffset: 5, heightFactor: 1 },
  ],
  [{ topOffset: 2, heightFactor: 2 }],
  [
    { topOffset: 0.5, heightFactor: 1.5 },
    { topOffset: 4, heightFactor: 1.5 },
    { topOffset: 7, heightFactor: 1 },
  ],
  [{ topOffset: 3, heightFactor: 2 }],
  [
    { topOffset: 1, heightFactor: 1 },
    { topOffset: 4, heightFactor: 1.5 },
  ],
  [{ topOffset: 6, heightFactor: 1.5 }],
  [],
];

export function PlanningGridSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Chargement du planning"
      className="scrollbar-hide h-full overflow-auto bg-surface"
    >
      <div className="grid grid-cols-[44px_repeat(7,minmax(250px,2fr))]">
        {/* En-tête sticky — corner + 7 labels jours en placeholder. */}
        <div className="sticky left-0 top-0 z-30 h-[42px] border-b border-r border-border-soft bg-surface" />
        {Array.from({ length: DAY_COUNT }, (_, i) => (
          <div
            key={i}
            className="sticky top-0 z-20 flex h-[42px] flex-col items-center justify-center gap-1 border-b border-r border-border-soft bg-surface px-2.5"
          >
            <span className="h-2.5 w-14 animate-pulse rounded bg-border-soft" aria-hidden />
            <span className="h-2 w-10 animate-pulse rounded bg-border-soft/70" aria-hidden />
          </div>
        ))}

        {/* Colonne heures sticky (vide en skeleton). */}
        <div
          className="sticky left-0 z-10 border-r border-border-soft bg-surface"
          style={{ height: GRID_HEIGHT }}
          aria-hidden
        />

        {/* 7 colonnes de jours avec quelques blocs gris pulsés. */}
        {Array.from({ length: DAY_COUNT }, (_, dayIndex) => {
          const blocks = SKELETON_PATTERNS[dayIndex] ?? [];
          return (
            <div
              key={dayIndex}
              className="relative border-r border-border"
              style={{ height: GRID_HEIGHT }}
              aria-hidden
            >
              {blocks.map((block, i) => (
                <div
                  key={i}
                  className="absolute inset-x-1 animate-pulse rounded-md bg-border-soft"
                  style={{
                    top: block.topOffset * HOUR_HEIGHT,
                    height: HOUR_HEIGHT * block.heightFactor,
                  }}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
