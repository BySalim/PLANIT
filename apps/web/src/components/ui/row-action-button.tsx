import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface RowActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Icône optionnelle, rendue après le label (ex. chevron, check). */
  readonly icon?: ReactNode;
  /** `primary` = action de ligne mise en avant (teinte primary). */
  readonly emphasis?: 'default' | 'primary';
}

/**
 * Bouton d'action de ligne — outline bordé compact, aligné sur la présentation
 * des pages Filières / Formations (référence UI du projet). Remplace les pills
 * `<Button>` pleines pour les actions au sein d'un tableau, pour une hiérarchie
 * visuelle plus sobre et homogène.
 */
export const RowActionButton = forwardRef<HTMLButtonElement, RowActionButtonProps>(
  function RowActionButton(
    { className, children, icon, emphasis = 'default', type = 'button', ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'inline-flex h-8 items-center gap-1 rounded-lg border px-3 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50',
          emphasis === 'primary'
            ? 'border-primary-100 bg-primary-50 text-primary hover:bg-primary-100'
            : 'border-border text-text-sec hover:bg-bg hover:text-text',
          className,
        )}
        {...props}
      >
        {children}
        {icon}
      </button>
    );
  },
);
