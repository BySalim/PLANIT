import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Sidebar } from './sidebar';
import { Topbar, type BreadcrumbItem } from './topbar';

interface ShellProps {
  title: string;
  subtitle?: string | undefined;
  breadcrumb?: BreadcrumbItem[] | undefined;
  activeNavId?: string | undefined;
  conflicts?: number | undefined;
  pendingDemands?: number | undefined;
  unreadNotifs?: number | undefined;
  /**
   * Pleine page : le shell occupe exactement la hauteur du viewport et la zone
   * de contenu ne scrolle pas elle-même — la page enfant gère son propre layout
   * (toolbar/footer figés, grille scrollable). Calqué sur PLANIT-IA/rp.
   */
  fullBleed?: boolean | undefined;
  /**
   * Fond blanc (`bg-surface`) au lieu du gris doux par défaut (`bg-bg`).
   * Utilisé sur les pages RP non-Planning (UE & Modules, Filières,
   * Enseignants, etc.) qui n'ont pas de carte interne et préfèrent un
   * fond clair uniforme. Sans effet en mode `fullBleed`.
   */
  surface?: boolean | undefined;
  children: ReactNode;
}

export function Shell({
  title,
  subtitle,
  breadcrumb,
  activeNavId,
  conflicts,
  pendingDemands,
  unreadNotifs,
  fullBleed = false,
  surface = false,
  children,
}: ShellProps) {
  return (
    <div
      className={cn(
        'flex',
        surface && !fullBleed ? 'bg-surface' : 'bg-bg',
        fullBleed ? 'h-screen overflow-hidden' : 'min-h-screen',
      )}
    >
      <Sidebar activeId={activeNavId} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          title={title}
          subtitle={subtitle}
          breadcrumb={breadcrumb}
          conflicts={conflicts}
          pendingDemands={pendingDemands}
          unreadNotifs={unreadNotifs}
        />
        <main
          className={cn(
            fullBleed
              ? 'min-h-0 flex-1 overflow-hidden'
              : cn('scrollbar-hide flex-1 overflow-auto px-6 py-6', surface ? 'bg-surface' : ''),
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
