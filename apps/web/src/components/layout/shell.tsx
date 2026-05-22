import type { ReactNode } from 'react';
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
  children,
}: ShellProps) {
  return (
    <div className="flex min-h-screen bg-bg">
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
        <main className="flex-1 overflow-auto px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
