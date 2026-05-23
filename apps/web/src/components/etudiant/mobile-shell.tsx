'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BellIcon, CalendarIcon, HomeIcon } from '@planit/ui';
import { useCurrentStudent } from '@/hooks/use-current-student';
import { cn } from '@/lib/utils';

export interface MobileShellProps {
  readonly children: React.ReactNode;
  readonly unread?: number;
}

interface TabDef {
  readonly id: 'home' | 'planning';
  readonly label: string;
  readonly href: string;
  readonly icon: typeof HomeIcon;
}

const TABS: readonly TabDef[] = [
  { id: 'home', label: 'Accueil', href: '/etudiant', icon: HomeIcon },
  { id: 'planning', label: 'Planning', href: '/etudiant/planning', icon: CalendarIcon },
];

function initialsFor(fullName: string): string {
  const clean = fullName.replace(/^(M\.|Mme|Mlle|Pr\.|Dr\.)\s+/i, '');
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]?.[0] ?? '';
  const last = parts[parts.length - 1]?.[0] ?? '';
  return (first + last).toUpperCase();
}

// Simulation mobile sur web — voir L3-D3 / TD-027.
export function MobileShell({ children, unread = 0 }: MobileShellProps) {
  const pathname = usePathname() ?? '';
  const student = useCurrentStudent();

  const activeId: TabDef['id'] | null = pathname.startsWith('/etudiant/planning')
    ? 'planning'
    : pathname === '/etudiant'
      ? 'home'
      : null;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-bg">
      <MobileHeader unread={unread} initials={initialsFor(student.fullName)} />
      <main className="flex-1 overflow-y-auto pb-28">{children}</main>
      <MobileTabBar activeId={activeId} unread={unread} />
    </div>
  );
}

function MobileHeader({ unread, initials }: { unread: number; initials: string }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 flex-shrink-0 items-center justify-between border-b border-border-soft bg-surface px-4">
      <Link href="/etudiant" className="flex items-center gap-2" aria-label="Accueil étudiant">
        <span
          aria-hidden
          className="bg-brand-gradient flex size-9 items-center justify-center rounded-lg text-white"
        >
          <CalendarIcon size={18} color="currentColor" />
        </span>
        <span className="font-display text-[18px] font-bold tracking-tight text-primary">
          PLANIT
        </span>
      </Link>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Notifications${unread > 0 ? ` (${unread} non lue${unread > 1 ? 's' : ''})` : ''}`}
          className="relative flex size-10 items-center justify-center rounded-full text-text transition-colors hover:bg-bg"
        >
          <BellIcon size={22} color="currentColor" />
          {unread > 0 ? (
            <span className="absolute right-1.5 top-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full border-2 border-surface bg-accent px-1 text-[10px] font-bold text-white">
              {unread}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          aria-label="Profil"
          className="flex size-9 items-center justify-center rounded-full bg-primary-100 text-[12px] font-bold text-primary"
        >
          {initials}
        </button>
      </div>
    </header>
  );
}

function MobileTabBar({ activeId, unread }: { activeId: TabDef['id'] | null; unread: number }) {
  return (
    <nav
      aria-label="Navigation principale"
      className="pointer-events-none fixed inset-x-0 bottom-5 z-40 mx-auto flex max-w-md justify-center px-4"
    >
      <div className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-white/60 bg-bg/80 p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.18)] backdrop-blur-md">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = tab.id === activeId;
          const showBadge = tab.id === 'home' && unread > 0 && !active;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full text-[13px] font-semibold transition-all duration-200',
                active
                  ? 'bg-brand-gradient-deep px-4 py-2.5 text-white shadow-[0_4px_14px_rgba(107,45,14,0.45)]'
                  : 'px-3.5 py-2.5 text-text/50',
              )}
            >
              <span className="relative inline-flex">
                <Icon size={20} color="currentColor" />
                {showBadge ? (
                  <span className="absolute -right-1.5 -top-1 inline-flex h-3 min-w-[13px] items-center justify-center rounded-full border-[1.5px] border-white bg-accent px-1 text-[8.5px] font-bold text-white">
                    {unread}
                  </span>
                ) : null}
              </span>
              {active ? <span>{tab.label}</span> : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
