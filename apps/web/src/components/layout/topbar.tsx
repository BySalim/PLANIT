'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PlanitLogo } from '@planit/ui';
import { cn } from '@/lib/utils';

// Vague 01 has no authentication (V1-D2): the actor is picked from the topbar.
const ACTORS = [
  { href: '/rp', label: 'RP' },
  { href: '/enseignant', label: 'Enseignant' },
  { href: '/etudiant', label: 'Étudiant' },
] as const;

export function Topbar() {
  const pathname = usePathname();

  return (
    <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
      <div className="flex items-center gap-2.5">
        <PlanitLogo size={32} />
        <span className="font-display text-lg font-bold text-primary">PLANIT</span>
      </div>

      <nav className="flex items-center gap-1" aria-label="Sélecteur d'acteur">
        {ACTORS.map((actor) => {
          const active = pathname.startsWith(actor.href);
          return (
            <Link
              key={actor.href}
              href={actor.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-surface'
                  : 'text-text-sec hover:bg-primary-50 hover:text-primary',
              )}
            >
              {actor.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
