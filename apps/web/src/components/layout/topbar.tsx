'use client';

import { useState } from 'react';
import { AlertTriangleIcon, BellIcon, InboxIcon, SearchIcon } from '@planit/ui';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface TopbarProps {
  title: string;
  subtitle?: string | undefined;
  breadcrumb?: BreadcrumbItem[] | undefined;
  conflicts?: number | undefined;
  pendingDemands?: number | undefined;
  unreadNotifs?: number | undefined;
}

function computeInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export function Topbar({
  title,
  subtitle,
  breadcrumb,
  conflicts = 0,
  pendingDemands = 0,
  unreadNotifs = 0,
}: TopbarProps) {
  const [search, setSearch] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const { state, logout } = useAuth();
  const initials =
    state.status === 'authenticated' ? computeInitials(state.user.nomComplet) : '...';

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border-soft bg-surface px-6">
      {/* Left: breadcrumb + title */}
      <div className="min-w-0 flex-1">
        {breadcrumb && breadcrumb.length > 0 ? (
          <div className="mb-0.5 flex items-center gap-1.5 text-[11.5px] font-medium text-text-muted">
            {breadcrumb.map((item, idx) => {
              const last = idx === breadcrumb.length - 1;
              return (
                <span key={`${item.label}-${idx}`} className="inline-flex items-center gap-1.5">
                  <span className={last ? 'text-text-sec' : 'text-text-muted'}>{item.label}</span>
                  {!last ? <span className="text-text-faint">/</span> : null}
                </span>
              );
            })}
          </div>
        ) : null}
        <h1 className="font-display text-[20px] font-semibold leading-tight tracking-tight text-text">
          {title}
        </h1>
        {subtitle ? <div className="mt-0.5 text-[12.5px] text-text-muted">{subtitle}</div> : null}
      </div>

      {/* Center: search with ⌘K shortcut */}
      <div className="flex-shrink-0">
        <label className="relative flex h-9 w-[320px] items-center rounded-lg border border-border bg-bg pl-3 pr-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
          <span className="mr-2 flex-shrink-0 text-text-muted">
            <SearchIcon size={16} color="currentColor" />
          </span>
          <input
            type="search"
            placeholder="Rechercher module, prof, salle…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-full w-full bg-transparent text-sm text-text outline-none placeholder:text-text-muted"
            aria-label="Rechercher"
          />
          <kbd
            className="ml-2 hidden flex-shrink-0 items-center gap-0.5 rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-text-muted md:inline-flex"
            aria-hidden
          >
            <span className="font-sans">⌘</span>
            <span>K</span>
          </kbd>
        </label>
      </div>

      {/* Right: conflicts + demandes + notifs + avatar */}
      <div className="flex flex-shrink-0 items-center gap-2">
        {conflicts > 0 ? (
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-err-100 bg-err-100 px-3 text-[12.5px] font-semibold text-err"
            aria-label={`${conflicts} conflit${conflicts > 1 ? 's' : ''}`}
          >
            <AlertTriangleIcon size={14} color="currentColor" />
            <span>
              {conflicts} conflit{conflicts > 1 ? 's' : ''}
            </span>
          </button>
        ) : null}

        <IconActionButton icon={InboxIcon} label="Demandes" badge={pendingDemands} />
        <IconActionButton icon={BellIcon} label="Notifications" badge={unreadNotifs} />

        <div
          className="relative"
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
              setProfileOpen(false);
            }
          }}
        >
          <button
            type="button"
            onClick={() => setProfileOpen((o) => !o)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-[12px] font-bold text-primary"
            aria-label="Profil"
            aria-expanded={profileOpen}
          >
            {initials}
          </button>
          {profileOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
              <button
                type="button"
                disabled
                className="w-full cursor-not-allowed px-4 py-2.5 text-left text-sm text-text-muted"
              >
                Mon compte {/* V03 */}
              </button>
              <div className="border-t border-border" />
              <button
                type="button"
                onClick={() => {
                  void logout();
                }}
                className="w-full px-4 py-2.5 text-left text-sm text-text hover:bg-bg"
              >
                Se déconnecter
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

interface IconActionButtonProps {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string;
  badge?: number;
}

function IconActionButton({ icon: Icon, label, badge = 0 }: IconActionButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-text-sec',
        'hover:border-primary hover:text-primary',
      )}
      aria-label={label}
    >
      <Icon size={16} color="currentColor" />
      {badge > 0 ? (
        <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[9.5px] font-bold text-white">
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </button>
  );
}
