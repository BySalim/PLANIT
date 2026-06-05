'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BellIcon, CalendarIcon, CheckSquareIcon, HomeIcon } from '@planit/ui';
import { useAuth, type UserRole } from '@/contexts/auth-context';
import { useCurrentActor } from '@/hooks/use-current-actor';
import { cn } from '@/lib/utils';

// Shell responsive des vues consultation (Enseignant / Étudiant / Délégué).
// Unifié et role-agnostique : URLs propres (`/`, `/planning`) identiques pour
// tous les acteurs, le rôle est lu via useCurrentActor() (libellé + identité).
//   • Mobile (< md) : max-w-md centré, header compact + tab bar flottante
//   • Desktop (≥ md) : sidebar gauche, pas de tab bar

export interface MobileShellProps {
  readonly children: React.ReactNode;
  readonly unread?: number;
}

interface TabDef {
  readonly id: 'home' | 'planning' | 'suivi';
  readonly label: string;
  readonly href: string;
  readonly icon: typeof HomeIcon;
}

// LOT 9 (S.6) : ajout du tab Suivi (V3-D14 — URL /suivi-modules role-aware).
const TABS: readonly TabDef[] = [
  { id: 'home', label: 'Accueil', href: '/', icon: HomeIcon },
  { id: 'planning', label: 'Planning', href: '/planning', icon: CalendarIcon },
  { id: 'suivi', label: 'Suivi', href: '/suivi-modules', icon: CheckSquareIcon },
];

const ROLE_LABEL: Partial<Record<UserRole, string>> = {
  ENSEIGNANT: 'Enseignant',
  ETUDIANT: 'Étudiant',
  RESPONSABLE_CLASSE: 'Délégué',
};

function initialsFor(fullName: string): string {
  const clean = fullName.replace(/^(M\.|Mme|Mlle|Pr\.|Dr\.)\s+/i, '');
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]?.[0] ?? '';
  const last = parts[parts.length - 1]?.[0] ?? '';
  return (first + last).toUpperCase();
}

export function MobileShell({ children, unread = 0 }: MobileShellProps) {
  const pathname = usePathname() ?? '';
  const actor = useCurrentActor();
  const { logout } = useAuth();
  const router = useRouter();
  const initials = initialsFor(actor.fullName);
  const roleLabel = ROLE_LABEL[actor.role] ?? 'Compte';

  const activeId: TabDef['id'] | null = pathname.startsWith('/planning')
    ? 'planning'
    : pathname.startsWith('/suivi-modules')
      ? 'suivi'
      : pathname === '/'
        ? 'home'
        : null;

  const handleLogout = () => {
    void logout().then(() => router.push('/login'));
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-bg">
      {/* ── Sidebar desktop (md+) ──────────────────────────────────────── */}
      <DesktopSidebar
        activeId={activeId}
        initials={initials}
        fullName={actor.fullName}
        role={roleLabel}
        unread={unread}
        onLogout={handleLogout}
      />

      {/* ── Panneau contenu ────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden max-md:mx-auto max-md:max-w-md">
        {/* Header compact — mobile uniquement */}
        <MobileHeader unread={unread} initials={initials} className="md:hidden" />

        {/* h-dvh pour que <main> soit le vrai conteneur de scroll vertical
            (sticky top-0 sur la toolbar ne s'active pas sinon — TD-027). */}
        <main className="scrollbar-hide min-h-0 flex-1 overflow-y-auto pb-28 md:pb-0">
          {children}
        </main>

        {/* Tab bar flottante — mobile uniquement */}
        <MobileTabBar activeId={activeId} unread={unread} className="md:hidden" />
      </div>
    </div>
  );
}

// ── Sidebar desktop ──────────────────────────────────────────────────────────

interface DesktopSidebarProps {
  readonly activeId: TabDef['id'] | null;
  readonly initials: string;
  readonly fullName: string;
  readonly role: string;
  readonly unread: number;
  readonly onLogout: () => void;
}

function DesktopSidebar({
  activeId,
  initials,
  fullName,
  role,
  unread,
  onLogout,
}: DesktopSidebarProps) {
  return (
    <aside
      className="hidden w-64 flex-shrink-0 flex-col border-r border-border bg-surface md:flex"
      aria-label="Navigation principale"
    >
      {/* Logo */}
      <Link
        href="/"
        className="flex h-16 flex-shrink-0 items-center gap-2.5 border-b border-border-soft px-5"
        aria-label="Accueil"
      >
        <span
          aria-hidden
          className="bg-brand-gradient flex size-9 items-center justify-center rounded-lg text-white"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-mono.svg" alt="" width={274} height={253} className="size-6" />
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/logo-wordmark-color.svg"
          alt="PLANIT"
          width={407}
          height={88}
          className="h-[18px] w-auto"
        />
      </Link>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-0.5 p-3" aria-label="Navigation">
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
                'inline-flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-semibold transition-colors',
                active
                  ? 'bg-primary-100 text-primary'
                  : 'text-text-muted hover:bg-bg hover:text-text',
              )}
            >
              <span className="relative inline-flex">
                <Icon size={18} color="currentColor" />
                {showBadge ? (
                  <span className="absolute -right-1.5 -top-1 inline-flex h-3 min-w-[12px] items-center justify-center rounded-full border-[1.5px] border-white bg-accent px-0.5 text-[8px] font-bold text-white">
                    {unread}
                  </span>
                ) : null}
              </span>
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {/* Section utilisateur + déconnexion */}
      <div className="flex flex-shrink-0 items-center gap-3 border-t border-border-soft px-3 py-4">
        <div
          className="flex size-9 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-[12px] font-bold text-primary"
          aria-hidden
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-text">{fullName}</p>
          <p className="text-[11px] text-text-muted">{role}</p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          aria-label="Se déconnecter"
          title="Se déconnecter"
          className="flex size-8 flex-shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-bg hover:text-err"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </aside>
  );
}

// ── Mobile header ────────────────────────────────────────────────────────────

function MobileHeader({
  unread,
  initials,
  className,
}: {
  unread: number;
  initials: string;
  className?: string;
}) {
  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-14 flex-shrink-0 items-center justify-between border-b border-border-soft bg-surface px-4',
        className,
      )}
    >
      <Link href="/" className="flex items-center gap-2" aria-label="Accueil">
        <span
          aria-hidden
          className="bg-brand-gradient flex size-9 items-center justify-center rounded-lg text-white"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-mono.svg" alt="" width={274} height={253} className="size-6" />
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/logo-wordmark-color.svg"
          alt="PLANIT"
          width={407}
          height={88}
          className="h-[18px] w-auto"
        />
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

// ── Mobile tab bar ───────────────────────────────────────────────────────────

function MobileTabBar({
  activeId,
  unread,
  className,
}: {
  activeId: TabDef['id'] | null;
  unread: number;
  className?: string;
}) {
  return (
    <nav
      aria-label="Navigation principale"
      className={cn(
        'pointer-events-none fixed inset-x-0 bottom-5 z-40 mx-auto flex max-w-md justify-center px-4',
        className,
      )}
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
