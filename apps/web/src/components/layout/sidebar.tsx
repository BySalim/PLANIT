'use client';

import { useState, type ComponentType } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  type IconProps,
  HomeIcon,
  CalendarIcon,
  CheckSquareIcon,
  InboxIcon,
  AlertTriangleIcon,
  GraduationCapIcon,
  BookStackIcon,
  BookOpenIcon,
  UsersIcon,
  LayersIcon,
  UserCogIcon,
  UserIcon,
  DoorIcon,
  MessageCircleIcon,
  BellIcon,
  BarChartIcon,
  SettingsIcon,
  ChevronDownIcon,
} from '@planit/ui';
import { cn } from '@/lib/utils';

type IconComponent = ComponentType<IconProps>;

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: IconComponent;
  badge?: number;
  badgeTone?: 'default' | 'err';
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    group: 'PRINCIPAL',
    items: [
      { id: 'dashboard', label: 'Tableau de bord', href: '#', icon: HomeIcon },
      { id: 'planning', label: 'Planning', href: '/rp', icon: CalendarIcon },
      { id: 'suivi-modules', label: 'Suivi des modules', href: '#', icon: CheckSquareIcon },
      { id: 'demands', label: 'Demandes', href: '#', icon: InboxIcon, badge: 0 },
      {
        id: 'conflicts',
        label: 'Conflits',
        href: '#',
        icon: AlertTriangleIcon,
        badge: 0,
        badgeTone: 'err',
      },
    ],
  },
  {
    group: 'OFFRE DE FORMATION',
    items: [
      { id: 'filieres', label: 'Filières', href: '#', icon: GraduationCapIcon },
      { id: 'formations', label: 'Formations', href: '#', icon: BookStackIcon },
      { id: 'modules', label: 'UE & Modules', href: '#', icon: BookOpenIcon },
      { id: 'maquettes', label: 'Maquettes de formation', href: '#', icon: BookStackIcon },
    ],
  },
  {
    group: 'RÉFÉRENTIELS',
    items: [
      { id: 'students', label: 'Étudiants', href: '#', icon: UsersIcon },
      { id: 'classes', label: 'Classes', href: '#', icon: LayersIcon },
      { id: 'teachers', label: 'Enseignants', href: '#', icon: UserCogIcon },
      { id: 'personnel', label: 'Personnel', href: '#', icon: UserIcon },
      { id: 'rooms', label: 'Salles', href: '#', icon: DoorIcon },
    ],
  },
  {
    group: 'CONSULTATION',
    items: [
      { id: 'messages', label: 'Messagerie', href: '#', icon: MessageCircleIcon },
      { id: 'communications', label: 'Communications', href: '#', icon: BellIcon },
      { id: 'reports', label: 'Activité', href: '#', icon: BarChartIcon },
    ],
  },
];

const PROFILE = {
  firstName: 'Aïssatou',
  lastName: 'Diallo',
  role: 'Responsable de programme',
};

function initials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

export function Sidebar({ activeId = 'planning' }: { activeId?: string | undefined }) {
  const pathname = usePathname();
  const [open, setOpen] = useState<Record<string, boolean>>({
    PRINCIPAL: true,
    'OFFRE DE FORMATION': true,
    RÉFÉRENTIELS: true,
    CONSULTATION: true,
  });
  const toggle = (group: string) => setOpen((prev) => ({ ...prev, [group]: !prev[group] }));

  // Active is derived first from current path (for real routes), then from explicit prop.
  const isActive = (item: NavItem): boolean => {
    if (item.href !== '#' && pathname.startsWith(item.href)) return true;
    if (item.href === '#' && item.id === activeId) return true;
    return false;
  };

  return (
    <aside
      style={{ width: 248 }}
      className="sticky top-0 flex h-screen flex-shrink-0 flex-col overflow-hidden border-r border-sb-dark-2 bg-sb-dark text-sb-dark-text"
    >
      {/* Logo */}
      <div className="flex min-h-[72px] items-center gap-3 border-b border-sb-dark-2 px-4 py-5">
        <div className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-sb-dark-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: 'linear-gradient(135deg, #6B2D0E 0%, #E8620A 100%)' }}
          >
            <span className="font-display text-[13px] font-bold leading-none tracking-tight text-white">
              P
            </span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-[19px] font-bold leading-none tracking-tight text-white">
            PLANIT
          </div>
          <div className="mt-1 truncate text-[10.5px] font-medium tracking-wider text-sb-dark-muted">
            ÉCOLE D&apos;INGÉNIEURS · ISM
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-2.5">
        {NAV.map((group) => {
          const isOpen = !!open[group.group];
          return (
            <div key={group.group} className="mb-1">
              <button
                type="button"
                onClick={() => toggle(group.group)}
                className="flex w-full items-center justify-between px-2 pb-1.5 pt-3.5 text-[10px] font-bold tracking-wider text-sb-dark-muted"
              >
                <span>{group.group}</span>
                <ChevronDownIcon
                  size={10}
                  color="currentColor"
                  // CSS rotation via className for the chevron
                />
              </button>
              {isOpen ? (
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = isActive(item);
                    const Icon = item.icon;
                    return (
                      <li key={item.id}>
                        <Link
                          href={item.href}
                          aria-current={active ? 'page' : undefined}
                          className={cn(
                            'relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors',
                            active
                              ? 'bg-accent/15 text-white'
                              : 'text-sb-dark-text hover:bg-sb-dark-2',
                          )}
                        >
                          {active ? (
                            <span
                              aria-hidden
                              className="absolute -left-2.5 top-2 bottom-2 w-[3px] rounded-full bg-accent"
                            />
                          ) : null}
                          <Icon size={17} color="currentColor" />
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.badge && item.badge > 0 ? (
                            <span
                              className={cn(
                                'inline-flex h-[18px] min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10.5px] font-bold text-white',
                                item.badgeTone === 'err' ? 'bg-err' : 'bg-accent',
                              )}
                            >
                              {item.badge}
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          );
        })}
      </nav>

      {/* User block */}
      <div className="border-t border-sb-dark-2">
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          <div className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-full bg-sb-dark-2 text-[12px] font-bold text-primary-100">
            {initials(PROFILE.firstName, PROFILE.lastName)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold text-white">
              {PROFILE.firstName} {PROFILE.lastName}
            </div>
            <div className="truncate text-[11px] text-sb-dark-muted">{PROFILE.role}</div>
          </div>
        </div>
        <button
          type="button"
          className="flex w-full items-center gap-2.5 border-t border-sb-dark-2 px-3 py-2 text-[13px] font-medium text-sb-dark-muted hover:bg-sb-dark-2 hover:text-white"
        >
          <SettingsIcon size={15} color="currentColor" />
          <span>Paramètres</span>
        </button>
      </div>
    </aside>
  );
}
