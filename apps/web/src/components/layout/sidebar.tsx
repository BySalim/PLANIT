'use client';

import { useEffect, useRef, useState, type ComponentType, type CSSProperties } from 'react';
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
import { useAuth, type UserRole } from '@/contexts/auth-context';
import { roleLabel } from '@/hooks/use-role';

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

// ── Menu RP (état pré-V3-LOT 6 + branchement TdB/Demandes/Salles sur leurs
//    pages réelles — placeholders V03 pour TdB/Demandes/Salles, fonctionnels
//    pour les autres). Inchangé sur les items déjà routés.
const NAV_RP: NavGroup[] = [
  {
    group: 'PRINCIPAL',
    items: [
      { id: 'dashboard', label: 'Tableau de bord', href: '/tableau-de-bord', icon: HomeIcon },
      { id: 'planning', label: 'Planning', href: '/', icon: CalendarIcon },
      { id: 'suivi', label: 'Suivi des modules', href: '/suivi-modules', icon: CheckSquareIcon },
      { id: 'demands', label: 'Demandes', href: '/demandes', icon: InboxIcon },
      {
        id: 'conflicts',
        label: 'Conflits',
        href: '#',
        icon: AlertTriangleIcon,
        badge: 3,
        badgeTone: 'err',
      },
    ],
  },
  {
    group: 'OFFRE DE FORMATION',
    items: [
      { id: 'filieres', label: 'Filières', href: '/filieres', icon: GraduationCapIcon },
      { id: 'formations', label: 'Formations', href: '/formations', icon: BookStackIcon },
      { id: 'modules', label: 'UE & Modules', href: '/ue-modules', icon: BookOpenIcon },
      { id: 'maquettes', label: 'Maquettes de formation', href: '/maquettes', icon: BookStackIcon },
    ],
  },
  {
    group: 'RÉFÉRENTIELS',
    items: [
      { id: 'students', label: 'Étudiants', href: '/etudiants', icon: UsersIcon },
      { id: 'classes', label: 'Classes', href: '/classes', icon: LayersIcon },
      { id: 'teachers', label: 'Enseignants', href: '/enseignants', icon: UserCogIcon },
      { id: 'personnel', label: 'Personnel', href: '#', icon: UserIcon },
      { id: 'rooms', label: 'Salles', href: '/salles', icon: DoorIcon },
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

// ── Menu AC (V3-D9, LOT 6 G.2) — strictement 8 entrées, aucun item
//    « offre de formation » (Maquettes/Formations/Filières/UE&Modules sont
//    RP-only via le route group `(rp-only)`).
const NAV_AC: NavGroup[] = [
  {
    group: 'PRINCIPAL',
    items: [
      { id: 'dashboard', label: 'Tableau de bord', href: '/tableau-de-bord', icon: HomeIcon },
      { id: 'planning', label: 'Planning', href: '/', icon: CalendarIcon },
      { id: 'suivi', label: 'Suivi des modules', href: '/suivi-modules', icon: CheckSquareIcon },
      { id: 'demands', label: 'Demandes', href: '/demandes', icon: InboxIcon },
    ],
  },
  {
    group: 'MES CLASSES',
    items: [
      { id: 'students', label: 'Étudiants', href: '/etudiants', icon: UsersIcon },
      { id: 'classes', label: 'Classes', href: '/classes', icon: LayersIcon },
    ],
  },
  {
    group: 'RÉFÉRENTIELS',
    items: [
      { id: 'teachers', label: 'Enseignants', href: '/enseignants', icon: UserCogIcon },
      { id: 'rooms', label: 'Salles', href: '/salles', icon: DoorIcon },
    ],
  },
];

// ── Menu Direction (V05 LOT 3) — pilotage école (personnel, années, salles,
//    référentiels, offre de formation en lecture). RBAC réel = gardes serveur.
const NAV_DIRECTION: NavGroup[] = [
  {
    group: 'PRINCIPAL',
    items: [
      { id: 'dashboard', label: 'Tableau de bord', href: '/tableau-de-bord', icon: HomeIcon },
      { id: 'planning', label: 'Planning', href: '/', icon: CalendarIcon },
      { id: 'suivi', label: 'Suivi des modules', href: '/suivi-modules', icon: CheckSquareIcon },
    ],
  },
  {
    group: 'MON ÉCOLE',
    items: [
      { id: 'personnel', label: 'Personnel', href: '/personnel', icon: UserIcon },
      { id: 'annees', label: 'Année académique', href: '/annees', icon: CalendarIcon },
      { id: 'rooms', label: 'Salles', href: '/salles', icon: DoorIcon },
    ],
  },
  {
    group: 'RÉFÉRENTIELS',
    items: [
      { id: 'teachers', label: 'Enseignants', href: '/enseignants', icon: UserCogIcon },
      { id: 'students', label: 'Étudiants', href: '/etudiants', icon: UsersIcon },
      { id: 'classes', label: 'Classes', href: '/classes', icon: LayersIcon },
    ],
  },
  {
    group: 'OFFRE DE FORMATION',
    items: [
      { id: 'filieres', label: 'Filières', href: '/filieres', icon: GraduationCapIcon },
      { id: 'formations', label: 'Formations', href: '/formations', icon: BookStackIcon },
      { id: 'maquettes', label: 'Maquettes', href: '/maquettes', icon: BookOpenIcon },
    ],
  },
];

// ── Menu Admin système (V05 LOT 1.6 / V5-D9) — espace cross-école. URLs propres
//    /ecoles · /utilisateurs · /journal (aucun segment d'acteur dans l'URL).
const NAV_ADMIN: NavGroup[] = [
  {
    group: 'SYSTÈME',
    items: [
      { id: 'ecoles', label: 'Écoles', href: '/ecoles', icon: GraduationCapIcon },
      { id: 'utilisateurs', label: 'Utilisateurs', href: '/utilisateurs', icon: UsersIcon },
      { id: 'journal', label: "Journal d'audit", href: '/journal', icon: BarChartIcon },
    ],
  },
];

function navForRole(role: UserRole | null): NavGroup[] {
  // `navForRole` = point d'évolution unique du menu par rôle (LOT 6). RP/AC +
  // Admin (V05 LOT 1) + Direction (V05 LOT 3) ont leur menu dédié ; les rôles
  // consult ont leur propre layout `(consult)`. Le RBAC réel (route groups +
  // guards serveur) reste l'autorité.
  if (role === 'ASSISTANT_PROGRAMME') return NAV_AC;
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') return NAV_ADMIN;
  if (role === 'DIRECTION') return NAV_DIRECTION;
  return NAV_RP;
}

function computeInitials(fullName: string): string {
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

// Sidebar drag-resize constants (calqué sur PLANIT-IA/rp/components/shell.jsx).
const SB_MIN = 56;
const SB_MAX = 320;
const SB_DEF = 248;
const SB_COLLAPSE_THRESHOLD = 100;

export function Sidebar({ activeId = 'planning' }: { activeId?: string | undefined }) {
  // Vitest / premier paint : usePathname() peut être null hors Next router.
  const pathname = usePathname() ?? '';
  const { state } = useAuth();
  const role = state.status === 'authenticated' ? state.user.role : null;
  const NAV = navForRole(role);
  const [width, setWidth] = useState<number>(SB_DEF);
  const draggingRef = useRef(false);
  const collapsed = width < SB_COLLAPSE_THRESHOLD;

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    PRINCIPAL: true,
    'OFFRE DE FORMATION': true,
    'MES CLASSES': true,
    'MON ÉCOLE': true,
    RÉFÉRENTIELS: true,
    CONSULTATION: true,
    SYSTÈME: true,
  });
  const toggleGroup = (group: string) =>
    setOpenGroups((prev) => ({ ...prev, [group]: !prev[group] }));

  useEffect(() => {
    function handleMouseMove(ev: MouseEvent) {
      if (!draggingRef.current) return;
      const next = Math.max(SB_MIN, Math.min(SB_MAX, ev.clientX));
      setWidth(next);
    }
    function handleMouseUp() {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Calcule le « meilleur match » par href le plus long parmi les items
  // routés. `pathname.startsWith('/rp')` matche aussi `/rp/ue-modules`
  // → on prend le plus spécifique pour éviter que Planning reste actif
  // quand on est sur une sous-page (Filières, UE & Modules, etc.).
  // Critère : pathname === href OU pathname commence par `href + '/'`.
  const bestMatchHref = NAV.flatMap((g) => g.items)
    .filter((i) => i.href !== '#')
    .map((i) => i.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .reduce<string>((best, href) => (href.length > best.length ? href : best), '');

  const isActive = (item: NavItem): boolean => {
    if (item.href !== '#') return item.href === bestMatchHref;
    // Items placeholder (href='#') : fallback sur l'activeId fourni par la page.
    return item.id === activeId;
  };

  const transition = draggingRef.current ? 'none' : 'width .22s ease';

  return (
    <>
      <aside
        style={{ width, transition }}
        className="sticky top-0 flex h-screen flex-shrink-0 flex-col overflow-hidden border-r border-sb-dark-2 bg-sb-dark text-sb-dark-text"
      >
        {/* Drag handle (right edge) */}
        <DragHandle
          onMouseDown={(ev) => {
            ev.preventDefault();
            draggingRef.current = true;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
          }}
        />

        {/* Logo */}
        <div
          className={cn(
            'flex min-h-[72px] items-center gap-3 border-b border-sb-dark-2',
            collapsed ? 'justify-center px-0 py-4' : 'px-4 py-5',
          )}
          style={{ transition: 'padding .22s ease' }}
        >
          <div className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-sb-dark-2">
            <div className="bg-brand-gradient flex h-8 w-8 items-center justify-center rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/logo-mono.svg" alt="" width={274} height={253} className="size-6" />
            </div>
          </div>
          {!collapsed ? (
            <div className="min-w-0 flex-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/logo-wordmark-white.svg" alt="PLANIT" className="h-[18px] w-auto" />
              <div className="mt-1 truncate text-[10.5px] font-medium tracking-wider text-sb-dark-muted">
                ÉCOLE D&apos;INGÉNIEURS · ISM
              </div>
            </div>
          ) : null}
        </div>

        {/* Navigation */}
        <nav
          className={cn(
            'scrollbar-hide flex-1 overflow-y-auto overflow-x-hidden',
            collapsed ? 'px-1.5 py-2' : 'px-2.5 py-2.5',
          )}
          style={{ transition: 'padding .22s ease' }}
        >
          {NAV.map((group, gi) => {
            const isOpen = !!openGroups[group.group];
            return collapsed ? (
              <CollapsedNavGroup
                key={group.group}
                group={group}
                isFirst={gi === 0}
                isActive={isActive}
              />
            ) : (
              <div key={group.group} className="mb-1">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.group)}
                  className="flex w-full items-center justify-between px-2 pb-1.5 pt-3.5 text-[10px] font-bold tracking-wider text-sb-dark-muted"
                >
                  <span>{group.group}</span>
                  <span
                    style={{
                      display: 'flex',
                      transition: 'transform .2s ease',
                      transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                    }}
                  >
                    <ChevronDownIcon size={10} color="currentColor" />
                  </span>
                </button>
                {isOpen ? (
                  <ul className="space-y-0.5">
                    {group.items.map((item) => (
                      <NavLinkItem key={item.id} item={item} active={isActive(item)} />
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </nav>

        {/* User block */}
        <div className="border-t border-sb-dark-2">
          <div
            className={cn(
              'flex items-center gap-2.5',
              collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5',
            )}
          >
            <div className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-full bg-sb-dark-2 text-[12px] font-bold text-primary-100">
              {state.status === 'authenticated' ? computeInitials(state.user.fullName) : '…'}
            </div>
            {!collapsed ? (
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold text-white">
                  {state.status === 'authenticated' ? state.user.fullName : '—'}
                </div>
                <div className="truncate text-[11px] text-sb-dark-muted">
                  {state.status === 'authenticated' ? roleLabel(state.user.role) : ''}
                </div>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            title="Paramètres"
            className={cn(
              'flex w-full items-center gap-2.5 border-t border-sb-dark-2 text-[13px] font-medium text-sb-dark-muted hover:bg-sb-dark-2 hover:text-white',
              collapsed ? 'justify-center px-0 py-2' : 'px-3 py-2',
            )}
          >
            <SettingsIcon size={15} color="currentColor" />
            {!collapsed ? <span>Paramètres</span> : null}
          </button>
        </div>
      </aside>

      {/* Floating toggle */}
      <FloatingToggle
        leftPx={width - 13}
        collapsed={collapsed}
        onClick={() => setWidth((w) => (w < SB_COLLAPSE_THRESHOLD ? SB_DEF : SB_MIN))}
        draggingTransition={transition}
      />
    </>
  );
}

function DragHandle({ onMouseDown }: { onMouseDown: (ev: React.MouseEvent) => void }) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Redimensionner la sidebar"
      onMouseDown={onMouseDown}
      onMouseEnter={(ev) => {
        ev.currentTarget.style.background = 'rgba(232, 98, 10, 0.4)';
      }}
      onMouseLeave={(ev) => {
        ev.currentTarget.style.background = 'transparent';
      }}
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: 4,
        cursor: 'col-resize',
        zIndex: 10,
        background: 'transparent',
      }}
    />
  );
}

function FloatingToggle({
  leftPx,
  collapsed,
  onClick,
  draggingTransition,
}: {
  leftPx: number;
  collapsed: boolean;
  onClick: () => void;
  draggingTransition: string;
}) {
  const style: CSSProperties = {
    position: 'fixed',
    left: leftPx,
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 200,
    width: 26,
    height: 48,
    borderRadius: 999,
    background: 'var(--color-sb-dark)',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--color-sb-dark-text)',
    transition: `${draggingTransition}, color .15s, background .15s`,
    padding: 0,
  };

  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? 'Ouvrir le panneau' : 'Réduire le panneau'}
      aria-label={collapsed ? 'Ouvrir le panneau' : 'Réduire le panneau'}
      style={style}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          display: 'block',
          transition: 'transform .22s ease',
          transform: collapsed ? 'rotate(180deg)' : 'none',
        }}
      >
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>
  );
}

function NavLinkItem({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors',
          active ? 'bg-accent/15 text-white' : 'text-sb-dark-text hover:bg-sb-dark-2',
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
}

function CollapsedNavGroup({
  group,
  isFirst,
  isActive,
}: {
  group: NavGroup;
  isFirst: boolean;
  isActive: (item: NavItem) => boolean;
}) {
  return (
    <>
      {!isFirst ? <div className="my-1.5 h-px bg-sb-dark-2" /> : null}
      <ul className="space-y-0.5">
        {group.items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                title={item.label}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex items-center justify-center rounded-lg py-2.5 transition-colors',
                  active ? 'bg-accent/15 text-white' : 'text-sb-dark-text hover:bg-sb-dark-2',
                )}
              >
                <Icon size={18} color="currentColor" />
                {item.badge && item.badge > 0 ? (
                  <span
                    aria-hidden
                    className={cn(
                      'absolute right-1.5 top-1.5 size-2 rounded-full border-[1.5px] border-sb-dark',
                      item.badgeTone === 'err' ? 'bg-err' : 'bg-accent',
                    )}
                  />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
