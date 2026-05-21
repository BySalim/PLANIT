import type { ReactNode } from 'react';
import { Topbar } from '@/components/layout/topbar';

// Next.js App Router requires default export for layout
// eslint-disable-next-line no-restricted-syntax
export default function PlanitLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg">
      <Topbar />
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
